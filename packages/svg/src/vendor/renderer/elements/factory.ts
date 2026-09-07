// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installElementFactory = (runtime) => {
    function createSVGElement(obj, inherits) {
      switch (obj.nodeName) {
        case 'use': return new runtime.SvgElemUse(obj, inherits);
        case 'symbol': return new runtime.SvgElemSymbol(obj, inherits);
        case 'g': return new runtime.SvgElemGroup(obj, inherits);
        case 'a': return new runtime.SvgElemLink(obj, inherits);
        case 'svg': return new runtime.SvgElemSvg(obj, inherits);
        case 'image': return new runtime.SVGElemImage(obj, inherits);
        case 'rect': return new runtime.SvgElemRect(obj, inherits);
        case 'circle': return new runtime.SvgElemCircle(obj, inherits);
        case 'ellipse': return new runtime.SvgElemEllipse(obj, inherits);
        case 'line': return new runtime.SvgElemLine(obj, inherits);
        case 'polyline': return new runtime.SvgElemPolyline(obj, inherits);
        case 'polygon': return new runtime.SvgElemPolygon(obj, inherits);
        case 'path': return new runtime.SvgElemPath(obj, inherits);
        case 'text': return new runtime.SvgElemText(obj, inherits);
        case 'tspan': return new runtime.SvgElemTspan(obj, inherits);
        case 'textPath': return new runtime.SvgElemTextPath(obj, inherits);
        case '#text': case '#cdata-section': return new runtime.SvgElemTextNode(obj, inherits);
        default: return new runtime.SvgElem(obj, inherits);
      }
    }


    return { createSVGElement };
};
