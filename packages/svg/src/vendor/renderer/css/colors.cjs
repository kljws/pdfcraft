module.exports = function installColors(runtime) {
    function parseColor(raw) {
      let temp, result;
      raw = (raw || '').trim();
      if (temp = runtime.NamedColors[raw]) {
        result = [temp.slice(), 1];
      } else if (temp = raw.match(/^rgba\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9.]+)\s*\)$/i)) {
        temp[1] = parseInt(temp[1]); temp[2] = parseInt(temp[2]); temp[3] = parseInt(temp[3]); temp[4] = parseFloat(temp[4]);
        if (temp[1] < 256 && temp[2] < 256 && temp[3] < 256 && temp[4] <= 1) {
          result = [temp.slice(1, 4), temp[4]];
        }
      } else if (temp = raw.match(/^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/i)) {
        temp[1] = parseInt(temp[1]); temp[2] = parseInt(temp[2]); temp[3] = parseInt(temp[3]);
        if (temp[1] < 256 && temp[2] < 256 && temp[3] < 256) {
          result = [temp.slice(1, 4), 1];
        }
      } else if (temp = raw.match(/^rgb\(\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i)) {
        temp[1] = 2.55 * parseFloat(temp[1]); temp[2] = 2.55 * parseFloat(temp[2]); temp[3] = 2.55 * parseFloat(temp[3]);
        if (temp[1] < 256 && temp[2] < 256 && temp[3] < 256) {
          result = [temp.slice(1, 4), 1];
        }
      } else if (temp = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)) {
        result = [[parseInt(temp[1], 16), parseInt(temp[2], 16), parseInt(temp[3], 16)], 1];
      } else if (temp = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)) {
        result = [[0x11 * parseInt(temp[1], 16), 0x11 * parseInt(temp[2], 16), 0x11 * parseInt(temp[3], 16)], 1];
      }
      return runtime.colorCallback ? runtime.colorCallback(result, raw) : result;
    }
    function opacityToColor(color, opacity, isMask) {
      let newColor = color[0].slice(),
          newOpacity = color[1] * opacity;
      if (isMask) {
        for (let i = 0; i < color.length; i++) {
          newColor[i] *= newOpacity;
        }
        return [newColor, 1];
      } else {
        return [newColor, newOpacity];
      }
    }

    return { parseColor, opacityToColor };
};
