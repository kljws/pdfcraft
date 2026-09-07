// @ts-nocheck Legacy SVG-to-PDFKit algorithm; typed at module boundary.
export const installXmlParser = (runtime) => {
    function parseXml(xml) {
      let SvgNode = function(tag, type, value, error) {
        this.error = error;
        this.nodeName = tag;
        this.nodeValue = value;
        this.nodeType = type;
        this.attributes = Object.create(null);
        this.childNodes = [];
        this.parentNode = null;
        this.id = '';
        this.textContent = '';
        this.classList = [];
      };
      SvgNode.prototype.getAttribute = function(attr) {
        return this.attributes[attr] != null ? this.attributes[attr] : null;
      };
      SvgNode.prototype.getElementById = function(id) {
        let result = null;
        (function recursive(node) {
          if (result) {return;}
          if (node.nodeType === 1) {
            if (node.id === id) {result = node;}
            for (let i = 0; i < node.childNodes.length; i++) {
              recursive(node.childNodes[i]);
            }
          }
        })(this);
        return result;
      };
      SvgNode.prototype.getElementsByTagName = function(tag) {
        let result = [];
        (function recursive(node) {
          if (node.nodeType === 1) {
            if (node.nodeName === tag) {result.push(node);}
            for (let i = 0; i < node.childNodes.length; i++) {
              recursive(node.childNodes[i]);
            }
          }
        })(this);
        return result;
      };
      let parser = new runtime.StringParser(xml.trim()), result, child, error = false; 
      let recursive = function() {
        let temp, child;
        if (temp = parser.match(/^<([\w:.-]+)\s*/, true)) { // Opening tag
          let node = new SvgNode(temp[1], 1, null, error);
          while (temp = parser.match(/^([\w:.-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?\s*/, true)) { // Attribute
            let attr = temp[1], value = decodeEntities(temp[2] || temp[3] || '');
            if (!node.attributes[attr]) {
              node.attributes[attr] = value;
              if (attr === 'id') {node.id = value;}
              if (attr === 'class') {node.classList = value.split(' ');}
            } else {
              runtime.warningCallback('parseXml: duplicate attribute "' + attr + '"');
              error = true;
            }
          }
          if (parser.match(/^>/)) { // End of opening tag
            while (child = recursive()) {
              node.childNodes.push(child);
              child.parentNode = node;
              node.textContent += (child.nodeType === 3 || child.nodeType === 4 ? child.nodeValue : child.textContent);
            }
            if (temp = parser.match(/^<\/([\w:.-]+)\s*>/, true)) { // Closing tag
              if (temp[1] === node.nodeName) {
                return node;
              } else {
                runtime.warningCallback('parseXml: tag not matching, opening "' + node.nodeName + '" & closing "' + temp[1] + '"');
                error = true;
                return node;
              }
            } else {
              runtime.warningCallback('parseXml: tag not matching, opening "' + node.nodeName + '" & not closing');
              error = true;
              return node;
            }
          } else if (parser.match(/^\/>/)) { // Self-closing tag
            return node;
          } else {
            runtime.warningCallback('parseXml: tag could not be parsed "' + node.nodeName + '"');
            error = true;
          }
        } else if (temp = parser.match(/^<!--[\s\S]*?-->/)) { // Comment
          return new SvgNode(null, 8, temp, error);
        } else if (temp = parser.match(/^<\?[\s\S]*?\?>/)) { // Processing instructions
          return new SvgNode(null, 7, temp, error);
        } else if (temp = parser.match(/^<!DOCTYPE\s*([\s\S]*?)>/)) { // Doctype
          return new SvgNode(null, 10, temp, error);
        } else if (temp = parser.match(/^<!\[CDATA\[([\s\S]*?)\]\]>/, true)) { // Cdata node
          return new SvgNode('#cdata-section', 4, temp[1], error);
        } else if (temp = parser.match(/^([^<]+)/, true)) { // Text node
          return new SvgNode('#text', 3, decodeEntities(temp[1]), error);
        }
      };
      while (child = recursive()) {
        if (child.nodeType === 1 && !result) {
          result = child;
        } else if (child.nodeType === 1 || (child.nodeType === 3 && child.nodeValue.trim() !== '')) {
          runtime.warningCallback('parseXml: data after document end has been discarded');
        }
      }
      if (parser.matchAll()) {
        runtime.warningCallback('parseXml: parsing error');
      }
      return result;
    };
    function decodeEntities(str) {
      return(str.replace(/&(?:#([0-9]+)|#[xX]([0-9A-Fa-f]+)|([0-9A-Za-z]+));/g, function(mt, m0, m1, m2) {
        if (m0) {return String.fromCharCode(parseInt(m0, 10));}
        else if (m1) {return String.fromCharCode(parseInt(m1, 16));}
        else if (m2 && runtime.Entities[m2]) {return String.fromCharCode(runtime.Entities[m2]);}
        else {return mt;}
      }));
    }

    return { parseXml, decodeEntities };
};
