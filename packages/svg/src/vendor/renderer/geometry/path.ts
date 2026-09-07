// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installPath = (runtime) => {
    var BezierSegment = function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
      let divisions = 6 * runtime.precision;
      let equationX = [p1x, -3 * p1x + 3 * c1x, 3 * p1x - 6 * c1x + 3 * c2x, -p1x + 3 * c1x - 3 * c2x + p2x];
      let equationY = [p1y, -3 * p1y + 3 * c1y, 3 * p1y - 6 * c1y + 3 * c2y, -p1y + 3 * c1y - 3 * c2y + p2y];
      let derivativeX = [-3 * p1x + 3 * c1x, 6 * p1x - 12 * c1x + 6 * c2x, -3 * p1x + 9 * c1x - 9 * c2x + 3 * p2x];
      let derivativeY = [-3 * p1y + 3 * c1y, 6 * p1y - 12 * c1y + 6 * c2y, -3 * p1y + 9 * c1y - 9 * c2y + 3 * p2y];
      let lengthMap = [0];
      for (let i = 1; i <= divisions; i++) {
        let t = (i - 0.5) / divisions;
        let dx = runtime.getCurveValue(t, derivativeX) / divisions,
            dy = runtime.getCurveValue(t, derivativeY) / divisions,
            l = Math.sqrt(dx * dx + dy * dy);
        lengthMap[i] = lengthMap[i - 1] + l;
      }
      this.totalLength = lengthMap[divisions];
      this.startPoint = [p1x, p1y, runtime.isEqual(p1x, c1x) && runtime.isEqual(p1y, c1y) ? Math.atan2(c2y - c1y, c2x - c1x) : Math.atan2(c1y - p1y, c1x - p1x)];
      this.endPoint = [p2x, p2y, runtime.isEqual(c2x, p2x) && runtime.isEqual(c2y, p2y) ? Math.atan2(c2y - c1y, c2x - c1x) : Math.atan2(p2y - c2y, p2x - c2x)];
      this.getBoundingBox = function() {
        let temp;
        let minX = runtime.getCurveValue(0, equationX), minY = runtime.getCurveValue(0, equationY),
            maxX = runtime.getCurveValue(1, equationX), maxY = runtime.getCurveValue(1, equationY);
        if (minX > maxX) {temp = maxX; maxX = minX; minX = temp;}
        if (minY > maxY) {temp = maxY; maxY = minY; minY = temp;}
        let rootsX = runtime.solveEquation(derivativeX);
        for (let i = 0; i < rootsX.length; i++) {
          if (rootsX[i] >= 0 && rootsX[i] <= 1) {
            let x = runtime.getCurveValue(rootsX[i], equationX);
            if (x < minX) {minX = x;}
            if (x > maxX) {maxX = x;}
          }
        }
        let rootsY = runtime.solveEquation(derivativeY);
        for (let i = 0; i < rootsY.length; i++) {
          if (rootsY[i] >= 0 && rootsY[i] <= 1) {
            let y = runtime.getCurveValue(rootsY[i], equationY);
            if (y < minY) {minY = y;}
            if (y > maxY) {maxY = y;}
          }
        }
        return [minX, minY, maxX, maxY];
      };
      this.getPointAtLength = function(l) {
        if (runtime.isEqual(l, 0)) {return this.startPoint;}
        if (runtime.isEqual(l, this.totalLength)) {return this.endPoint;}
        if (l < 0 || l > this.totalLength) {return;}
        for (let i = 1; i <= divisions; i++) {
          let l1 = lengthMap[i-1], l2 = lengthMap[i];
          if (l1 <= l && l <= l2) {
            let t = (i - (l2 - l) / (l2 - l1)) / divisions,
                x = runtime.getCurveValue(t, equationX), y = runtime.getCurveValue(t, equationY),
                dx = runtime.getCurveValue(t, derivativeX), dy = runtime.getCurveValue(t, derivativeY);
            return [x, y, Math.atan2(dy, dx)];
          }
        }
      };
    };

    var LineSegment = function(p1x, p1y, p2x, p2y) {
      this.totalLength = Math.sqrt((p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y));
      this.startPoint = [p1x, p1y, Math.atan2(p2y - p1y, p2x - p1x)];
      this.endPoint = [p2x, p2y, Math.atan2(p2y - p1y, p2x - p1x)];
      this.getBoundingBox = function() {
        return [Math.min(this.startPoint[0], this.endPoint[0]), Math.min(this.startPoint[1], this.endPoint[1]),
                Math.max(this.startPoint[0], this.endPoint[0]), Math.max(this.startPoint[1], this.endPoint[1])];
      };
      this.getPointAtLength = function(l) {
        if (l >= 0 && l <= this.totalLength) {
          let r = l / this.totalLength || 0,
              x = this.startPoint[0] + r * (this.endPoint[0] - this.startPoint[0]),
              y = this.startPoint[1] + r * (this.endPoint[1] - this.startPoint[1]);
          return [x, y, this.startPoint[2]];
        }
      };
    };

    var SvgShape = function() {
      this.pathCommands = [];
      this.pathSegments = [];
      this.startPoint = null;
      this.endPoint = null;
      this.totalLength = 0;
      let startX = 0, startY = 0, currX = 0, currY = 0, lastCom, lastCtrlX, lastCtrlY;
      this.move = function(x, y) {
        startX = currX = x; startY = currY = y;
        return null;
      };
      this.line = function(x, y) {
        let segment = new LineSegment(currX, currY, x, y);
        currX = x; currY = y;
        return segment;
      };
      this.curve = function(c1x, c1y, c2x, c2y, x, y) {
        let segment = new BezierSegment(currX, currY, c1x, c1y, c2x, c2y, x, y);
        currX = x; currY = y;
        return segment;
      };
      this.close = function() {
        let segment = new LineSegment(currX, currY, startX, startY);
        currX = startX; currY = startY;
        return segment;
      };
      this.addCommand = function(data) {
        this.pathCommands.push(data);
        let segment = this[data[0]].apply(this, data.slice(3));
        if (segment) {
          segment.hasStart = data[1];
          segment.hasEnd = data[2];
          this.startPoint = this.startPoint || segment.startPoint;
          this.endPoint = segment.endPoint;
          this.pathSegments.push(segment);
          this.totalLength += segment.totalLength;
        }
      };
      this.M = function(x, y) {
        this.addCommand(['move', true, true, x, y]);
        lastCom = 'M';
        return this;
      };
      this.m = function(x, y) {
        return this.M(currX + x, currY + y);
      };
      this.Z = this.z = function() {
        this.addCommand(['close', true, true]);
        lastCom = 'Z';
        return this;
      };
      this.L = function(x, y) {
        this.addCommand(['line', true, true, x, y]);
        lastCom = 'L';
        return this;
      };
      this.l = function(x, y) {
        return this.L(currX + x, currY + y);
      };
      this.H = function(x) {
        return this.L(x, currY);
      };
      this.h = function(x) {
        return this.L(currX + x, currY);
      };
      this.V = function(y) {
        return this.L(currX, y);
      };
      this.v = function(y) {
        return this.L(currX, currY + y);
      };
      this.C = function(c1x, c1y, c2x, c2y, x, y) {
        this.addCommand(['curve', true, true, c1x, c1y, c2x, c2y, x, y]);
        lastCom = 'C'; lastCtrlX = c2x; lastCtrlY = c2y;
        return this;
      };
      this.c = function(c1x, c1y, c2x, c2y, x, y) {
        return this.C(currX + c1x, currY + c1y, currX + c2x, currY + c2y, currX + x, currY + y);
      };
      this.S = function(c1x, c1y, x, y) {
        return this.C(currX + (lastCom === 'C' ? currX - lastCtrlX : 0), currY + (lastCom === 'C' ? currY - lastCtrlY : 0), c1x, c1y, x, y);
      };
      this.s = function(c1x, c1y, x, y) {
        return this.C(currX + (lastCom === 'C' ? currX - lastCtrlX : 0), currY + (lastCom === 'C' ? currY - lastCtrlY : 0), currX + c1x, currY + c1y, currX + x, currY + y);
      };
      this.Q = function(cx, cy, x, y) {
        let c1x = currX + 2 / 3 * (cx - currX), c1y = currY + 2 / 3 * (cy - currY),
            c2x = x + 2 / 3 * (cx - x), c2y = y + 2 / 3 * (cy - y);
        this.addCommand(['curve', true, true, c1x, c1y, c2x, c2y, x, y]);
        lastCom = 'Q'; lastCtrlX = cx; lastCtrlY = cy;
        return this;
      };
      this.q = function(c1x, c1y, x, y) {
        return this.Q(currX + c1x, currY + c1y, currX + x, currY + y);
      };
      this.T = function(x, y) {
        return this.Q(currX + (lastCom === 'Q' ? currX - lastCtrlX : 0), currY + (lastCom === 'Q' ? currY - lastCtrlY : 0), x, y);
      };
      this.t = function(x, y) {
        return this.Q(currX + (lastCom === 'Q' ? currX - lastCtrlX : 0), currY + (lastCom === 'Q' ? currY - lastCtrlY : 0), currX + x, currY + y);
      };
      this.A = function(rx, ry, fi, fa, fs, x, y) {
        if (runtime.isEqual(rx, 0) || runtime.isEqual(ry, 0)) {
          this.addCommand(['line', true, true, x, y]);
        } else {
          fi = fi * (Math.PI / 180);
          rx = Math.abs(rx);
          ry = Math.abs(ry);
          fa = 1 * !!fa;
          fs = 1 * !!fs;
          let x1 = Math.cos(fi) * (currX - x) / 2 + Math.sin(fi) * (currY - y) / 2,
              y1 = Math.cos(fi) * (currY - y) / 2 - Math.sin(fi) * (currX - x) / 2,
              lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
          if (lambda > 1) {
            rx *= Math.sqrt(lambda);
            ry *= Math.sqrt(lambda);
          }
          let r = Math.sqrt(Math.max(0, rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1)),
              x2 = (fa === fs ? -1 : 1) * r * rx * y1 / ry,
              y2 = (fa === fs ? 1 : -1) * r * ry * x1 / rx;
          let cx = Math.cos(fi) * x2 - Math.sin(fi) * y2 + (currX + x) / 2,
              cy = Math.sin(fi) * x2 + Math.cos(fi) * y2 + (currY + y) / 2,
              th1 = Math.atan2((y1 - y2) / ry, (x1 - x2) / rx),
              th2 = Math.atan2((-y1 - y2) / ry, (-x1 - x2) / rx);
          if (fs === 0 && th2 - th1 > 0) {
            th2 -= 2 * Math.PI;
          } else if (fs === 1 && th2 - th1 < 0) {
            th2 += 2 * Math.PI;
          }
          let segms = Math.ceil(Math.abs(th2 - th1) / (Math.PI / runtime.precision));
          for (let i = 0; i < segms; i++) {
            let th3 = th1 + i * (th2 - th1) / segms,
                th4 = th1 + (i + 1) * (th2 - th1) / segms,
                t = 4/3 * Math.tan((th4 - th3) / 4);
            let c1x = cx + Math.cos(fi) * rx * (Math.cos(th3) - t * Math.sin(th3)) - Math.sin(fi) * ry * (Math.sin(th3) + t * Math.cos(th3)),
                c1y = cy + Math.sin(fi) * rx * (Math.cos(th3) - t * Math.sin(th3)) + Math.cos(fi) * ry * (Math.sin(th3) + t * Math.cos(th3)),
                c2x = cx + Math.cos(fi) * rx * (Math.cos(th4) + t * Math.sin(th4)) - Math.sin(fi) * ry * (Math.sin(th4) - t * Math.cos(th4)),
                c2y = cy + Math.sin(fi) * rx * (Math.cos(th4) + t * Math.sin(th4)) + Math.cos(fi) * ry * (Math.sin(th4) - t * Math.cos(th4)),
                endX = cx + Math.cos(fi) * rx * Math.cos(th4) - Math.sin(fi) * ry * Math.sin(th4),
                endY = cy + Math.sin(fi) * rx * Math.cos(th4) + Math.cos(fi) * ry * Math.sin(th4);
            this.addCommand(['curve', (i === 0), (i === segms - 1), c1x, c1y, c2x, c2y, endX, endY]);
          }
        }
        lastCom = 'A';
        return this;
      };
      this.a = function(rx, ry, fi, fa, fs, x, y) {
        return this.A(rx, ry, fi, fa, fs, currX + x, currY + y);
      };
      this.path = function(d) {
        let command, value, temp,
            parser = new runtime.StringParser((d || '').trim());
        while (command = parser.match(/^[astvzqmhlcASTVZQMHLC]/)) {
          parser.matchSeparator();
          let values = [];
          while (value = (runtime.PathFlags[command + values.length] ? parser.match(/^[01]/) : parser.matchNumber())) {
            parser.matchSeparator();
            if (values.length === runtime.PathArguments[command]) {
              this[command].apply(this, values);
              values = [];
              if (command === 'M') {command = 'L';}
              else if (command === 'm') {command = 'l';}
            }
            values.push(Number(value));
          }
          if (values.length === runtime.PathArguments[command]) {
            this[command].apply(this, values);
          } else {
            runtime.warningCallback('SvgPath: command ' + command + ' with ' + values.length + ' numbers'); return;
          }
        }
        if (temp = parser.matchAll()) {
          runtime.warningCallback('SvgPath: unexpected string ' + temp);
        }
        return this;
      };
      this.getBoundingBox = function() {
        let bbox = [Infinity, Infinity, -Infinity, -Infinity];
        function addBounds(bbox1) {
          if (bbox1[0] < bbox[0]) {bbox[0] = bbox1[0];}
          if (bbox1[2] > bbox[2]) {bbox[2] = bbox1[2];}
          if (bbox1[1] < bbox[1]) {bbox[1] = bbox1[1];}
          if (bbox1[3] > bbox[3]) {bbox[3] = bbox1[3];}
        }
        for (let i = 0; i < this.pathSegments.length; i++) {
          addBounds(this.pathSegments[i].getBoundingBox());
        }
        if (bbox[0] === Infinity) {bbox[0] = 0;}
        if (bbox[1] === Infinity) {bbox[1] = 0;}
        if (bbox[2] === -Infinity) {bbox[2] = 0;}
        if (bbox[3] === -Infinity) {bbox[3] = 0;}
        return bbox;
      };
      this.getPointAtLength = function(l) {
        if (l >= 0 && l <= this.totalLength) {
          let temp;
          for (let i = 0; i < this.pathSegments.length; i++) {
            if (temp = this.pathSegments[i].getPointAtLength(l)) {
              return temp;
            }
            l -= this.pathSegments[i].totalLength;
          }
          return this.endPoint;
        }
      };
      this.transform = function(m) {
        this.pathSegments = [];
        this.startPoint = null;
        this.endPoint = null;
        this.totalLength = 0;
        for (let i = 0; i < this.pathCommands.length; i++) {
          let data = this.pathCommands.shift();
          for (let j = 3; j < data.length; j+=2) {
            let p = runtime.transformPoint([data[j], data[j + 1]], m)
            data[j] = p[0];
            data[j + 1] = p[1];
          }
          this.addCommand(data);
        }
        return this;        
      };
      this.mergeShape = function(shape) {
        for (let i = 0; i < shape.pathCommands.length; i++) {
          this.addCommand(shape.pathCommands[i].slice());
        }
        return this;
      };
      this.clone = function() {
        return new SvgShape().mergeShape(this);
      };
      this.insertInDocument = function() {
        for (let i = 0; i < this.pathCommands.length; i++) {
          let command = this.pathCommands[i][0], values = this.pathCommands[i].slice(3);
          switch(command) {
            case 'move':  runtime.doc.moveTo(values[0], values[1]);  break;
            case 'line':  runtime.doc.lineTo(values[0], values[1]);  break;
            case 'curve':  runtime.doc.bezierCurveTo(values[0], values[1], values[2], values[3], values[4], values[5]);  break;
            case 'close':  runtime.doc.closePath();  break;
          }
        }
      };
      this.getSubPaths = function() {
        let subPaths = [], shape = new SvgShape();
        for (let i = 0; i < this.pathCommands.length; i++) {
          let data = this.pathCommands[i], command = this.pathCommands[i][0];
          if (command === 'move' && i !== 0) {
            subPaths.push(shape);
            shape = new SvgShape();
          }
          shape.addCommand(data);
        }
        subPaths.push(shape);
        return subPaths;
      };
      this.getMarkers = function() {
        let markers = [], subPaths = this.getSubPaths();
        for (let i = 0; i < subPaths.length; i++) {
          let subPath = subPaths[i], subPathMarkers = [];
          for (let j = 0; j < subPath.pathSegments.length; j++) {
            let segment = subPath.pathSegments[j];
            if (runtime.isNotEqual(segment.totalLength, 0) || j === 0 || j === subPath.pathSegments.length - 1) {
              if (segment.hasStart) {
                let startMarker = segment.getPointAtLength(0), prevEndMarker = subPathMarkers.pop();
                if (prevEndMarker) {startMarker[2] = 0.5 * (prevEndMarker[2] + startMarker[2]);}
                subPathMarkers.push(startMarker);
              }
              if (segment.hasEnd) {
                let endMarker = segment.getPointAtLength(segment.totalLength);
                subPathMarkers.push(endMarker);
              }
            }
          }
          markers = markers.concat(subPathMarkers);
        }
        return markers;
      };
    };


    return { BezierSegment, LineSegment, SvgShape };
};
