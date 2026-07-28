import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pdfcraft from "pdfcraft";
import {
	createSampleSource,
	parseDocumentDefinition,
	resolveDocumentResources,
} from "../shared/editor.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(directory, "public");
const sampleDirectory = path.resolve(directory, "../shared/samples");
const robotoFontDirectory = path.resolve(directory, "../../fonts/Roboto");
const figtreeFontDirectory = path.resolve(directory, "../../fonts/Figtree");
const exampleImageDirectory = path.resolve(directory, "../../examples/images");
const playgroundLogo = path.resolve(directory, "../logo.jpg");
const port = Number(process.env.PORT) || 1234;
const requestLimit = 2 * 1024 * 1024;
const sampleEventResponses = new Set();
const sampleChangeTimers = new Map();

pdfcraft.addFonts({
	Roboto: {
		normal: path.join(robotoFontDirectory, "Roboto-Regular.ttf"),
		bold: path.join(robotoFontDirectory, "Roboto-Medium.ttf"),
		italics: path.join(robotoFontDirectory, "Roboto-Italic.ttf"),
		bolditalics: path.join(robotoFontDirectory, "Roboto-MediumItalic.ttf"),
	},
	Figtree: {
		normal: path.join(figtreeFontDirectory, "Figtree-Regular.ttf"),
		bold: path.join(figtreeFontDirectory, "Figtree-SemiBold.ttf"),
		italics: path.join(figtreeFontDirectory, "Figtree-Italic.ttf"),
		bolditalics: path.join(figtreeFontDirectory, "Figtree-BoldItalic.ttf"),
	},
	FigtreeSemiBold: {
		normal: path.join(figtreeFontDirectory, "Figtree-SemiBold.ttf"),
		italics: path.join(figtreeFontDirectory, "Figtree-SemiBoldItalic.ttf"),
	},
});

const resolveLocalPath = (filename) =>
	path.isAbsolute(filename) ? path.resolve(filename) : path.resolve(sampleDirectory, filename);

const isWithin = (root, filename) => filename === root || filename.startsWith(`${root}${path.sep}`);

pdfcraft.setLocalAccessPolicy((filename) => {
	const resolved = resolveLocalPath(filename);
	return (
		isWithin(robotoFontDirectory, resolved) ||
		isWithin(figtreeFontDirectory, resolved) ||
		isWithin(sampleDirectory, resolved) ||
		isWithin(exampleImageDirectory, resolved) ||
		resolved === playgroundLogo
	);
});

pdfcraft.setUrlAccessPolicy((resource) => {
	const url = new URL(resource);
	return url.protocol === "https:" && url.hostname === "raw.githubusercontent.com";
});

const resourcePaths = new Map([
	["examples/images/sampleImage.jpg", path.join(exampleImageDirectory, "sampleImage.jpg")],
	["playground/logo.jpg", playgroundLogo],
]);

const resolveDocumentFilePaths = (documentDefinition) => {
	for (const file of Object.values(documentDefinition.files ?? {})) {
		if (
			typeof file.src === "string" &&
			!/^https?:\/\//i.test(file.src) &&
			!/^data:/i.test(file.src)
		) {
			file.src = resolveLocalPath(file.src);
		}
	}
	return documentDefinition;
};

const staticFiles = new Map([
	["/", [path.join(publicDirectory, "index.html"), "text/html; charset=utf-8"]],
	["/app.js", [path.join(publicDirectory, "app.js"), "text/javascript; charset=utf-8"]],
	["/styles.css", [path.join(publicDirectory, "styles.css"), "text/css; charset=utf-8"]],
	[
		"/pdfjs/pdf.mjs",
		[
			path.resolve(directory, "../../node_modules/pdfjs-dist/build/pdf.mjs"),
			"text/javascript; charset=utf-8",
		],
	],
	[
		"/pdfjs/pdf.worker.mjs",
		[
			path.resolve(directory, "../../node_modules/pdfjs-dist/build/pdf.worker.mjs"),
			"text/javascript; charset=utf-8",
		],
	],
	[
		"/pdfjs/pdf-annotation-layer.css",
		[path.resolve(directory, "../shared/pdf-annotation-layer.css"), "text/css; charset=utf-8"],
	],
]);

const readRequest = (request) =>
	new Promise((resolve, reject) => {
		let body = "";
		request.setEncoding("utf8");
		request.on("data", (chunk) => {
			body += chunk;
		});
		request.on("end", () => {
			if (Buffer.byteLength(body) > requestLimit) {
				reject(new Error("Document definition exceeds 2 MB"));
				return;
			}
			resolve(body);
		});
		request.on("error", reject);
	});

const sendPdf = async (request, response) => {
	const source = await readRequest(request);
	const startedAt = performance.now();
	const documentDefinition = resolveDocumentFilePaths(
		resolveDocumentResources(parseDocumentDefinition(source), resourcePaths),
	);
	const buffer = await pdfcraft.createPdf(documentDefinition).getBuffer();

	response.writeHead(200, {
		"Content-Type": "application/pdf",
		"Content-Disposition": 'inline; filename="document.pdf"',
		"Content-Length": buffer.byteLength,
		"Cache-Control": "no-store",
		"X-Generation-Time": (performance.now() - startedAt).toFixed(1),
	});
	response.end(buffer);
};

const listSampleNames = async () => {
	const entries = await fs.promises.readdir(sampleDirectory);
	return entries
		.filter((filename) => filename.endsWith(".js"))
		.map((filename) => path.basename(filename, ".js"))
		.sort((left, right) => left.localeCompare(right));
};

const sendSamples = async (pathname, response) => {
	if (pathname === "/samples") {
		response.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		});
		response.end(JSON.stringify(await listSampleNames()));
		return;
	}

	const sample = pathname.slice("/samples/".length);
	const samplePath = path.join(sampleDirectory, `${sample}.js`);
	if (path.basename(samplePath) !== `${sample}.js` || !fs.existsSync(samplePath)) {
		response.writeHead(404).end("Sample not found");
		return;
	}

	const content = await fs.promises.readFile(samplePath, "utf8");
	response.writeHead(200, {
		"Content-Type": "text/javascript; charset=utf-8",
		"Cache-Control": "no-store",
	});
	response.end(createSampleSource(content));
};

const sendSampleEvents = (response) => {
	response.writeHead(200, {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-store",
		Connection: "keep-alive",
	});
	response.write(": connected\n\n");
	sampleEventResponses.add(response);
	response.on("close", () => sampleEventResponses.delete(response));
};

fs.watch(sampleDirectory, { persistent: false }, (_eventType, filename) => {
	if (!filename?.endsWith(".js")) {
		return;
	}

	const sample = path.basename(filename, ".js");

	clearTimeout(sampleChangeTimers.get(sample));
	sampleChangeTimers.set(
		sample,
		setTimeout(() => {
			sampleChangeTimers.delete(sample);
			const message = `data: ${JSON.stringify({ sample })}\n\n`;
			for (const response of sampleEventResponses) {
				response.write(message);
			}
		}, 50),
	);
});

const sendStaticFile = (pathname, response) => {
	const file = staticFiles.get(pathname);
	if (!file) {
		response.writeHead(404).end("Not found");
		return;
	}

	const [filename, contentType] = file;
	response.writeHead(200, {
		"Content-Type": contentType,
		"Cache-Control": "no-store",
	});
	fs.createReadStream(filename).pipe(response);
};

const server = http.createServer(async (request, response) => {
	try {
		const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
		if (url.pathname === "/pdf" && request.method === "POST") {
			await sendPdf(request, response);
			return;
		}
		if (url.pathname === "/sample-events" && request.method === "GET") {
			sendSampleEvents(response);
			return;
		}
		if (url.pathname === "/samples" || url.pathname.startsWith("/samples/")) {
			await sendSamples(url.pathname, response);
			return;
		}

		sendStaticFile(url.pathname, response);
	} catch (error) {
		console.error("[PDFCraft server playground] Request failed:", error);
		response
			.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
			.end(error instanceof Error ? error.message : "PDF generation failed");
	}
});

server.listen(port, () => {
	console.log(`Server playground: http://localhost:${port}`);
});
