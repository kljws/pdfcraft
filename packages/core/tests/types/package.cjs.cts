import pdfcraft = require("@pdfcraft/core");

const instance = pdfcraft.createPdfCraft();
instance.createPdf({ content: ["CommonJS TypeScript consumer test"] });
