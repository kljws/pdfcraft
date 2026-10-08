import type { OutputDocumentServer as OutputDocumentServerContract } from "../types";
import OutputDocument from "./output-document";
import fs from "node:fs";
import { Buffer } from "node:buffer";

/** Implements the public structural type of the same name, so the two cannot drift apart. */
class OutputDocumentServer extends OutputDocument implements OutputDocumentServerContract {
	async getBuffer(): Promise<Buffer> {
		return Buffer.from(await this.getData());
	}

	async getBase64(): Promise<string> {
		return (await this.getBuffer()).toString("base64");
	}

	async getDataUrl(): Promise<string> {
		return `data:application/pdf;base64,${await this.getBase64()}`;
	}

	async write(filename: string): Promise<void> {
		await fs.promises.writeFile(filename, await this.getData());
	}
}

export default OutputDocumentServer;
