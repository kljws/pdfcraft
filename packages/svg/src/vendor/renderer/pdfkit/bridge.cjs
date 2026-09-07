module.exports = function installPdfKitBridge(runtime) {
    function docBeginGroup(bbox) {
      let group = new (function PDFGroup() {})();
      group.name = 'G' + (runtime.doc._groupCount = (runtime.doc._groupCount || 0) + 1);
      group.resources = runtime.doc.ref();
      group.xobj = runtime.doc.ref({
        Type: 'XObject',
        Subtype: 'Form',
        FormType: 1,
        BBox: bbox,
        Group: {S: 'Transparency', CS: 'DeviceRGB', I: true, K: false},
        Resources: group.resources
      });
      group.xobj.write('');
      group.savedMatrix = runtime.doc._ctm;
      group.savedPage = runtime.doc.page;
      runtime.groupStack.push(group);
      runtime.doc._ctm = [1, 0, 0, 1, 0, 0];
      runtime.doc.page = {
        width: runtime.doc.page.width, height: runtime.doc.page.height,
        write: function(data) {group.xobj.write(data);},
        fonts: {}, xobjects: {}, ext_gstates: {}, patterns: {}
      };
      return group;
    }
    function docEndGroup(group) {
      if (group !== runtime.groupStack.pop()) {throw('Group not matching');}
      if (Object.keys(runtime.doc.page.fonts).length) {group.resources.data.Font = runtime.doc.page.fonts;}
      if (Object.keys(runtime.doc.page.xobjects).length) {group.resources.data.XObject = runtime.doc.page.xobjects;}
      if (Object.keys(runtime.doc.page.ext_gstates).length) {group.resources.data.ExtGState = runtime.doc.page.ext_gstates;}
      if (Object.keys(runtime.doc.page.patterns).length) {group.resources.data.Pattern = runtime.doc.page.patterns;}
      group.resources.end();
      group.xobj.end();
      runtime.doc._ctm = group.savedMatrix;
      runtime.doc.page = group.savedPage;
    }
    function docInsertGroup(group) {
      runtime.doc.page.xobjects[group.name] = group.xobj;
      runtime.doc.addContent('/' + group.name + ' Do');
    }
    function docApplyMask(group, clip) {
      let name = 'M' + (runtime.doc._maskCount = (runtime.doc._maskCount || 0) + 1);
      let gstate = runtime.doc.ref({
        Type: 'ExtGState', CA: 1, ca: 1, BM: 'Normal',
        SMask: {S: 'Luminosity', G: group.xobj, BC: (clip ? [0, 0, 0] : [1, 1, 1])}
      });
      gstate.end();
      runtime.doc.page.ext_gstates[name] = gstate;
      runtime.doc.addContent('/' + name + ' gs');
    }
    function docCreatePattern(group, dx, dy, matrix) {
      let pattern = new (function PDFPattern() {})();
      pattern.group = group;
      pattern.dx = dx;
      pattern.dy = dy;
      pattern.matrix = matrix || [1, 0, 0, 1, 0, 0];
      return pattern;
    }
    function docUsePattern(pattern, stroke) {
      let name = 'P' + (runtime.doc._patternCount = (runtime.doc._patternCount || 0) + 1);
      let ref = runtime.doc.ref({
        Type: 'Pattern', PatternType: 1, PaintType: 1, TilingType: 2,
        BBox: [0, 0, pattern.dx, pattern.dy], XStep: pattern.dx, YStep: pattern.dy,
        Matrix: runtime.multiplyMatrix(runtime.doc._ctm, pattern.matrix),
        Resources: {
          ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
          XObject: (function() {let temp = {}; temp[pattern.group.name] = pattern.group.xobj; return temp;})()
        }
      });
      ref.write('/' + pattern.group.name + ' Do');
      ref.end();
      runtime.doc.page.patterns[name] = ref;
      if (stroke) {
        runtime.doc.addContent('/Pattern CS');
        runtime.doc.addContent('/' + name + ' SCN');
      } else {
        runtime.doc.addContent('/Pattern cs');
        runtime.doc.addContent('/' + name + ' scn');
      }
    }
    function docBeginText(font, size) {
      if (!runtime.doc.page.fonts[font.id]) {runtime.doc.page.fonts[font.id] = font.ref();}
      runtime.doc.addContent('BT').addContent('/' + font.id + ' ' + size + ' Tf');
    }
    function docSetTextMatrix(a, b, c, d, e, f) {
      runtime.doc.addContent(runtime.validateNumber(a) + ' ' + runtime.validateNumber(b) + ' ' + runtime.validateNumber(-c) + ' '  + runtime.validateNumber(-d) + ' ' + runtime.validateNumber(e) + ' ' + runtime.validateNumber(f) + ' Tm');
    }
    function docSetTextMode(fill, stroke) {
      let mode = fill && stroke ? 2 : stroke ? 1 : fill ? 0 : 3;
      runtime.doc.addContent(mode + ' Tr');
    }
    function docWriteGlyph(glyph) {
      runtime.doc.addContent('<' + glyph + '> Tj');
    }
    function docEndText() {
      runtime.doc.addContent('ET');
    }
    function docFillColor(color) {
      if (color[0].constructor.name === 'PDFPattern') {
        runtime.doc.fillOpacity(color[1]);
        docUsePattern(color[0], false);
      } else {
        runtime.doc.fillColor(color[0], color[1]);
      }
    }
    function docStrokeColor(color) {
      if (color[0].constructor.name === 'PDFPattern') {
        runtime.doc.strokeOpacity(color[1]);
        docUsePattern(color[0], true);
      } else {
        runtime.doc.strokeColor(color[0], color[1]);
      }
    }
    function docInsertLink(x, y, w, h, url) {
      let ref = runtime.doc.ref({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, y, w, h],
        Border: [0, 0, 0],
        A: {
          S: 'URI',
          URI: new String(url)
        }
      });
      ref.end();
      runtime.links.push(ref);
    }

    return { docBeginGroup, docEndGroup, docInsertGroup, docApplyMask, docCreatePattern, docUsePattern, docBeginText, docSetTextMatrix, docSetTextMode, docWriteGlyph, docEndText, docFillColor, docStrokeColor, docInsertLink };
};
