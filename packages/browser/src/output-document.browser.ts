import { OutputDocument } from "@pdfcraft/core/adapter";

const openWindow = (): Window => {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	const win = window.open("", "_blank");
	if (win === null) {
		throw new Error("Open PDF in new window blocked by browser");
	}

	return win;
};

class OutputDocumentBrowser extends OutputDocument {
	getBuffer(): Promise<Uint8Array> {
		return this.getData();
	}

	async getBase64(): Promise<string> {
		const data = await this.getData();
		const chunks: string[] = [];
		const chunkSize = 0x8000;
		for (let offset = 0; offset < data.length; offset += chunkSize) {
			chunks.push(String.fromCharCode(...data.subarray(offset, offset + chunkSize)));
		}
		return btoa(chunks.join(""));
	}

	async getDataUrl(): Promise<string> {
		return `data:application/pdf;base64,${await this.getBase64()}`;
	}

	async getBlob(): Promise<Blob> {
		const buffer = await this.getBuffer();
		const blobData = new Uint8Array(buffer.byteLength);
		blobData.set(buffer);
		return new Blob([blobData.buffer], { type: "application/pdf" });
	}

	async download(filename: string = "file.pdf"): Promise<void> {
		const blob = await this.getBlob();
		const urlCreator = window.URL || window.webkitURL;
		const pdfUrl = urlCreator.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = pdfUrl;
		link.download = filename;
		link.click();
		setTimeout(() => urlCreator.revokeObjectURL(pdfUrl), 0);
	}

	async open(win: Window | null = null): Promise<void> {
		if (!win) {
			win = openWindow();
		}
		const blob = await this.getBlob();
		try {
			const urlCreator = window.URL || window.webkitURL;
			const pdfUrl = urlCreator.createObjectURL(blob);
			win.location.href = pdfUrl;
			setTimeout(() => urlCreator.revokeObjectURL(pdfUrl), 60_000);
		} catch (error: unknown) {
			win.close();
			throw error;
		}
	}

	async print(win: Window | null = null): Promise<void> {
		const stream = await this.getStream();
		stream.setOpenActionAsPrint();
		await this.open(win);
	}
}

export default OutputDocumentBrowser;
