// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installShapeElements = (runtime) => {
    var SvgElemBasicShape = function(obj, inherits) {
      runtime.SvgElemStylable.call(this, obj, inherits);
      this.dashScale = 1;
      this.getBoundingShape = function() {
        return this.shape;
      };
      this.getTransformation = function() {
        return this.get('transform');
      };
      this.drawInDocument = function(isClip, isMask) {
        if (this.get('visibility') === 'hidden' || !this.shape) {return;}
        runtime.doc.save();
        this.transform();
        this.clip();
        if (!isClip) {
          let masked = this.mask(),
              group;
          if (masked) {
            group = runtime.docBeginGroup(runtime.getPageBBox());
          }
          let subPaths = this.shape.getSubPaths(),
              fill = this.getFill(isClip, isMask),
              stroke = this.getStroke(isClip, isMask),
              lineWidth = this.get('stroke-width'),
              lineCap = this.get('stroke-linecap');
          if (fill || stroke) {
            if (fill) {
              runtime.docFillColor(fill);
            }
            if (stroke) {
              for (let j = 0; j < subPaths.length; j++) {
                if (runtime.isEqual(subPaths[j].totalLength, 0)) {
                  if ((lineCap === 'square' || lineCap === 'round') && lineWidth > 0) {
                    if (subPaths[j].startPoint && subPaths[j].startPoint.length > 1) {
                      let x = subPaths[j].startPoint[0],
                          y = subPaths[j].startPoint[1];
                      runtime.docFillColor(stroke);
                      if (lineCap === 'square') {
                        runtime.doc.rect(x - 0.5 * lineWidth, y - 0.5 * lineWidth, lineWidth, lineWidth);
                      } else if (lineCap === 'round') {
                        runtime.doc.circle(x, y, 0.5 * lineWidth);
                      }
                      runtime.doc.fill();
                    }
                  }
                }
              }
              let dashArray = this.get('stroke-dasharray'),
                  dashOffset = this.get('stroke-dashoffset');
              if (runtime.isNotEqual(this.dashScale, 1)) {
                for (let j = 0; j < dashArray.length; j++) {
                  dashArray[j] *= this.dashScale;
                }
                dashOffset *= this.dashScale;
              }
              runtime.docStrokeColor(stroke);
              runtime.doc.lineWidth(lineWidth)
                 .miterLimit(this.get('stroke-miterlimit'))
                 .lineJoin(this.get('stroke-linejoin'))
                 .lineCap(lineCap)
                 .dash(dashArray, {phase: dashOffset});
            }
            for (let j = 0; j < subPaths.length; j++) {
              if (subPaths[j].totalLength > 0) {
                subPaths[j].insertInDocument();
              }
            }
            if (fill && stroke) {
              runtime.doc.fillAndStroke(this.get('fill-rule'));
            } else if (fill) {
              runtime.doc.fill(this.get('fill-rule'));
            } else if (stroke) {
              runtime.doc.stroke();
            }
          }
          let markerStart = this.get('marker-start'),
              markerMid = this.get('marker-mid'),
              markerEnd = this.get('marker-end');
          if (markerStart !== 'none' || markerMid !== 'none' || markerEnd !== 'none') {
            let markersPos = this.shape.getMarkers();
            if (markerStart !== 'none') {
              let marker = new runtime.SvgElemMarker(markerStart, null);
              marker.drawMarker(false, isMask, markersPos[0], lineWidth);
            }
            if (markerMid !== 'none') {
              for (let i = 1; i < markersPos.length - 1; i++) {
                let marker = new runtime.SvgElemMarker(markerMid, null);
                marker.drawMarker(false, isMask, markersPos[i], lineWidth);
              }
            }
            if (markerEnd !== 'none') {
              let marker = new runtime.SvgElemMarker(markerEnd, null);
              marker.drawMarker(false, isMask, markersPos[markersPos.length - 1], lineWidth);
            }
          }
          if (group) {
            runtime.docEndGroup(group);
            runtime.docInsertGroup(group);
          }
        } else {
          this.shape.insertInDocument();
          runtime.docFillColor(runtime.DefaultColors.white);
          runtime.doc.fill(this.get('clip-rule'));
        }
        runtime.doc.restore();
      };
    };

    var SvgElemRect = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let x = this.getLength('x', this.getVWidth(), 0),
          y = this.getLength('y', this.getVHeight(), 0),
          w = this.getLength('width', this.getVWidth(), 0),
          h = this.getLength('height', this.getVHeight(), 0),
          rx = this.getLength('rx', this.getVWidth()),
          ry = this.getLength('ry', this.getVHeight());
      if (rx === undefined && ry === undefined) {rx = ry = 0;}
      else if (rx === undefined && ry !== undefined) {rx = ry;}
      else if (rx !== undefined && ry === undefined) {ry = rx;}
      if (w > 0 && h > 0) {
        if (rx && ry) {
          rx = Math.min(rx, 0.5 * w);
          ry = Math.min(ry, 0.5 * h);
          this.shape = new runtime.SvgShape().M(x + rx, y).L(x + w - rx, y).A(rx, ry, 0, 0, 1, x + w, y + ry)
                            .L(x + w, y + h - ry).A(rx, ry, 0, 0, 1, x + w - rx, y + h).L(x + rx, y + h)
                            .A(rx, ry, 0, 0, 1, x, y + h - ry).L(x, y + ry).A(rx, ry, 0, 0, 1, x + rx, y).Z();
        } else {
          this.shape = new runtime.SvgShape().M(x, y).L(x + w, y).L(x + w, y + h).L(x, y + h).Z();
        }
      } else {
        this.shape = new runtime.SvgShape();
      }
    };

    var SvgElemCircle = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let cx = this.getLength('cx', this.getVWidth(), 0),
          cy = this.getLength('cy', this.getVHeight(), 0),
          r = this.getLength('r', this.getViewport(), 0);
      if (r > 0) {
        this.shape = new runtime.SvgShape().M(cx + r, cy).A(r, r, 0, 0, 1, cx - r, cy).A(r, r, 0, 0, 1, cx + r, cy).Z();
      } else {
        this.shape = new runtime.SvgShape();
      }
    };

    var SvgElemEllipse = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let cx = this.getLength('cx', this.getVWidth(), 0),
          cy = this.getLength('cy', this.getVHeight(), 0),
          rx = this.getLength('rx', this.getVWidth(), 0),
          ry = this.getLength('ry', this.getVHeight(), 0);
      if (rx > 0 && ry > 0) {
        this.shape = new runtime.SvgShape().M(cx + rx, cy).A(rx, ry, 0, 0, 1, cx - rx, cy).A(rx, ry, 0, 0, 1, cx + rx, cy).Z();
      } else {
        this.shape = new runtime.SvgShape();
      }
    };

    var SvgElemLine = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let x1 = this.getLength('x1', this.getVWidth(), 0),
          y1 = this.getLength('y1', this.getVHeight(), 0),
          x2 = this.getLength('x2', this.getVWidth(), 0),
          y2 = this.getLength('y2', this.getVHeight(), 0);
      this.shape = new runtime.SvgShape().M(x1, y1).L(x2, y2);
    };

    var SvgElemPolyline = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let points = this.getNumberList('points');
      this.shape = new runtime.SvgShape();
      for (let i = 0; i < points.length - 1; i += 2) {
        if (i === 0) {
          this.shape.M(points[i], points[i+1]);
        } else {
          this.shape.L(points[i], points[i+1]);
        }
      }
      if (points.error) {runtime.warningCallback('SvgElemPolygon: unexpected string ' + points.error);}
      if (points.length % 2 === 1) {runtime.warningCallback('SvgElemPolyline: uneven number of coordinates');}
    };

    var SvgElemPolygon = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let points = this.getNumberList('points');
      this.shape = new runtime.SvgShape();
      for (let i = 0; i < points.length - 1; i += 2) {
        if (i === 0) {
          this.shape.M(points[i], points[i+1]);
        } else {
          this.shape.L(points[i], points[i+1]);
        }
      }
      this.shape.Z();
      if (points.error) {runtime.warningCallback('SvgElemPolygon: unexpected string ' + points.error);}
      if (points.length % 2 === 1) {runtime.warningCallback('SvgElemPolygon: uneven number of coordinates');}
    };

    var SvgElemPath = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      this.shape = new runtime.SvgShape().path(this.attr('d'));
      let pathLength = this.getLength('pathLength', this.getViewport());
      this.pathLength = pathLength > 0 ? pathLength : undefined;
      this.dashScale = (this.pathLength !== undefined ? this.shape.totalLength / this.pathLength : 1);
    };


    return { SvgElemBasicShape, SvgElemRect, SvgElemCircle, SvgElemEllipse, SvgElemLine, SvgElemPolyline, SvgElemPolygon, SvgElemPath };
};
