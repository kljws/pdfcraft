// @ts-nocheck Legacy SVG-to-PDFKit algorithm; public signature remains typed.
import { createSvgRenderContext } from "./renderer/context";
import type { SvgToPdfOptions } from "../types";

const svgToPdf = function(
	doc: object,
	svg: unknown,
	x?: number,
	y?: number,
	options?: SvgToPdfOptions,
): void {
    "use strict";

    const NamedColors = {aliceblue: [240,248,255], antiquewhite: [250,235,215], aqua: [0,255,255], aquamarine: [127,255,212], azure: [240,255,255], beige: [245,245,220], bisque: [255,228,196], black: [0,0,0], blanchedalmond: [255,235,205], blue: [0,0,255], blueviolet: [138,43,226], brown: [165,42,42], burlywood: [222,184,135], cadetblue: [95,158,160], chartreuse: [127,255,0],
      chocolate: [210,105,30], coral: [255,127,80], cornflowerblue: [100,149,237], cornsilk: [255,248,220], crimson: [220,20,60], cyan: [0,255,255], darkblue: [0,0,139], darkcyan: [0,139,139], darkgoldenrod: [184,134,11], darkgray: [169,169,169], darkgrey: [169,169,169], darkgreen: [0,100,0], darkkhaki: [189,183,107], darkmagenta: [139,0,139], darkolivegreen: [85,107,47],
      darkorange: [255,140,0], darkorchid: [153,50,204], darkred: [139,0,0], darksalmon: [233,150,122], darkseagreen: [143,188,143], darkslateblue: [72,61,139], darkslategray: [47,79,79], darkslategrey: [47,79,79], darkturquoise: [0,206,209], darkviolet: [148,0,211], deeppink: [255,20,147], deepskyblue: [0,191,255], dimgray: [105,105,105], dimgrey: [105,105,105],
      dodgerblue: [30,144,255], firebrick: [178,34,34], floralwhite: [255,250,240], forestgreen: [34,139,34], fuchsia: [255,0,255], gainsboro: [220,220,220], ghostwhite: [248,248,255], gold: [255,215,0], goldenrod: [218,165,32], gray: [128,128,128], grey: [128,128,128], green: [0,128,0], greenyellow: [173,255,47], honeydew: [240,255,240], hotpink: [255,105,180],
      indianred: [205,92,92], indigo: [75,0,130], ivory: [255,255,240], khaki: [240,230,140], lavender: [230,230,250], lavenderblush: [255,240,245], lawngreen: [124,252,0], lemonchiffon: [255,250,205], lightblue: [173,216,230], lightcoral: [240,128,128], lightcyan: [224,255,255], lightgoldenrodyellow: [250,250,210], lightgray: [211,211,211], lightgrey: [211,211,211],
      lightgreen: [144,238,144], lightpink: [255,182,193], lightsalmon: [255,160,122], lightseagreen: [32,178,170], lightskyblue: [135,206,250], lightslategray: [119,136,153], lightslategrey: [119,136,153], lightsteelblue: [176,196,222], lightyellow: [255,255,224], lime: [0,255,0], limegreen: [50,205,50], linen: [250,240,230], magenta: [255,0,255], maroon: [128,0,0],
      mediumaquamarine: [102,205,170], mediumblue: [0,0,205], mediumorchid: [186,85,211], mediumpurple: [147,112,219], mediumseagreen: [60,179,113], mediumslateblue: [123,104,238], mediumspringgreen: [0,250,154], mediumturquoise: [72,209,204], mediumvioletred: [199,21,133], midnightblue: [25,25,112], mintcream: [245,255,250], mistyrose: [255,228,225], moccasin: [255,228,181],
      navajowhite: [255,222,173], navy: [0,0,128], oldlace: [253,245,230], olive: [128,128,0], olivedrab: [107,142,35], orange: [255,165,0], orangered: [255,69,0], orchid: [218,112,214], palegoldenrod: [238,232,170], palegreen: [152,251,152], paleturquoise: [175,238,238], palevioletred: [219,112,147], papayawhip: [255,239,213], peachpuff: [255,218,185], peru: [205,133,63],
      pink: [255,192,203], plum: [221,160,221], powderblue: [176,224,230], purple: [128,0,128], rebeccapurple: [102,51,153], red: [255,0,0], rosybrown: [188,143,143], royalblue: [65,105,225], saddlebrown: [139,69,19], salmon: [250,128,114], sandybrown: [244,164,96], seagreen: [46,139,87], seashell: [255,245,238], sienna: [160,82,45], silver: [192,192,192], skyblue: [135,206,235],
      slateblue: [106,90,205], slategray: [112,128,144], slategrey: [112,128,144], snow: [255,250,250], springgreen: [0,255,127], steelblue: [70,130,180], tan: [210,180,140], teal: [0,128,128], thistle: [216,191,216], tomato: [255,99,71], turquoise: [64,224,208], violet: [238,130,238], wheat: [245,222,179], white: [255,255,255], whitesmoke: [245,245,245], yellow: [255,255,0]};
    const DefaultColors = {black: [NamedColors.black, 1], white: [NamedColors.white, 1], transparent: [NamedColors.black, 0]};
    const Entities = {quot: 34, amp: 38, lt: 60, gt: 62, apos: 39, OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, circ: 710, tilde: 732, ensp: 8194, emsp: 8195, thinsp: 8201, zwnj: 8204, zwj: 8205, lrm: 8206, rlm: 8207, ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222, dagger: 8224, Dagger: 8225, permil: 8240, lsaquo: 8249,
      rsaquo: 8250, euro: 8364, nbsp: 160, iexcl: 161, cent: 162, pound: 163, curren: 164, yen: 165, brvbar: 166, sect: 167, uml: 168, copy: 169, ordf: 170, laquo: 171, not: 172, shy: 173, reg: 174, macr: 175, deg: 176, plusmn: 177, sup2: 178, sup3: 179, acute: 180, micro: 181, para: 182, middot: 183, cedil: 184, sup1: 185, ordm: 186, raquo: 187, frac14: 188, frac12: 189, frac34: 190,
      iquest: 191, Agrave: 192, Aacute: 193, Acirc: 194, Atilde: 195, Auml: 196, Aring: 197, AElig: 198, Ccedil: 199, Egrave: 200, Eacute: 201, Ecirc: 202, Euml: 203, Igrave: 204, Iacute: 205, Icirc: 206, Iuml: 207, ETH: 208, Ntilde: 209, Ograve: 210, Oacute: 211, Ocirc: 212, Otilde: 213, Ouml: 214, times: 215, Oslash: 216, Ugrave: 217, Uacute: 218, Ucirc: 219, Uuml: 220, Yacute: 221,
      THORN: 222, szlig: 223, agrave: 224, aacute: 225, acirc: 226, atilde: 227, auml: 228, aring: 229, aelig: 230, ccedil: 231, egrave: 232, eacute: 233, ecirc: 234, euml: 235, igrave: 236, iacute: 237, icirc: 238, iuml: 239, eth: 240, ntilde: 241, ograve: 242, oacute: 243, ocirc: 244, otilde: 245, ouml: 246, divide: 247, oslash: 248, ugrave: 249, uacute: 250, ucirc: 251, uuml: 252,
      yacute: 253, thorn: 254, yuml: 255, fnof: 402, Alpha: 913, Beta: 914, Gamma: 915, Delta: 916, Epsilon: 917, Zeta: 918, Eta: 919, Theta: 920, Iota: 921, Kappa: 922, Lambda: 923, Mu: 924, Nu: 925, Xi: 926, Omicron: 927, Pi: 928, Rho: 929, Sigma: 931, Tau: 932, Upsilon: 933, Phi: 934, Chi: 935, Psi: 936, Omega: 937, alpha: 945, beta: 946, gamma: 947, delta: 948, epsilon: 949,
      zeta: 950, eta: 951, theta: 952, iota: 953, kappa: 954, lambda: 955, mu: 956, nu: 957, xi: 958, omicron: 959, pi: 960, rho: 961, sigmaf: 962, sigma: 963, tau: 964, upsilon: 965, phi: 966, chi: 967, psi: 968, omega: 969, thetasym: 977, upsih: 978, piv: 982, bull: 8226, hellip: 8230, prime: 8242, Prime: 8243, oline: 8254, frasl: 8260, weierp: 8472, image: 8465, real: 8476,
      trade: 8482, alefsym: 8501, larr: 8592, uarr: 8593, rarr: 8594, darr: 8595, harr: 8596, crarr: 8629, lArr: 8656, uArr: 8657, rArr: 8658, dArr: 8659, hArr: 8660, forall: 8704, part: 8706, exist: 8707, empty: 8709, nabla: 8711, isin: 8712, notin: 8713, ni: 8715, prod: 8719, sum: 8721, minus: 8722, lowast: 8727, radic: 8730, prop: 8733, infin: 8734, ang: 8736, and: 8743, or: 8744,
      cap: 8745, cup: 8746, int: 8747, there4: 8756, sim: 8764, cong: 8773, asymp: 8776, ne: 8800, equiv: 8801, le: 8804, ge: 8805, sub: 8834, sup: 8835, nsub: 8836, sube: 8838, supe: 8839, oplus: 8853, otimes: 8855, perp: 8869, sdot: 8901, lceil: 8968, rceil: 8969, lfloor: 8970, rfloor: 8971, lang: 9001, rang: 9002, loz: 9674, spades: 9824, clubs: 9827, hearts: 9829, diams: 9830};
    const PathArguments = {A: 7, a: 7, C: 6, c: 6, H: 1, h: 1, L: 2, l: 2, M: 2, m: 2, Q: 4, q: 4, S: 4, s: 4, T: 2, t: 2, V: 1, v: 1, Z: 0, z: 0};
    const PathFlags = {A3: true, A4: true, a3: true, a4: true};
    const Properties = {
      'color':              {inherit: true, initial: undefined},
      'visibility':         {inherit: true, initial: 'visible', values: {'hidden': 'hidden', 'collapse': 'hidden', 'visible':'visible'}},
      'fill':               {inherit: true, initial: DefaultColors.black},
      'stroke':             {inherit: true, initial: 'none'},
      'stop-color':         {inherit: false, initial: DefaultColors.black},
      'fill-opacity':       {inherit: true, initial: 1},
      'stroke-opacity':     {inherit: true, initial: 1},
      'stop-opacity':       {inherit: false, initial: 1},
      'fill-rule':          {inherit: true, initial: 'nonzero', values: {'nonzero':'nonzero', 'evenodd':'evenodd'}},
      'clip-rule':          {inherit: true, initial: 'nonzero', values: {'nonzero':'nonzero', 'evenodd':'evenodd'}},
      'stroke-width':       {inherit: true, initial: 1},
      'stroke-dasharray':   {inherit: true, initial: []},
      'stroke-dashoffset':  {inherit: true, initial: 0},
      'stroke-miterlimit':  {inherit: true, initial: 4},
      'stroke-linejoin':    {inherit: true, initial: 'miter', values: {'miter':'miter', 'round':'round', 'bevel':'bevel'}},
      'stroke-linecap':     {inherit: true, initial: 'butt', values: {'butt':'butt', 'round':'round', 'square':'square'}},
      'font-size':          {inherit: true, initial: 16, values: {'xx-small':9, 'x-small':10, 'small':13, 'medium':16, 'large':18, 'x-large':24, 'xx-large':32}},
      'font-family':        {inherit: true, initial: 'sans-serif'},
      'font-weight':        {inherit: true, initial: 'normal', values: {'600':'bold', '700':'bold', '800':'bold', '900':'bold', 'bold':'bold', 'bolder':'bold', '500':'normal', '400':'normal', '300':'normal', '200':'normal', '100':'normal', 'normal':'normal', 'lighter':'normal'}},
      'font-style':         {inherit: true, initial: 'normal', values: {'italic':'italic', 'oblique':'italic', 'normal':'normal'}},
      'text-anchor':        {inherit: true, initial: 'start', values: {'start':'start', 'middle':'middle', 'end':'end'}},
      'direction':          {inherit: true, initial: 'ltr', values: {'ltr':'ltr', 'rtl':'rtl'}},
      'dominant-baseline':  {inherit: true, initial: 'baseline', values: {'auto':'baseline', 'baseline':'baseline', 'before-edge':'before-edge', 'text-before-edge':'before-edge', 'middle':'middle', 'central':'central', 'after-edge':'after-edge', 'text-after-edge':'after-edge', 'ideographic':'ideographic', 'alphabetic':'alphabetic', 'hanging':'hanging', 'mathematical':'mathematical'}},
      'alignment-baseline': {inherit: false, initial: undefined, values: {'auto':'baseline', 'baseline':'baseline', 'before-edge':'before-edge', 'text-before-edge':'before-edge', 'middle':'middle', 'central':'central', 'after-edge':'after-edge', 'text-after-edge':'after-edge', 'ideographic':'ideographic', 'alphabetic':'alphabetic', 'hanging':'hanging', 'mathematical':'mathematical'}},
      'baseline-shift':     {inherit: true, initial: 'baseline', values: {'baseline':'baseline', 'sub':'sub', 'super':'super'}},
      'word-spacing':       {inherit: true, initial: 0, values: {normal:0}},
      'letter-spacing':     {inherit: true, initial: 0, values: {normal:0}},
      'text-decoration':    {inherit: false, initial: 'none', values: {'none':'none', 'underline':'underline', 'overline':'overline', 'line-through':'line-through'}},
      'xml:space':          {inherit: true, initial: 'default', css: 'white-space', values: {'preserve':'preserve', 'default':'default', 'pre':'preserve', 'pre-line':'preserve', 'pre-wrap':'preserve', 'nowrap': 'default'}},
      'marker-start':       {inherit: true, initial: 'none'},
      'marker-mid':         {inherit: true, initial: 'none'},
      'marker-end':         {inherit: true, initial: 'none'},
      'opacity':            {inherit: false, initial: 1},
      'transform':          {inherit: false, initial: [1, 0, 0, 1, 0, 0]},
      'display':            {inherit: false, initial: 'inline', values: {'none':'none', 'inline':'inline', 'block':'inline'}},
      'clip-path':          {inherit: false, initial: 'none'},
      'mask':               {inherit: false, initial: 'none'},
      'overflow':           {inherit: false, initial: 'hidden', values: {'hidden':'hidden', 'scroll':'hidden', 'visible':'visible'}}
    };

    options = options || {};
    var pxToPt = options.assumePt ? 1 : (72/96), // 1px = 72/96pt, but only if assumePt is false
        viewportWidth = (options.width || doc.page.width) / pxToPt,
        viewportHeight = (options.height || doc.page.height) / pxToPt,
        preserveAspectRatio = options.preserveAspectRatio || null, // default to null so that the attr can override if not passed
        useCSS = options.useCSS && typeof SVGElement !== 'undefined' && svg instanceof SVGElement && typeof getComputedStyle === 'function',
        warningCallback = options.warningCallback,
        fontCallback = options.fontCallback,
        imageCallback = options.imageCallback,
        colorCallback = options.colorCallback,
        documentCallback = options.documentCallback,
        precision = Math.ceil(Math.max(1, options.precision)) || 3,
        groupStack = [],
        documentCache = {},
        links = [],
        styleRules = [];

    if (typeof warningCallback !== 'function') {
      warningCallback = function(str) {
        if (typeof console !== undefined && typeof console.warn === 'function') {console.warn(str);}
      };
    }
    if (typeof fontCallback !== 'function') {
      fontCallback = function(family, bold, italic, fontOptions) {
        // Check if the font is already registered in the document
        if (bold && italic) {
          if (doc._registeredFonts.hasOwnProperty(family + '-BoldItalic')) {
            return family + '-BoldItalic';
          } else if (doc._registeredFonts.hasOwnProperty(family + '-Italic')) {
            fontOptions.fauxBold = true;
            return family + '-Italic';
          } else if (doc._registeredFonts.hasOwnProperty(family + '-Bold')) {
            fontOptions.fauxItalic = true;
            return family + '-Bold';
          } else if (doc._registeredFonts.hasOwnProperty(family)) {
            fontOptions.fauxBold = true;
            fontOptions.fauxItalic = true;
            return family;
          }
        }
        if (bold && !italic) {
          if (doc._registeredFonts.hasOwnProperty(family + '-Bold')) {
            return family + '-Bold';
          } else if (doc._registeredFonts.hasOwnProperty(family)) {
            fontOptions.fauxBold = true;
            return family;
          }
        }
        if (!bold && italic) {
          if (doc._registeredFonts.hasOwnProperty(family + '-Italic')) {
            return family + '-Italic';
          } else if (doc._registeredFonts.hasOwnProperty(family)) {
            fontOptions.fauxItalic = true;
            return family;
          }
        }
        if (!bold && !italic) {
          if (doc._registeredFonts.hasOwnProperty(family)) {
            return family;
          }
        }
        // Use standard fonts as fallback
        if (family.match(/(?:^|,)\s*serif\s*$/)) {
          if (bold && italic) {return 'Times-BoldItalic';}
          if (bold && !italic) {return 'Times-Bold';}
          if (!bold && italic) {return 'Times-Italic';}
          if (!bold && !italic) {return 'Times-Roman';}
        } else if (family.match(/(?:^|,)\s*monospace\s*$/)) {
          if (bold && italic) {return 'Courier-BoldOblique';}
          if (bold && !italic) {return 'Courier-Bold';}
          if (!bold && italic) {return 'Courier-Oblique';}
          if (!bold && !italic) {return 'Courier';}
        } else if (family.match(/(?:^|,)\s*sans-serif\s*$/) || true) {
          if (bold && italic) {return 'Helvetica-BoldOblique';}
          if (bold && !italic) {return 'Helvetica-Bold';}
          if (!bold && italic) {return 'Helvetica-Oblique';}
          if (!bold && !italic) {return 'Helvetica';}
        }
      };
    }
    if (typeof imageCallback !== 'function') {
      imageCallback = function(link) {
        return link.replace(/\s+/g, '');
      };
    }
    if (typeof colorCallback !== 'function') {
      colorCallback = null;
    } else {
      for (let color in DefaultColors) {
        let newColor = colorCallback(DefaultColors[color]);
        DefaultColors[color][0] = newColor[0];
        DefaultColors[color][1] = newColor[1];
      }
    }
    if (typeof documentCallback !== 'function') {
      documentCallback = null;
    }

    const runtime = createSvgRenderContext({
      doc, svg, x, y, options, NamedColors, DefaultColors, Entities, PathArguments, PathFlags, Properties,
      pxToPt, viewportWidth, viewportHeight, preserveAspectRatio, useCSS, warningCallback, fontCallback,
      imageCallback, colorCallback, documentCallback, precision, groupStack, documentCache, links, styleRules
    });

    if (typeof svg === 'string') {
      svg = runtime.parseXml(svg);
      runtime.svg = svg;
    }
    if (svg) {
      let styles = svg.getElementsByTagName('style');
      for (let i = 0; i < styles.length; i++) {
        runtime.styleRules = runtime.styleRules.concat(runtime.parseStyleSheet(styles[i].textContent));
      }
      let elem = runtime.createSVGElement(svg, null);
      if (typeof elem.drawInDocument === 'function') {
        if (options.useCSS && !useCSS) {
          warningCallback('SVGtoPDF: useCSS option can only be used for SVG *elements* in compatible browsers');
        }
        let savedFillColor = doc._fillColor;
        doc.save().translate(x || 0, y || 0).scale(pxToPt);
        elem.drawInDocument();
        for (let i = 0; i < links.length; i++) {
          doc.page.annotations.push(links[i]);
        }
        doc.restore();
        doc._fillColor = savedFillColor;
      } else {
        warningCallback('SVGtoPDF: this element can\'t be rendered directly: ' + svg.nodeName);
      }
    } else {
      warningCallback('SVGtoPDF: the input does not look like a valid SVG');
    }
};

export default svgToPdf;
