module.exports = function installPaintElements(runtime) {
    var SvgElemPattern = function(obj, inherits, fallback) {
      runtime.SvgElemHasChildren.call(this, obj, inherits);
      this.ref = (function() {
        let ref = this.getUrl('href') || this.getUrl('xlink:href');
        if (ref && ref.nodeName === obj.nodeName) {
          return new SvgElemPattern(ref, inherits, fallback);
        }
      }).call(this);
      let _attr = this.attr;
      this.attr = function(key) {
        let attr = _attr.call(this, key);
        if (attr != null || key === 'href' || key === 'xlink:href') {return attr;}
        return this.ref ? this.ref.attr(key) : null;
      };
      let _getChildren = this.getChildren;
      this.getChildren = function() {
        let children = _getChildren.call(this);
        if (children.length > 0) {return children;}
        return this.ref ? this.ref.getChildren() : [];
      };
      this.getPaint = function(bBox, gOpacity, isClip, isMask) {
        let bBoxUnitsPattern = (this.attr('patternUnits') !== 'userSpaceOnUse'),
            bBoxUnitsContent = (this.attr('patternContentUnits') === 'objectBoundingBox'),
            x = this.getLength('x', (bBoxUnitsPattern ? 1 : this.getParentVWidth()), 0),
            y = this.getLength('y', (bBoxUnitsPattern ? 1 : this.getParentVHeight()), 0),
            width = this.getLength('width', (bBoxUnitsPattern ? 1 : this.getParentVWidth()), 0),
            height = this.getLength('height', (bBoxUnitsPattern ? 1 : this.getParentVHeight()), 0);
        if (bBoxUnitsContent && !bBoxUnitsPattern) { // Use the same units for pattern & pattern content
          x = (x - bBox[0]) / (bBox[2] - bBox[0]) || 0;
          y = (y - bBox[1]) / (bBox[3] - bBox[1]) || 0;
          width = width / (bBox[2] - bBox[0]) || 0;
          height = height / (bBox[3] - bBox[1]) || 0;
        } else if (!bBoxUnitsContent && bBoxUnitsPattern) {
          x = bBox[0] + x * (bBox[2] - bBox[0]);
          y = bBox[1] + y * (bBox[3] - bBox[1]);
          width = width * (bBox[2] - bBox[0]);
          height = height * (bBox[3] - bBox[1]);
        }
        let viewBox = this.getViewbox('viewBox', [0, 0, width, height]),
            aspectRatio = (this.attr('preserveAspectRatio') || '').trim(),
            aspectRatioMatrix = runtime.multiplyMatrix(
              runtime.parseAspectRatio(aspectRatio, width, height, viewBox[2], viewBox[3], 0),
              [1, 0, 0, 1, -viewBox[0], -viewBox[1]]
            ),
            matrix = runtime.parseTranform(this.attr('patternTransform'));
        if (bBoxUnitsContent) {
          matrix = runtime.multiplyMatrix([bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]], matrix);
        }
        matrix = runtime.multiplyMatrix(matrix, [1, 0, 0, 1, x, y]);
        if ((matrix = runtime.validateMatrix(matrix)) && (aspectRatioMatrix = runtime.validateMatrix(aspectRatioMatrix)) && (width = runtime.validateNumber(width)) && (height = runtime.validateNumber(height))) {
          let group = runtime.docBeginGroup([0, 0, width, height]);
          runtime.doc.transform.apply(runtime.doc, aspectRatioMatrix);
          this.drawChildren(isClip, isMask);
          runtime.docEndGroup(group);
          return [runtime.docCreatePattern(group, width, height, matrix), gOpacity];
        } else {
          return fallback ? [fallback[0], fallback[1] * gOpacity] : undefined;
        }
      };
      this.getVWidth = function() {
        let bBoxUnitsPattern = (this.attr('patternUnits') !== 'userSpaceOnUse'),
            width = this.getLength('width', (bBoxUnitsPattern ? 1 : this.getParentVWidth()), 0);
        return this.getViewbox('viewBox', [0, 0, width, 0])[2];
      };
      this.getVHeight = function() {
        let bBoxUnitsPattern = (this.attr('patternUnits') !== 'userSpaceOnUse'),
            height = this.getLength('height', (bBoxUnitsPattern ? 1 : this.getParentVHeight()), 0);
        return this.getViewbox('viewBox', [0, 0, 0, height])[3];
      };
    };

    var SvgElemGradient = function(obj, inherits, fallback) {
      runtime.SvgElem.call(this, obj, inherits);
      this.allowedChildren = ['stop'];
      this.ref = (function() {
        let ref = this.getUrl('href') || this.getUrl('xlink:href');
        if (ref && ref.nodeName === obj.nodeName) {
          return new SvgElemGradient(ref, inherits, fallback);
        }
      }).call(this);
      let _attr = this.attr;
      this.attr = function(key) {
        let attr = _attr.call(this, key);
        if (attr != null || key === 'href' || key === 'xlink:href') {return attr;}
        return this.ref ? this.ref.attr(key) : null;
      };
      let _getChildren = this.getChildren;
      this.getChildren = function() {
        let children = _getChildren.call(this);
        if (children.length > 0) {return children;}
        return this.ref ? this.ref.getChildren() : [];
      };
      this.getPaint = function(bBox, gOpacity, isClip, isMask) {
        let children = this.getChildren();
        if (children.length === 0) {return;}
        if (children.length === 1) {
          let child = children[0],
              stopColor = child.get('stop-color');
          if (stopColor === 'none') {return;}
          return runtime.opacityToColor(stopColor, child.get('stop-opacity') * gOpacity, isMask);
        }
        let bBoxUnits = (this.attr('gradientUnits') !== 'userSpaceOnUse'),
            matrix = runtime.parseTranform(this.attr('gradientTransform')),
            spread = this.attr('spreadMethod'),
            grad,
            x1, x2, y1, y2, r2,
            nAfter = 0,
            nBefore = 0,
            nTotal = 1;
        if (bBoxUnits) {
          matrix = runtime.multiplyMatrix([bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]], matrix);
        }
        if (matrix = runtime.validateMatrix(matrix)) {
          if (this.name === 'linearGradient') {
            x1 = this.getLength('x1', (bBoxUnits ? 1 : this.getVWidth()), 0);
            x2 = this.getLength('x2', (bBoxUnits ? 1 : this.getVWidth()), (bBoxUnits ? 1 : this.getVWidth()));
            y1 = this.getLength('y1', (bBoxUnits ? 1 : this.getVHeight()), 0);
            y2 = this.getLength('y2', (bBoxUnits ? 1 : this.getVHeight()), 0);
          } else {
            x2 = this.getLength('cx', (bBoxUnits ? 1 : this.getVWidth()), (bBoxUnits ? 0.5 : 0.5 * this.getVWidth()));
            y2 = this.getLength('cy', (bBoxUnits ? 1 : this.getVHeight()), (bBoxUnits ? 0.5 : 0.5 * this.getVHeight()));
            r2 = this.getLength('r', (bBoxUnits ? 1 : this.getViewport()), (bBoxUnits ? 0.5 : 0.5 * this.getViewport()));
            x1 = this.getLength('fx', (bBoxUnits ? 1 : this.getVWidth()), x2);
            y1 = this.getLength('fy', (bBoxUnits ? 1 : this.getVHeight()), y2);
            if (r2 < 0) {
              runtime.warningCallback('SvgElemGradient: negative r value');
            }
            let d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
                multiplier = 1;
            if (d > r2) { // according to specification
              multiplier = r2 / d;
              x1 = x2 + (x1 - x2) * multiplier;
              y1 = y2 + (y1 - y2) * multiplier;
            }
            r2 = Math.max(r2, d * multiplier * (1 + 1e-6)); // fix for edge-case gradients see issue #84
          }
          if (spread === 'reflect' || spread === 'repeat') {
            let inv = runtime.inverseMatrix(matrix),
                corner1 = runtime.transformPoint([bBox[0], bBox[1]], inv),
                corner2 = runtime.transformPoint([bBox[2], bBox[1]], inv),
                corner3 = runtime.transformPoint([bBox[2], bBox[3]], inv),
                corner4 = runtime.transformPoint([bBox[0], bBox[3]], inv);
            if (this.name === 'linearGradient') { // See file 'gradient-repeat-maths.png'
              nAfter  = Math.max((corner1[0] - x2) * (x2 - x1) + (corner1[1] - y2) * (y2 - y1),
                                 (corner2[0] - x2) * (x2 - x1) + (corner2[1] - y2) * (y2 - y1),
                                 (corner3[0] - x2) * (x2 - x1) + (corner3[1] - y2) * (y2 - y1),
                                 (corner4[0] - x2) * (x2 - x1) + (corner4[1] - y2) * (y2 - y1))
                                / (Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              nBefore = Math.max((corner1[0] - x1) * (x1 - x2) + (corner1[1] - y1) * (y1 - y2),
                                 (corner2[0] - x1) * (x1 - x2) + (corner2[1] - y1) * (y1 - y2),
                                 (corner3[0] - x1) * (x1 - x2) + (corner3[1] - y1) * (y1 - y2),
                                 (corner4[0] - x1) * (x1 - x2) + (corner4[1] - y1) * (y1 - y2))
                                / (Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            } else {
              nAfter  = Math.sqrt(Math.max(Math.pow(corner1[0] - x2, 2) + Math.pow(corner1[1] - y2, 2),
                                           Math.pow(corner2[0] - x2, 2) + Math.pow(corner2[1] - y2, 2),
                                           Math.pow(corner3[0] - x2, 2) + Math.pow(corner3[1] - y2, 2),
                                           Math.pow(corner4[0] - x2, 2) + Math.pow(corner4[1] - y2, 2))) / r2 - 1;
            }
            nAfter = Math.ceil(nAfter + 0.5); // Add a little more because the stroke can extend outside of the bounding box
            nBefore = Math.ceil(nBefore + 0.5);
            nTotal = nBefore + 1 + nAfter; // How many times the gradient needs to be repeated to fill the object bounding box
          }
          if (this.name === 'linearGradient') {
            grad = runtime.doc.linearGradient(x1 - nBefore * (x2 - x1), y1 - nBefore * (y2 - y1), x2 + nAfter * (x2 - x1), y2 + nAfter * (y2 - y1));
          } else {
            grad = runtime.doc.radialGradient(x1, y1, 0, x2, y2, r2 + nAfter * r2);
          }
          for (let n = 0; n < nTotal; n++) {
            let offset = 0,
                inOrder = (spread !== 'reflect' || (n - nBefore) % 2 === 0);
            for (let i = 0; i < children.length; i++) {
              let child = children[inOrder ? i : children.length - 1 - i],
                  stopColor = child.get('stop-color');
              if (stopColor === 'none') {stopColor = runtime.DefaultColors.transparent;}
              stopColor = runtime.opacityToColor(stopColor, child.get('stop-opacity') * gOpacity, isMask);
              offset = Math.max(offset, inOrder ? child.getPercent('offset', 0) : 1 - child.getPercent('offset', 0));
              if (i === 0 && stopColor[0].length === 4) {grad._colorSpace = 'DeviceCMYK';} // Fix until PR #763 is merged into PDFKit
              if (i === 0 && offset > 0) {
                grad.stop((n + 0) / nTotal, stopColor[0], stopColor[1]);
              }
              grad.stop((n + offset) / (nAfter + nBefore + 1), stopColor[0], stopColor[1]);
              if (i === children.length - 1 && offset < 1) {
                grad.stop((n + 1) / nTotal, stopColor[0], stopColor[1]);
              }
            }
          }
          grad.setTransform.apply(grad, matrix);
          return [grad, 1];
        } else {
          return fallback ? [fallback[0], fallback[1] * gOpacity] : undefined;
        }
      }
    };


    var SvgElemMarker = function(obj, inherits) {
      runtime.SvgElemHasChildren.call(this, obj, inherits);
      let width = this.getLength('markerWidth', this.getParentVWidth(), 3),
          height = this.getLength('markerHeight', this.getParentVHeight(), 3),
          viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
      this.getVWidth = function() {
        return viewBox[2];
      };
      this.getVHeight = function() {
        return viewBox[3];
      };
      this.drawMarker = function(isClip, isMask, posArray, strokeWidth) {
        runtime.doc.save();
        let orient = this.attr('orient'),
            units = this.attr('markerUnits'),
            rotate = (orient === 'auto' ? posArray[2] : (parseFloat(orient) || 0) * Math.PI / 180),
            scale = (units === 'userSpaceOnUse' ? 1 : strokeWidth);
        runtime.doc.transform(Math.cos(rotate) * scale, Math.sin(rotate) * scale, -Math.sin(rotate) * scale, Math.cos(rotate) * scale, posArray[0], posArray[1]);
        let refX = this.getLength('refX', this.getVWidth(), 0),
            refY = this.getLength('refY', this.getVHeight(), 0),
            aspectRatioMatrix = runtime.parseAspectRatio(this.attr('preserveAspectRatio'), width, height, viewBox[2], viewBox[3], 0.5);
        if (this.get('overflow') === 'hidden') {
          runtime.doc.rect(aspectRatioMatrix[0] * (viewBox[0] + viewBox[2] / 2 - refX) - width / 2, aspectRatioMatrix[3] * (viewBox[1] + viewBox[3] / 2 - refY) - height / 2, width, height).clip();
        }
        runtime.doc.transform.apply(runtime.doc, aspectRatioMatrix);
        runtime.doc.translate(-refX, -refY);
        let group;
        if (this.get('opacity') < 1 && !isClip) {
          group = runtime.docBeginGroup(runtime.getPageBBox());
        }
        this.drawChildren(isClip, isMask);
        if (group) {
          runtime.docEndGroup(group);
          runtime.doc.fillOpacity(this.get('opacity'));
          runtime.docInsertGroup(group);
        }
        runtime.doc.restore();
      };
    };

    var SvgElemClipPath = function(obj, inherits) {
      runtime.SvgElemHasChildren.call(this, obj, inherits);
      this.useMask = function(bBox) {
        let group = runtime.docBeginGroup(runtime.getPageBBox());
        runtime.doc.save();
        if (this.attr('clipPathUnits') === 'objectBoundingBox') {
          runtime.doc.transform(bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]);
        }
        this.clip();
        this.drawChildren(true, false);
        runtime.doc.restore();
        runtime.docEndGroup(group);
        runtime.docApplyMask(group, true);
      };
    };

    var SvgElemMask = function(obj, inherits) {
      runtime.SvgElemHasChildren.call(this, obj, inherits);
      this.useMask = function(bBox) {
        let group = runtime.docBeginGroup(runtime.getPageBBox());
        runtime.doc.save();
        let x, y, w, h;
        if (this.attr('maskUnits') === 'userSpaceOnUse') {
          x = this.getLength('x', this.getVWidth(), -0.1 * (bBox[2] - bBox[0]) + bBox[0]);
          y = this.getLength('y', this.getVHeight(), -0.1 * (bBox[3] - bBox[1]) + bBox[1]);
          w = this.getLength('width', this.getVWidth(), 1.2 * (bBox[2] - bBox[0]));
          h = this.getLength('height', this.getVHeight(), 1.2 * (bBox[3] - bBox[1]));
        } else {
          x = this.getLength('x', this.getVWidth(), -0.1) * (bBox[2] - bBox[0]) + bBox[0];
          y = this.getLength('y', this.getVHeight(), -0.1) * (bBox[3] - bBox[1]) + bBox[1];
          w = this.getLength('width', this.getVWidth(), 1.2) * (bBox[2] - bBox[0]);
          h = this.getLength('height', this.getVHeight(), 1.2) * (bBox[3] - bBox[1]);
        }
        runtime.doc.rect(x, y, w, h).clip();
        if (this.attr('maskContentUnits') === 'objectBoundingBox') {
          runtime.doc.transform(bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]);
        }
        this.clip();
        this.drawChildren(false, true);
        runtime.doc.restore();
        runtime.docEndGroup(group);
        runtime.docApplyMask(group, true);
      };
    };


    return { SvgElemPattern, SvgElemGradient, SvgElemMarker, SvgElemClipPath, SvgElemMask };
};
