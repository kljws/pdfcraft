// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installStylesheet = (runtime) => {
    function parseStyleAttr(v) {
      let result = Object.create(null);
      v = (v || '').trim().split(/;/);
      for (let i = 0; i < v.length; i++) {
        let key = (v[i].split(':')[0] || '').trim(),
            value = (v[i].split(':')[1] || '').trim();
        if (key) {
          result[key] = value;
        }
      }
      if (result['marker']) {
        if (!result['marker-start']) {result['marker-start'] = result['marker'];}
        if (!result['marker-mid']) {result['marker-mid'] = result['marker'];}
        if (!result['marker-end']) {result['marker-end'] = result['marker'];}
      }
      if (result['font']) {
        let fontFamily = null, fontSize = null, fontStyle = "normal", fontWeight = "normal", fontVariant = "normal";
        let parts = result['font'].split(/\s+/);
        for (let i = 0; i < parts.length; i++) {
          switch (parts[i]) {
            case "normal":
              break;
            case "italic": case "oblique":
              fontStyle = parts[i];
              break;
            case "small-caps":
              fontVariant = parts[i];
              break;
            case "bold": case "bolder": case "lighter": case "100": case "200": case "300":
            case "400": case "500": case "600": case "700": case "800": case "900":
              fontWeight = parts[i];
              break;
            default:
              if (!fontSize) {
                fontSize = parts[i].split('/')[0];
              } else {
                if (!fontFamily) {
                  fontFamily = parts[i];
                } else {
                  fontFamily += ' ' + parts[i];
                }
              }
              break;
          }
        }
        if (!result['font-style']) {result['font-style'] = fontStyle;}
        if (!result['font-variant']) {result['font-variant'] = fontVariant;}
        if (!result['font-weight']) {result['font-weight'] = fontWeight;}
        if (!result['font-size']) {result['font-size'] = fontSize;}
        if (!result['font-family']) {result['font-family'] = fontFamily;}
      }
      return result;
    }
    function parseSelector(v) {
      let parts = v.split(/(?=[.#])/g), ids = [], classes = [], tags = [], temp;
      for (let i = 0; i < parts.length; i++) {
        if (temp = parts[i].match(/^[#]([_A-Za-z0-9-]+)$/)) {
          ids.push(temp[1]);
        } else if (temp = parts[i].match(/^[.]([_A-Za-z0-9-]+)$/)) {
          classes.push(temp[1]);
        } else if (temp = parts[i].match(/^([_A-Za-z0-9-]+)$/)) {
          tags.push(temp[1]);
        } else if (parts[i] !== '*') {
          return;
        }
      }
      return {
        tags: tags, ids: ids, classes: classes,
        specificity: ids.length * 10000 + classes.length * 100 + tags.length
      };
    }
    function parseStyleSheet(v) {
      let parser = new runtime.StringParser(v.trim()), rules = [], rule;
      while (rule = parser.match(/^\s*([^\{\}]*?)\s*\{([^\{\}]*?)\}/, true)) {
        let selectors = rule[1].split(/\s*,\s*/g),
            css = parseStyleAttr(rule[2]);
        for (let i = 0; i < selectors.length; i++) {
          let selector = parseSelector(selectors[i]);
          if (selector) {
            rules.push({selector: selector, css:css});
          }
        }
      }
      return rules;
    }
    function matchesSelector(elem, selector) {
      if (elem.nodeType !== 1) {return false;}
      for (let i = 0; i < selector.tags.length; i++) {
        if (selector.tags[i] !== elem.nodeName) {return false;}
      }
      for (let i = 0; i < selector.ids.length; i++) {
        if (selector.ids[i] !== elem.id) {return false;}
      }
      for (let i = 0; i < selector.classes.length; i++) {
        if (elem.classList.indexOf(selector.classes[i]) === -1) {return false;}
      }
      return true;
    }
    function getStyle(elem) {
      let result = Object.create(null);
      let specificities = Object.create(null);
      for (let i = 0; i < runtime.styleRules.length; i++) {
        let rule = runtime.styleRules[i];
        if (matchesSelector(elem, rule.selector)) {
          for (let key in rule.css) {
            if (!(specificities[key] > rule.selector.specificity)) {
              result[key] = rule.css[key];
              specificities[key] = rule.selector.specificity;
            }
          }
        }
      }
      return result;
    }

    return { parseStyleAttr, parseSelector, parseStyleSheet, matchesSelector, getStyle };
};
