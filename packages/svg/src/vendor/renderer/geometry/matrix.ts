// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installGeometry = (runtime) => {
    function multiplyMatrix() {
      function multiply(a, b) {
        return [ a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3],
                 a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5] ];
      }
      let result = arguments[0];
      for (let i = 1; i < arguments.length; i++) {
        result = multiply(result, arguments[i]);
      }
      return result;
    }
    function transformPoint(p, m) {
      return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    }
    function getGlobalMatrix() {
      let ctm = runtime.doc._ctm;
      for (let i = runtime.groupStack.length - 1; i >= 0; i--) {
        ctm = multiplyMatrix(runtime.groupStack[i].savedMatrix, ctm);
      }
      return ctm;
    }
    function getPageBBox() {
      return new runtime.SvgShape().M(0, 0).L(runtime.doc.page.width, 0).L(runtime.doc.page.width, runtime.doc.page.height).L(0, runtime.doc.page.height)
                           .transform(inverseMatrix(getGlobalMatrix())).getBoundingBox();
    }
    function inverseMatrix(m) {
      let dt = m[0] * m[3] - m[1] * m[2];
      return [m[3] / dt, -m[1] / dt, -m[2] / dt, m[0] / dt, (m[2]*m[5] - m[3]*m[4]) / dt, (m[1]*m[4] - m[0]*m[5]) / dt];
    }
    function validateMatrix(m) {
      let m0 = validateNumber(m[0]), m1 = validateNumber(m[1]), m2 = validateNumber(m[2]),
          m3 = validateNumber(m[3]), m4 = validateNumber(m[4]), m5 = validateNumber(m[5]);
      if (isNotEqual(m0 * m3 - m1 * m2, 0)) {
        return [m0, m1, m2, m3, m4, m5];
      }
    }
    function solveEquation(curve) {
      let a = curve[2] || 0, b = curve[1] || 0, c = curve[0] || 0;
      if (isEqual(a, 0) && isEqual(b, 0)) {
        return [];
      } else if (isEqual(a, 0)) {
        return [(-c) / b];
      } else {
        let d = b * b - 4 * a * c;
        if (isNotEqual(d, 0) && d > 0) {
          return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
        } else if (isEqual(d, 0)) {
          return [(-b) / (2 * a)];
        } else {
          return [];
        }
      }
    }
    function getCurveValue(t, curve) {
      return (curve[0] || 0) + (curve[1] || 0) * t + (curve[2] || 0) * t * t + (curve[3] || 0) * t * t * t;
    }
    function isEqual(number, ref) {
      return Math.abs(number - ref) < 1e-10;
    }
    function isNotEqual(number, ref) {
      return Math.abs(number - ref) >= 1e-10;
    }
    function validateNumber(n) {
      return n > -1e21 && n < 1e21 ? Math.round(n * 1e6) / 1e6 : 0;
    }
    function isArrayLike(v) {
      return typeof v === 'object' && v !== null && typeof v.length === 'number';
    }
    function parseTranform(v) {
      let parser = new runtime.StringParser((v || '').trim()), result = [1, 0, 0, 1, 0, 0], temp;
      while (temp = parser.match(/^([A-Za-z]+)\s*[(]([^(]+)[)]/, true)) {
        let func = temp[1], nums = [], parser2 = new runtime.StringParser(temp[2].trim()), temp2;
        while (temp2 = parser2.matchNumber()) {
          nums.push(Number(temp2));
          parser2.matchSeparator();
        }
        if (func === 'matrix' && nums.length === 6) {
          result = multiplyMatrix(result, [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]]);
        } else if (func === 'translate' && nums.length === 2) {
          result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], nums[1]]);
        } else if (func === 'translate' && nums.length === 1) {
          result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], 0]);
        } else if (func === 'scale' && nums.length === 2) {
          result = multiplyMatrix(result, [nums[0], 0, 0, nums[1], 0, 0]);
        } else if (func === 'scale' && nums.length === 1) {
          result = multiplyMatrix(result, [nums[0], 0, 0, nums[0], 0, 0]);
        } else if (func === 'rotate' && nums.length === 3) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [1, 0, 0, 1, nums[1], nums[2]], [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0], [1, 0, 0, 1, -nums[1], -nums[2]]);
        } else if (func === 'rotate' && nums.length === 1) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
        } else if (func === 'skewX' && nums.length === 1) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [1, 0, Math.tan(a), 1, 0, 0]);
        } else if (func === 'skewY' && nums.length === 1) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [1, Math.tan(a), 0, 1, 0, 0]);
        } else {return;}
        parser.matchSeparator();
      }
      if (parser.matchAll()) {return;}
      return result;
    }
    function parseAspectRatio(aspectRatio, availWidth, availHeight, elemWidth, elemHeight, initAlign) {
      let temp = (aspectRatio || '').trim().match(/^(none)$|^x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+(meet|slice))?$/) || [],
          ratioType = temp[1] || temp[4] || 'meet',
          xAlign = temp[2] || 'Mid',
          yAlign = temp[3] || 'Mid',
          scaleX = availWidth / elemWidth,
          scaleY = availHeight / elemHeight,
          dx = {'Min':0, 'Mid':0.5, 'Max':1}[xAlign] - (initAlign || 0),
          dy = {'Min':0, 'Mid':0.5, 'Max':1}[yAlign] - (initAlign || 0);
      if (ratioType === 'slice') {
        scaleY = scaleX = Math.max(scaleX, scaleY);
      } else if (ratioType === 'meet') {
        scaleY = scaleX = Math.min(scaleX, scaleY);
      }
      return [scaleX, 0, 0, scaleY, dx * (availWidth - elemWidth * scaleX), dy * (availHeight - elemHeight * scaleY)];
    }

    return { multiplyMatrix, transformPoint, getGlobalMatrix, getPageBBox, inverseMatrix, validateMatrix, solveEquation, getCurveValue, isEqual, isNotEqual, validateNumber, isArrayLike, parseTranform, parseAspectRatio };
};
