import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pdfcraft from "pdfcraft";
import {
	createSampleSource,
	parseDocumentDefinition,
	resolveDocumentResources,
	sampleNames,
} from "../shared/editor.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(directory, "public");
const sampleDirectory = path.resolve(directory, "../shared/samples");
const fontDirectory = path.resolve(directory, "../../fonts/Roboto");
const exampleImageDirectory = path.resolve(directory, "../../examples/images");
const port = Number(process.env.PORT) || 1234;
const requestLimit = 2 * 1024 * 1024;

pdfcraft.addFonts({
	Roboto: {
		normal: path.join(fontDirectory, "Roboto-Regular.ttf"),
		bold: path.join(fontDirectory, "Roboto-Medium.ttf"),
		italics: path.join(fontDirectory, "Roboto-Italic.ttf"),
		bolditalics: path.join(fontDirectory, "Roboto-MediumItalic.ttf"),
	},
});

const resolveLocalPath = (filename) =>
	path.isAbsolute(filename) ? path.resolve(filename) : path.resolve(sampleDirectory, filename);

const isWithin = (root, filename) => filename === root || filename.startsWith(`${root}${path.sep}`);

pdfcraft.setLocalAccessPolicy((filename) => {
	const resolved = resolveLocalPath(filename);
	return (
		isWithin(fontDirectory, resolved) ||
		isWithin(sampleDirectory, resolved) ||
		isWithin(exampleImageDirectory, resolved)
	);
});

pdfcraft.setUrlAccessPolicy((resource) => {
	const url = new URL(resource);
	return url.protocol === "https:" && url.hostname === "raw.githubusercontent.com";
});

const resourcePaths = new Map([
	["examples/images/sampleImage.jpg", path.join(exampleImageDirectory, "sampleImage.jpg")],
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

const sendSamples = async (pathname, response) => {
	if (pathname === "/samples") {
		response.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		});
		response.end(JSON.stringify(sampleNames));
		return;
	}

	const sample = pathname.slice("/samples/".length);
	if (!sampleNames.includes(sample)) {
		response.writeHead(404).end("Sample not found");
		return;
	}

	const content = await fs.promises.readFile(path.join(sampleDirectory, `${sample}.json5`), "utf8");
	response.writeHead(200, {
		"Content-Type": "text/javascript; charset=utf-8",
		"Cache-Control": "no-store",
	});
	response.end(createSampleSource(content));
};

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
		if (url.pathname === "/samples" || url.pathname.startsWith("/samples/")) {
			await sendSamples(url.pathname, response);
			return;
		}

		sendStaticFile(url.pathname, response);
	} catch (error) {
		console.error(error);
		response
			.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
			.end(error instanceof Error ? error.message : "PDF generation failed");
	}
});

server.listen(port, () => {
	console.log(`Server playground: http://localhost:${port}`);
});
