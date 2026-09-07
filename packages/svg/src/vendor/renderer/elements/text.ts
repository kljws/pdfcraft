// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installTextElements = (runtime) => {
    var SvgElemTextContainer = function(obj, inherits) {
      runtime.SvgElemStylable.call(this, obj, inherits);
      this.allowedChildren = ['tspan', '#text', '#cdata-section', 'a'];
      this.isText = true;
      this.getBoundingShape = function() {
        let shape = new runtime.SvgShape();
        for (let i = 0; i < this._pos.length; i++) {
          let pos = this._pos[i];
          if (!pos.hidden) {
            let dx0 = pos.ascent * Math.sin(pos.rotate), dy0 = -pos.ascent * Math.cos(pos.rotate),
                dx1 = pos.descent * Math.sin(pos.rotate), dy1 = -pos.descent * Math.cos(pos.rotate),
                dx2 = pos.width * Math.cos(pos.rotate), dy2 = pos.width * Math.sin(pos.rotate);
            shape.M(pos.x + dx0, pos.y + dy0).L(pos.x + dx0 + dx2, pos.y + dy0 + dy2)
                 .M(pos.x + dx1 + dx2, pos.y + dy1 + dy2).L(pos.x + dx1, pos.y + dy1);
          }
        }
        return shape;
      };
      this.drawTextInDocument = function(isClip, isMask) {
        if (this.link && !isClip && !isMask) {this.addLink();}
        if (this.get('text-decoration') === 'underline') {
          this.decorate(0.05 * this._font.size, -0.075 * this._font.size, isClip, isMask);
        }
        if (this.get('text-decoration') === 'overline') {
          this.decorate(0.05 * this._font.size, runtime.getAscent(this._font.font, this._font.size) + 0.075 * this._font.size, isClip, isMask);
        }
        let fill = this.getFill(isClip, isMask),
            stroke = this.getStroke(isClip, isMask),
            strokeWidth = this.get('stroke-width');
        if (this._font.fauxBold) {
          if (!stroke) {
            stroke = fill;
            strokeWidth = this._font.size * 0.03;
          } else {
            strokeWidth += this._font.size * 0.03;
          }
        }
        let children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
          let childElem = children[i];
          switch(childElem.name) {
            case 'tspan': case 'textPath': case 'a':
              if (childElem.get('display') !== 'none') {
                childElem.drawTextInDocument(isClip, isMask);
              }
              break;
            case '#text': case '#cdata-section':
              if (this.get('visibility') === 'hidden') {continue;}
              if (fill || stroke || isClip) {
                if (fill) {
                  runtime.docFillColor(fill);
                }
                if (stroke && strokeWidth) {
                  runtime.docStrokeColor(stroke);
                  runtime.doc.lineWidth(strokeWidth)
                     .miterLimit(this.get('stroke-miterlimit'))
                     .lineJoin(this.get('stroke-linejoin'))
                     .lineCap(this.get('stroke-linecap'))
                     .dash(this.get('stroke-dasharray'), {phase:this.get('stroke-dashoffset')});
                }
                runtime.docBeginText(this._font.font, this._font.size);
                runtime.docSetTextMode(!!fill, !!stroke);
                for (let j = 0, pos = childElem._pos; j < pos.length; j++) {
                  if (!pos[j].hidden && runtime.isNotEqual(pos[j].width, 0)) {
                    let cos = Math.cos(pos[j].rotate), sin = Math.sin(pos[j].rotate), skew = (this._font.fauxItalic ? -0.25 : 0);
                    runtime.docSetTextMatrix(cos * pos[j].scale, sin * pos[j].scale, cos * skew - sin, sin * skew + cos, pos[j].x, pos[j].y);
                    runtime.docWriteGlyph(pos[j].glyph);
                  }
                }
                runtime.docEndText();
              }
              break;
          }
        }
        if (this.get('text-decoration') === 'line-through') {
          this.decorate(0.05 * this._font.size, 0.5 * (runtime.getAscent(this._font.font, this._font.size) + runtime.getDescent(this._font.font, this._font.size)), isClip, isMask);
        }
      };
      this.decorate = function(lineWidth, linePosition, isClip, isMask) {
        let fill = this.getFill(isClip, isMask),
            stroke = this.getStroke(isClip, isMask);
        if (fill) {
          runtime.docFillColor(fill);
        }
        if (stroke) {
          runtime.docStrokeColor(stroke);
          runtime.doc.lineWidth(this.get('stroke-width'))
             .miterLimit(this.get('stroke-miterlimit'))
             .lineJoin(this.get('stroke-linejoin'))
             .lineCap(this.get('stroke-linecap'))
             .dash(this.get('stroke-dasharray'), {phase:this.get('stroke-dashoffset')});
        }
        for (let j = 0, pos = this._pos; j < pos.length; j++) {
          if (!pos[j].hidden && runtime.isNotEqual(pos[j].width, 0)) {
            let dx0 = (linePosition + lineWidth / 2) * Math.sin(pos[j].rotate),
                dy0 = -(linePosition + lineWidth / 2) * Math.cos(pos[j].rotate),
                dx1 = (linePosition - lineWidth / 2) * Math.sin(pos[j].rotate),
                dy1 = -(linePosition - lineWidth / 2) * Math.cos(pos[j].rotate),
                dx2 = pos[j].width * Math.cos(pos[j].rotate),
                dy2 = pos[j].width * Math.sin(pos[j].rotate);
            new runtime.SvgShape().M(pos[j].x + dx0, pos[j].y + dy0)
                          .L(pos[j].x + dx0 + dx2, pos[j].y + dy0 + dy2)
                          .L(pos[j].x + dx1 + dx2, pos[j].y + dy1 + dy2)
                          .L(pos[j].x + dx1, pos[j].y + dy1).Z()
                          .insertInDocument();
            if (fill && stroke) {
              runtime.doc.fillAndStroke();
            } else if (fill) {
              runtime.doc.fill();
            } else if (stroke) {
              runtime.doc.stroke();
            }
          }
        }
      };
    };

    var SvgElemTextNode = function(obj, inherits) {
      this.name = obj.nodeName;
      this.textContent = obj.nodeValue;
    };

    var SvgElemTspan = function(obj, inherits) {
      SvgElemTextContainer.call(this, obj, inherits);
    };

    var SvgElemTextPath = function(obj, inherits) {
      SvgElemTextContainer.call(this, obj, inherits);
      let pathObject, pathLength, temp;
      if ((temp = this.attr('path')) && temp.trim() !== '') {
        let pathLength = this.getLength('pathLength', this.getViewport());
        this.pathObject = new runtime.SvgShape().path(temp);
        this.pathLength = pathLength > 0 ? pathLength : this.pathObject.totalLength;
        this.pathScale = this.pathObject.totalLength / this.pathLength;
      } else if ((temp = this.getUrl('href') || this.getUrl('xlink:href')) && temp.nodeName === 'path') {
        let pathElem = new runtime.SvgElemPath(temp, this);
        this.pathObject = pathElem.shape.clone().transform(pathElem.get('transform'));
        this.pathLength = this.chooseValue(pathElem.pathLength, this.pathObject.totalLength);
        this.pathScale = this.pathObject.totalLength / this.pathLength;
      }
    };

    var SvgElemText = function(obj, inherits) {
      SvgElemTextContainer.call(this, obj, inherits);
      this.allowedChildren = ['textPath', 'tspan', '#text', '#cdata-section', 'a'];
      (function (textParentElem) {
        let processedText = '', remainingText = obj.textContent, textPaths = [], currentChunk = [], currentAnchor, currentDirection, currentX = 0, currentY = 0;
        function doAnchoring() {
          if (currentChunk.length) {
            let last = currentChunk[currentChunk.length - 1];
            let first = currentChunk[0]
            let width = last.x + last.width - first.x;
            let anchordx = {'startltr': 0, 'middleltr': 0.5, 'endltr': 1, 'startrtl': 1, 'middlertl': 0.5, 'endrtl': 0}[currentAnchor + currentDirection] * width || 0;
            for (let i = 0; i < currentChunk.length; i++) {
              currentChunk[i].x -= anchordx;
            }
          }
          currentChunk = [];
        }
        function adjustLength(pos, length, spacingAndGlyphs) {
          let firstChar = pos[0], lastChar = pos[pos.length - 1],
              startX = firstChar.x, endX = lastChar.x + lastChar.width;
          if (spacingAndGlyphs) {
            let textScale = length / (endX - startX);
            if (textScale > 0 && textScale < Infinity) {
              for (let j = 0; j < pos.length; j++) {
                pos[j].x = startX + textScale * (pos[j].x - startX);
                pos[j].scale *= textScale;
                pos[j].width *= textScale;
              }
            }
          } else {
            if (pos.length >= 2) {
              let spaceDiff = (length - (endX - startX)) / (pos.length - 1);
              for (let j = 0; j < pos.length; j++) {
                pos[j].x += j * spaceDiff;
              }
            }
          }
          currentX += length - (endX - startX);
        }
        function recursive(currentElem, parentElem) {
          currentElem._x = runtime.combineArrays(currentElem.getLengthList('x', currentElem.getVWidth()), (parentElem ? parentElem._x.slice(parentElem._pos.length) : []));
          currentElem._y = runtime.combineArrays(currentElem.getLengthList('y', currentElem.getVHeight()), (parentElem ? parentElem._y.slice(parentElem._pos.length) : []));
          currentElem._dx = runtime.combineArrays(currentElem.getLengthList('dx', currentElem.getVWidth()), (parentElem ? parentElem._dx.slice(parentElem._pos.length) : []));
          currentElem._dy = runtime.combineArrays(currentElem.getLengthList('dy', currentElem.getVHeight()), (parentElem ? parentElem._dy.slice(parentElem._pos.length) : []));
          currentElem._rot = runtime.combineArrays(currentElem.getNumberList('rotate'), (parentElem ? parentElem._rot.slice(parentElem._pos.length) : []));
          currentElem._defRot = currentElem.chooseValue(currentElem._rot[currentElem._rot.length - 1], parentElem && parentElem._defRot, 0);
          if (currentElem.name === 'textPath') {currentElem._y = [];}
          let fontOptions = {fauxItalic: false, fauxBold: false},
              fontNameorLink = runtime.fontCallback(currentElem.get('font-family'), currentElem.get('font-weight') === 'bold', currentElem.get('font-style') === 'italic', fontOptions);
          try {
            runtime.doc.font(fontNameorLink);
          } catch(e) {
            runtime.warningCallback('SVGElemText: failed to open font "' + fontNameorLink + '" in PDFKit');
          }
          currentElem._pos = [];
          currentElem._index = 0;
          currentElem._font = {font: runtime.doc._font, size: currentElem.get('font-size'), fauxItalic: fontOptions.fauxItalic, fauxBold: fontOptions.fauxBold};
          let textLength = currentElem.getLength('textLength', currentElem.getVWidth(), undefined),
              spacingAndGlyphs = currentElem.attr('lengthAdjust') === 'spacingAndGlyphs',
              wordSpacing = currentElem.get('word-spacing'),
              letterSpacing = currentElem.get('letter-spacing'),
              textAnchor = currentElem.get('text-anchor'),
              textDirection = currentElem.get('direction'),
              baseline = runtime.getBaseline(currentElem._font.font, currentElem._font.size, currentElem.get('alignment-baseline') || currentElem.get('dominant-baseline'), currentElem.get('baseline-shift'));
          if (currentElem.name === 'textPath') {
            doAnchoring();
            currentX = currentY = 0;
          }
          let children = currentElem.getChildren();
          for (let i = 0; i < children.length; i++) {
            let childElem = children[i];
            switch(childElem.name) {
              case 'tspan': case 'textPath': case 'a':
                recursive(childElem, currentElem);
                break;
              case '#text': case '#cdata-section':
                let rawText = childElem.textContent, renderedText = rawText, words;
                childElem._font = currentElem._font;
                childElem._pos = [];
                remainingText = remainingText.substring(rawText.length);
                if (currentElem.get('xml:space') === 'preserve') {
                  renderedText = renderedText.replace(/[\s]/g, ' ');
                } else {
                  renderedText = renderedText.replace(/[\s]+/g, ' ');
                  if (processedText.match(/[\s]$|^$/)) {renderedText = renderedText.replace(/^[\s]/, '');}
                  if (remainingText.match(/^[\s]*$/)) {renderedText = renderedText.replace(/[\s]$/, '');}
                }
                processedText += rawText;
                if (wordSpacing === 0) {
                  words = [renderedText];
                } else {
                  words = renderedText.split(/(\s)/);
                }
                for (let w = 0; w < words.length; w++) {
                  let pos = runtime.getTextPos(currentElem._font.font, currentElem._font.size, words[w]);
                  for (let j = 0; j < pos.length; j++) {
                    let index = currentElem._index,
                        xAttr = currentElem._x[index],
                        yAttr = currentElem._y[index],
                        dxAttr = currentElem._dx[index],
                        dyAttr = currentElem._dy[index],
                        rotAttr = currentElem._rot[index],
                        continuous = !(w === 0 && j === 0);
                    if (xAttr !== undefined) {continuous = false; doAnchoring(); currentX = xAttr;}
                    if (yAttr !== undefined) {continuous = false; doAnchoring(); currentY = yAttr;}
                    if (dxAttr !== undefined) {continuous = false; currentX += dxAttr;}
                    if (dyAttr !== undefined) {continuous = false; currentY += dyAttr;}
                    if (rotAttr !== undefined || currentElem._defRot !== 0) {continuous = false;}
                    let position = {
                      glyph: pos[j].glyph,
                      rotate: (Math.PI / 180) * currentElem.chooseValue(rotAttr, currentElem._defRot),
                      x: currentX + pos[j].xOffset,
                      y: currentY + baseline + pos[j].yOffset,
                      width: pos[j].width,
                      ascent: runtime.getAscent(currentElem._font.font, currentElem._font.size),
                      descent: runtime.getDescent(currentElem._font.font, currentElem._font.size),
                      scale: 1,
                      hidden: false,
                      continuous: continuous
                    };
                    currentChunk.push(position);
                    childElem._pos.push(position);
                    currentElem._pos.push(position);
                    currentElem._index += pos[j].unicode.length;
                    if (currentChunk.length === 1) {
                      currentAnchor = textAnchor;
                      currentDirection = textDirection;
                    }
                    currentX += pos[j].xAdvance + letterSpacing;
                    currentY += pos[j].yAdvance;
                  }
                  if (words[w] === ' ') {
                    currentX += wordSpacing;
                  }
                }
                break;
              default:
                remainingText = remainingText.substring(childElem.textContent.length);
            }
          }
          if (textLength && currentElem._pos.length) {
            adjustLength(currentElem._pos, textLength, spacingAndGlyphs);
          }
          if (currentElem.name === 'textPath' || currentElem.name === 'text') {
            doAnchoring();
          }
          if (currentElem.name === 'textPath') {
            textPaths.push(currentElem);
            let pathObject = currentElem.pathObject;
            if (pathObject) {
              currentX = pathObject.endPoint[0]; currentY = pathObject.endPoint[1];
            }
          }
          if (parentElem) {
            parentElem._pos = parentElem._pos.concat(currentElem._pos);
            parentElem._index += currentElem._index;
          }
        }
        function textOnPath(currentElem) {
          let pathObject = currentElem.pathObject,
              pathLength = currentElem.pathLength,
              pathScale = currentElem.pathScale;
          if (pathObject) {
            let textOffset = currentElem.getLength('startOffset', pathLength, 0);
            for (let j = 0; j < currentElem._pos.length; j++) {
              let charMidX = textOffset + currentElem._pos[j].x + 0.5 * currentElem._pos[j].width;
              if (charMidX > pathLength || charMidX < 0) {
                currentElem._pos[j].hidden = true;
              } else {
                let pointOnPath = pathObject.getPointAtLength(charMidX * pathScale);
                if (runtime.isNotEqual(pathScale, 1)) {
                  currentElem._pos[j].scale *= pathScale;
                  currentElem._pos[j].width *= pathScale;
                }
                currentElem._pos[j].x = pointOnPath[0] - 0.5 * currentElem._pos[j].width * Math.cos(pointOnPath[2]) - currentElem._pos[j].y * Math.sin(pointOnPath[2]);
                currentElem._pos[j].y = pointOnPath[1] - 0.5 * currentElem._pos[j].width * Math.sin(pointOnPath[2]) + currentElem._pos[j].y * Math.cos(pointOnPath[2]);
                currentElem._pos[j].rotate = pointOnPath[2] + currentElem._pos[j].rotate;
                currentElem._pos[j].continuous = false;
              }
            }
          } else {
            for (let j = 0; j < currentElem._pos.length; j++) {
              currentElem._pos[j].hidden = true;
            }
          }
        }
        recursive(textParentElem, null);
        for (let i = 0; i < textPaths.length; i++) {
          textOnPath(textPaths[i]);
        }
      })(this);
      this.getTransformation = function() {
        return this.get('transform');
      };
      this.drawInDocument = function(isClip, isMask) {
        runtime.doc.save();
        this.transform();
        this.clip();
        let masked = this.mask(), group;
        if (masked) {
          group = runtime.docBeginGroup(runtime.getPageBBox());
        }
        this.drawTextInDocument(isClip, isMask);
        if (group) {
          runtime.docEndGroup(group);
          runtime.docInsertGroup(group);
        }
        runtime.doc.restore();
      };
    };

    return { SvgElemTextContainer, SvgElemTextNode, SvgElemTspan, SvgElemTextPath, SvgElemText };
};
