// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installBaseElements = (runtime) => {
    var SvgElem = function(obj, inherits) {
      let styleCache = Object.create(null);
      let childrenCache = null;
      this.name = obj.nodeName;
      this.isOuterElement = obj === runtime.svg || !obj.parentNode;
      this.inherits = inherits || (!this.isOuterElement ? runtime.createSVGElement(obj.parentNode, null) : null);
      this.stack = (this.inherits ? this.inherits.stack.concat(obj) : [obj]);
      this.style = runtime.parseStyleAttr(typeof obj.getAttribute === 'function' && obj.getAttribute('style'));
      this.css = runtime.useCSS ? getComputedStyle(obj) : runtime.getStyle(obj);
      this.allowedChildren = [];
      this.attr = function(key) {
        if (typeof obj.getAttribute === 'function') {
          return obj.getAttribute(key);
        }
      };
      this.resolveUrl = function(value) {
        let temp = (value || '').match(/^\s*(?:url\("(.*)#(.*)"\)|url\('(.*)#(.*)'\)|url\((.*)#(.*)\)|(.*)#(.*))\s*$/) || [];
        let file = temp[1] || temp[3] || temp[5] || temp[7],
            id = temp[2] || temp[4] || temp[6] || temp[8];
        if (id) {
          if (!file) {
            let svgObj = runtime.svg.getElementById(id);
            if (svgObj) {
              if (this.stack.indexOf(svgObj) === -1) {
                return svgObj;
              } else {
                runtime.warningCallback('SVGtoPDF: loop of circular references for id "' + id + '"');
                return;
              }
            }
          }
          if (runtime.documentCallback) {
            let svgs = runtime.documentCache[file];
            if (!svgs) {
              svgs = runtime.documentCallback(file);
              if (!runtime.isArrayLike(svgs)) {svgs = [svgs];}
              for (let i = 0; i < svgs.length; i++) {
                if (typeof svgs[i] === 'string') {svgs[i] = runtime.parseXml(svgs[i]);}
              }
              runtime.documentCache[file] = svgs;
            }
            for (let i = 0; i < svgs.length; i++) {
              let svgObj = svgs[i].getElementById(id);
              if (svgObj) {
                if (this.stack.indexOf(svgObj) === -1) {
                  return svgObj;
                } else {
                  runtime.warningCallback('SVGtoPDF: loop of circular references for id "' + file + '#' + id + '"');
                  return;
                }
              }
            }
          }
        }
      };
      this.computeUnits = function(value, unit, percent, isFontSize) {
        if (unit === '%') {
          return parseFloat(value) / 100 * (isFontSize || percent != null ? percent : this.getViewport());
        } else if (unit === 'ex' || unit === 'em') {
          return value * {'em':1, 'ex':0.5}[unit] * (isFontSize ? percent : this.get('font-size'));
        } else {
          return value * {'':1, 'px':1, 'pt':96/72, 'cm':96/2.54, 'mm':96/25.4, 'in':96, 'pc':96/6}[unit];
        }
      };
      this.computeLength = function(value, percent, initial, isFontSize) {
        let parser = new runtime.StringParser((value || '').trim()), temp1, temp2;
        if (typeof (temp1 = parser.matchNumber()) === 'string' && typeof (temp2 = parser.matchLengthUnit()) === 'string' && !parser.matchAll()) {
          return this.computeUnits(temp1, temp2, percent, isFontSize);
        }
        return initial;
      };
      this.computeLengthList = function(value, percent, strict) {
        let parser = new runtime.StringParser((value || '').trim()), result = [], temp1, temp2;
        while (typeof (temp1 = parser.matchNumber()) === 'string' && typeof (temp2 = parser.matchLengthUnit()) === 'string') {
          result.push(this.computeUnits(temp1, temp2, percent));
          parser.matchSeparator();
        }
        if (strict && parser.matchAll()) {return;}
        return result;
      };
      this.getLength = function(key, percent, initial) {
        return this.computeLength(this.attr(key), percent, initial);
      };
      this.getLengthList = function(key, percent) {
        return this.computeLengthList(this.attr(key), percent);
      };
      this.getUrl = function(key) {
        return this.resolveUrl(this.attr(key))
      };
      this.getNumberList = function(key) {
        let parser = new runtime.StringParser((this.attr(key) || '').trim()), result = [], temp;
        while (temp = parser.matchNumber()) {
          result.push(Number(temp));
          parser.matchSeparator();
        }
        result.error = parser.matchAll();
        return result;
      }
      this.getViewbox = function(key, initial) {
        let viewBox = this.getNumberList(key);
        if (viewBox.length === 4 && viewBox[2] >= 0 && viewBox[3] >= 0) {return viewBox;}
        return initial;
      };
      this.getPercent = function(key, initial) {
        let value = this.attr(key);
        let parser = new runtime.StringParser((value || '').trim()), temp1, temp2;
        let number = parser.matchNumber();
        if (!number) {return initial;}
        if (parser.match('%')) {number *= 0.01;}
        if (parser.matchAll()) {return initial;}
        return Math.max(0, Math.min(1, number));
      };
      this.chooseValue = function(args) {
        for (let i = 0; i < arguments.length; i++) {
          if (arguments[i] != null && arguments[i] === arguments[i]) {return arguments[i];}
        }
        return arguments[arguments.length - 1];
      };
      this.get = function(key) {
        if (styleCache[key] !== undefined) {return styleCache[key];}
        let keyInfo = runtime.Properties[key] || {}, value, result;
        for (let i = 0; i < 3; i++) {
          switch (i) {
            case 0:
              if (key !== 'transform') { // the CSS transform behaves strangely
                value = this.css[keyInfo.css || key];
              }
              break;
            case 1:
              value = this.style[key];
              break;
            case 2:
              value = this.attr(key);
              break;
          }
          if (value === 'inherit') {
            result = (this.inherits ? this.inherits.get(key) : keyInfo.initial);
            if (result != null) {return styleCache[key] = result;}
          }
          if (keyInfo.values != null) {
            result = keyInfo.values[value];
            if (result != null) {return styleCache[key] = result;}
          }
          if (value != null) {
            let parsed;
            switch (key) {
              case 'font-size':
                result = this.computeLength(value, this.inherits ? this.inherits.get(key) : keyInfo.initial, undefined, true);
                break;
              case 'baseline-shift':
                result = this.computeLength(value, this.get('font-size'));
                break;
              case 'font-family':
                result = value || undefined;
                break;
              case 'opacity': case 'stroke-opacity': case 'fill-opacity': case 'stop-opacity':
                parsed = parseFloat(value);
                if (!isNaN(parsed)) {
                  result = Math.max(0, Math.min(1, parsed));
                }
                break;
              case 'transform':
                result = runtime.parseTranform(value);
                break;
              case 'stroke-dasharray':
                if (value === 'none') {
                  result = [];
                } else if (parsed = this.computeLengthList(value, this.getViewport(), true)) {
                  let sum = 0, error = false;
                  for (let j = 0; j < parsed.length; j++) {
                    if (parsed[j] < 0) {error = true;}
                    sum += parsed[j];
                  }
                  if (!error) {
                    if (parsed.length % 2 === 1) {
                      parsed = parsed.concat(parsed);
                    }
                    result = (sum === 0 ? [] : parsed);
                  }
                }
                break;
              case 'color':
                if (value === 'none' || value === 'transparent') {
                  result = 'none';
                } else {
                  result = runtime.parseColor(value);
                }
                break;
              case 'fill': case 'stroke':
                if (value === 'none' || value === 'transparent') {
                  result = 'none';
                } else if (value === 'currentColor') {
                  result = this.get('color');
                } else if (parsed = runtime.parseColor(value)) {
                  return parsed;
                } else if (parsed = (value || '').split(' ')) {
                  let object = this.resolveUrl(parsed[0]),
                      fallbackColor = runtime.parseColor(parsed[1]);
                  if (object == null) {
                    result = fallbackColor;
                  } else if (object.nodeName === 'linearGradient' || object.nodeName === 'radialGradient') {
                    result = new runtime.SvgElemGradient(object, null, fallbackColor);
                  } else if (object.nodeName === 'pattern') {
                    result = new runtime.SvgElemPattern(object, null, fallbackColor);
                  } else {
                    result = fallbackColor;
                  }
                }
                break;
              case 'stop-color':
                if (value === 'none' || value === 'transparent') {
                  result = 'none';
                } else if (value === 'currentColor') {
                  result = this.get('color');
                } else {
                  result = runtime.parseColor(value);
                }
                break;
              case 'marker-start': case 'marker-mid': case 'marker-end': case 'clip-path': case 'mask':
                if (value === 'none') {
                  result = 'none';
                } else {
                  result = this.resolveUrl(value);
                }
                break;
              case 'stroke-width':
                parsed = this.computeLength(value, this.getViewport());
                if (parsed != null && parsed >= 0) {
                  result = parsed;
                }
                break;
              case 'stroke-miterlimit':
                parsed = parseFloat(value);
                if (parsed != null && parsed >= 1) {
                  result = parsed;
                }
                break;
              case 'word-spacing': case 'letter-spacing':
                result = this.computeLength(value, this.getViewport());
                break;
              case 'stroke-dashoffset':
                result = this.computeLength(value, this.getViewport());
                if (result != null) {
                  if (result < 0) { // fix for crbug.com/660850
                    let dasharray = this.get('stroke-dasharray');
                    for (let j = 0; j < dasharray.length; j++) {result += dasharray[j];}
                  }
                }
                break;
            }
            if (result != null) {return styleCache[key] = result;}
          }
        }
        return styleCache[key] = (keyInfo.inherit && this.inherits ? this.inherits.get(key) : keyInfo.initial);
      };
      this.getChildren = function() {
        if (childrenCache != null) {return childrenCache;}
        let children = [];
        for (let i = 0; i < obj.childNodes.length; i++) {
          let child = obj.childNodes[i];
          if (!child.error && this.allowedChildren.indexOf(child.nodeName) !== -1) {
            children.push(runtime.createSVGElement(child, this));
          }
        }
        return childrenCache = children;
      };
      this.getParentVWidth = function() {
        return (this.inherits ? this.inherits.getVWidth(): runtime.viewportWidth);
      };
      this.getParentVHeight = function() {
        return (this.inherits ? this.inherits.getVHeight() : runtime.viewportHeight);
      };
      this.getParentViewport = function() {
        return Math.sqrt(0.5 * this.getParentVWidth() * this.getParentVWidth() + 0.5 * this.getParentVHeight() * this.getParentVHeight());
      };
      this.getVWidth = function() {
        return this.getParentVWidth();
      };
      this.getVHeight = function() {
        return this.getParentVHeight();
      };
      this.getViewport = function() {
        return Math.sqrt(0.5 * this.getVWidth() * this.getVWidth() + 0.5 * this.getVHeight() * this.getVHeight());
      };
      this.getBoundingBox = function() {
        let shape = this.getBoundingShape();
        return shape.getBoundingBox();
      };
    };

    var SvgElemStylable = function(obj, inherits) {
      SvgElem.call(this, obj, inherits);
      this.transform = function() {
        runtime.doc.transform.apply(runtime.doc, this.getTransformation());
      };
      this.clip = function() {
        if (this.get('clip-path') !== 'none') {
          let clipPath = new runtime.SvgElemClipPath(this.get('clip-path'), null);
          clipPath.useMask(this.getBoundingBox());
          return true;
        }
      };
      this.mask = function() {
        if (this.get('mask') !== 'none') {
          let mask = new runtime.SvgElemMask(this.get('mask'), null);
          mask.useMask(this.getBoundingBox());
          return true;
        }
      };
      this.getFill = function(isClip, isMask) {
        let opacity = this.get('opacity'),
            fill = this.get('fill'),
            fillOpacity = this.get('fill-opacity');
        if (isClip) {return runtime.DefaultColors.white;}
        if (fill !== 'none' && opacity && fillOpacity) {
          if (fill instanceof runtime.SvgElemGradient || fill instanceof runtime.SvgElemPattern) {
            return fill.getPaint(this.getBoundingBox(), fillOpacity * opacity, isClip, isMask);
          }
          return runtime.opacityToColor(fill, fillOpacity * opacity, isMask);
        }
      };
      this.getStroke = function(isClip, isMask) {
        let opacity = this.get('opacity'),
            stroke = this.get('stroke'),
            strokeOpacity = this.get('stroke-opacity');
        if (isClip || runtime.isEqual(this.get('stroke-width'), 0)) {return;}
        if (stroke !== 'none' && opacity && strokeOpacity) {
          if (stroke instanceof runtime.SvgElemGradient || stroke instanceof runtime.SvgElemPattern) {
            return stroke.getPaint(this.getBoundingBox(), strokeOpacity * opacity, isClip, isMask);
          }
          return runtime.opacityToColor(stroke, strokeOpacity * opacity, isMask);
        }
      };
    };

    var SvgElemHasChildren = function(obj, inherits) {
      SvgElemStylable.call(this, obj, inherits);
      this.allowedChildren = ['use', 'g', 'a', 'svg', 'image', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text'];
      this.getBoundingShape = function() {
        let shape = new runtime.SvgShape(),
            children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
          if (children[i].get('display') !== 'none') {
            if (typeof children[i].getBoundingShape === 'function') {
              let childShape = children[i].getBoundingShape().clone();
              if (typeof children[i].getTransformation === 'function') {
                childShape.transform(children[i].getTransformation());
              }
              shape.mergeShape(childShape);
            }
          }
        }
        return shape;
      };
      this.drawChildren = function(isClip, isMask) {
        let children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
          if (children[i].get('display') !== 'none') {
            if (typeof children[i].drawInDocument === 'function') {
              children[i].drawInDocument(isClip, isMask);
            }
          }
        }
      };
    };

    var SvgElemContainer = function(obj, inherits) {
      SvgElemHasChildren.call(this, obj, inherits);
      this.drawContent = function(isClip, isMask) {
        this.transform();
        let clipped = this.clip(),
            masked = this.mask(),
            group;
        if ((this.get('opacity') < 1 || clipped || masked) && !isClip) {
          group = runtime.docBeginGroup(runtime.getPageBBox());
        }
        this.drawChildren(isClip, isMask);
        if (group) {
          runtime.docEndGroup(group);
          runtime.doc.fillOpacity(this.get('opacity'));
          runtime.docInsertGroup(group);
        }
      };
    };


    return { SvgElem, SvgElemStylable, SvgElemHasChildren, SvgElemContainer };
};
