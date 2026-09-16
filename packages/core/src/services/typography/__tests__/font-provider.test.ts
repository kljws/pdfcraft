import { describe, expect, it, vi } from "vitest";
import { VirtualFileSystem } from "../../../resources/virtual-file-system";
import FontProvider, { type FontEmbeddingHost } from "../font-provider";
import type { EmbeddedFont } from "../font.types";

const createHost = () => {
	const embeddedFont = { id: "embedded-font" } as unknown as EmbeddedFont;
	const host: FontEmbeddingHost = {
		_font: embeddedFont,
		font: vi.fn(),
		validateLocalFile: vi.fn(),
	};
	return { embeddedFont, host };
};

describe("FontProvider", () => {
	it("resolves each style and preserves missing-font errors", () => {
		const { host } = createHost();
		const provider = new FontProvider(host, {
			Roboto: {
				normal: "regular.ttf",
				bold: "bold.ttf",
				italics: "italic.ttf",
				bolditalics: "bold-italic.ttf",
			},
		});

		expect(provider.getFontFile("Roboto", false, false)).toBe("regular.ttf");
		expect(provider.getFontFile("Roboto", true, false)).toBe("bold.ttf");
		expect(provider.getFontFile("Roboto", false, true)).toBe("italic.ttf");
		expect(provider.getFontFile("Roboto", true, true)).toBe("bold-italic.ttf");
		expect(() => provider.provideFont("Arial", true, false)).toThrow(
			"Font 'Arial' in style 'bold' is not defined in the font section of the document definition.",
		);
	});

	it("embeds and validates a font only once", () => {
		const { embeddedFont, host } = createHost();
		const provider = new FontProvider(host, { Roboto: { normal: "regular.ttf" } });

		expect(provider.provideFont("Roboto", false, false)).toBe(embeddedFont);
		expect(provider.provideFont("Roboto", false, false)).toBe(embeddedFont);
		expect(host.validateLocalFile).toHaveBeenCalledOnce();
		expect(host.validateLocalFile).toHaveBeenCalledWith("regular.ttf");
		expect(host.font).toHaveBeenCalledOnce();
		expect(host.font).toHaveBeenCalledWith("regular.ttf");
	});

	it("loads virtual files and forwards collection font names", () => {
		const virtualfs = new VirtualFileSystem();
		virtualfs.writeFileSync("collection.ttc", new Uint8Array([1, 2, 3]));
		const { host } = createHost();
		const provider = new FontProvider(
			host,
			{ Collection: { normal: ["collection.ttc", "My Font"] } },
			virtualfs,
		);

		provider.provideFont("Collection", false, false);

		expect(host.validateLocalFile).not.toHaveBeenCalled();
		expect(host.font).toHaveBeenCalledWith(expect.any(ArrayBuffer), "My Font");
	});
});
