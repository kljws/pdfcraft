// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installTextMetrics = (runtime) => {
    function combineArrays(array1, array2) {
      return array1.concat(array2.slice(array1.length));
    }
    function getAscent(font, size) {
      return Math.max(font.ascender, (font.bbox[3] || font.bbox.maxY) * (font.scale || 1)) * size / 1000;
    }
    function getDescent(font, size) {
      return Math.min(font.descender, (font.bbox[1] || font.bbox.minY) * (font.scale || 1)) * size / 1000;
    }
    function getXHeight(font, size) {
      return (font.xHeight || 0.5 * (font.ascender - font.descender)) * size / 1000;
    }
    function getBaseline(font, size, baseline, shift) {
      let dy1, dy2;
      switch (baseline) {
        case 'middle': dy1 = 0.5 * getXHeight(font, size); break;
        case 'central': dy1 = 0.5 * (getDescent(font, size) + getAscent(font, size)); break;
        case 'after-edge': case 'text-after-edge': dy1 = getDescent(font, size); break;
        case 'alphabetic': case 'auto': case 'baseline': dy1 = 0; break;
        case 'mathematical': dy1 = 0.5 * getAscent(font, size); break;
        case 'hanging': dy1 = 0.8 * getAscent(font, size); break;
        case 'before-edge': case 'text-before-edge': dy1 = getAscent(font, size); break;
        default: dy1 = 0; break;
      }
      switch (shift) {
        case 'baseline': dy2 = 0; break;
        case 'super': dy2 = 0.6 * size; break;
        case 'sub': dy2 = -0.6 * size; break;
        default: dy2 = shift; break;
      }
      return dy1 - dy2;
    }
    function getTextPos(font, size, text) {
      let encoded = font.encode('' + text), hex = encoded[0], pos = encoded[1], data = [];
      for (let i = 0; i < hex.length; i++) {
        let unicode = font.unicode ? font.unicode[parseInt(hex[i], 16)] : [text.charCodeAt(i)];
        data.push({
          glyph: hex[i],
          unicode: unicode,
          width: pos[i].advanceWidth * size / 1000,
          xOffset: pos[i].xOffset * size / 1000,
          yOffset: pos[i].yOffset * size / 1000,
          xAdvance: pos[i].xAdvance * size / 1000,
          yAdvance: pos[i].yAdvance * size / 1000
        });
      }
      return data;
    }

    return { combineArrays, getAscent, getDescent, getXHeight, getBaseline, getTextPos };
};
