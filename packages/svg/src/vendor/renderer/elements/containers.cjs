module.exports = function installContainerElements(runtime) {
    var SvgElemUse = function(obj, inherits) {
      runtime.SvgElemContainer.call(this, obj, inherits);
      let x = this.getLength('x', this.getVWidth(), 0),
          y = this.getLength('y', this.getVHeight(), 0),
          child = this.getUrl('href') || this.getUrl('xlink:href');
      if (child) {child = runtime.createSVGElement(child, this);}
      this.getChildren  = function() {
        return child ? [child] : [];
      };
      this.drawInDocument = function(isClip, isMask) {
        runtime.doc.save();
        this.drawContent(isClip, isMask);
        runtime.doc.restore();
      };
      this.getTransformation = function() {
        return runtime.multiplyMatrix(this.get('transform'), [1, 0, 0, 1, x, y]);
      };
    };

    var SvgElemSymbol = function(obj, inherits) {
      runtime.SvgElemContainer.call(this, obj, inherits);
      let width = this.getLength('width', this.getParentVWidth(), this.getParentVWidth()),
          height = this.getLength('height', this.getParentVHeight(), this.getParentVHeight());
      if (inherits instanceof SvgElemUse) {
        width = inherits.getLength('width', inherits.getParentVWidth(), width);
        height = inherits.getLength('height', inherits.getParentVHeight(), height);
      }
      let aspectRatio = (this.attr('preserveAspectRatio') || '').trim(),
          viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
      this.getVWidth = function() {
        return viewBox[2];
      };
      this.getVHeight = function() {
        return viewBox[3];
      };
      this.drawInDocument = function(isClip, isMask) {
        runtime.doc.save();
        this.drawContent(isClip, isMask);
        runtime.doc.restore();
      };
      this.getTransformation = function() {
        return runtime.multiplyMatrix(runtime.parseAspectRatio(aspectRatio, width, height, viewBox[2], viewBox[3]), [1, 0, 0, 1, -viewBox[0], -viewBox[1]]);
      };
    };

    var SvgElemGroup = function(obj, inherits) {
      runtime.SvgElemContainer.call(this, obj, inherits);
      this.drawInDocument = function(isClip, isMask) {
        runtime.doc.save();
        if (this.link && !isClip && !isMask) {this.addLink();}
        this.drawContent(isClip, isMask);
        runtime.doc.restore();
      };
      this.getTransformation = function() {
        return this.get('transform');
      };
    };

    var SvgElemLink = function(obj, inherits) {
      if (inherits && inherits.isText) {
        runtime.SvgElemTspan.call(this, obj, inherits);
        this.allowedChildren = ['textPath', 'tspan', '#text', '#cdata-section', 'a'];
      } else {
        SvgElemGroup.call(this, obj, inherits);
      }
      this.link = this.attr('href') || this.attr('xlink:href');
      this.addLink = function() {
        if (this.link.match(/^(?:[a-z][a-z0-9+.-]*:|\/\/)?/i) && this.getChildren().length) {
          let bbox = this.getBoundingShape().transform(runtime.getGlobalMatrix()).getBoundingBox();
          runtime.docInsertLink(bbox[0], bbox[1], bbox[2], bbox[3], this.link);
        }
      }
    };

    var SvgElemSvg = function(obj, inherits) {
      runtime.SvgElemContainer.call(this, obj, inherits);
      let width = this.getLength('width', this.getParentVWidth(), this.getParentVWidth()),
          height = this.getLength('height', this.getParentVHeight(), this.getParentVHeight()),
          x = this.getLength('x', this.getParentVWidth(), 0),
          y = this.getLength('y', this.getParentVHeight(), 0);
      if (inherits instanceof SvgElemUse) {
        width = inherits.getLength('width', inherits.getParentVWidth(), width);
        height = inherits.getLength('height', inherits.getParentVHeight(), height);
      }
      let aspectRatio = this.attr('preserveAspectRatio'),
          viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
      if (this.isOuterElement && runtime.preserveAspectRatio) {
        x = y = 0;
        width = runtime.viewportWidth;
        height = runtime.viewportHeight;
        aspectRatio = runtime.preserveAspectRatio;
      }
      this.getVWidth = function() {
        return viewBox[2];
      };
      this.getVHeight = function() {
        return viewBox[3];
      };
      this.drawInDocument = function(isClip, isMask) {
        runtime.doc.save();
        if (this.get('overflow') === 'hidden') {
          new runtime.SvgShape().M(x, y).L(x + width, y).L(x + width, y + height).L(x, y + height).Z()
                        .transform(this.get('transform'))
                        .insertInDocument();
          runtime.doc.clip();
        }
        this.drawContent(isClip, isMask);
        runtime.doc.restore();
      };
      this.getTransformation = function() {
        return runtime.multiplyMatrix(
          this.get('transform'),
          [1, 0, 0, 1, x, y],
          runtime.parseAspectRatio(aspectRatio, width, height, viewBox[2], viewBox[3]),
          [1, 0, 0, 1, -viewBox[0], -viewBox[1]]
        );
      };
    };

    var SVGElemImage = function(obj, inherits) {
      runtime.SvgElemStylable.call(this, obj, inherits);
      let link = runtime.imageCallback(this.attr('href') || this.attr('xlink:href') || ''),
          x = this.getLength('x', this.getVWidth(), 0),
          y = this.getLength('y', this.getVHeight(), 0),
          width = this.getLength('width', this.getVWidth(), 'auto'),
          height = this.getLength('height', this.getVHeight(), 'auto'),
          image;
      try {
        image = runtime.doc.openImage(link);
      } catch(e) {
        runtime.warningCallback('SVGElemImage: failed to open image "' + link + '" in PDFKit');
      }
      if (image) {
        if (width === 'auto' && height !== 'auto') {
          width = height * image.width / image.height;
        } else if (height === 'auto' && width !== 'auto') {
          height = width * image.height / image.width;
        } else if (width === 'auto' && height === 'auto') {
          width = image.width;
          height = image.height;
        }
      }
      if (width === 'auto' || width < 0) {width = 0;}
      if (height === 'auto' || height < 0) {height = 0;}
      this.getTransformation = function() {
        return this.get('transform');
      };
      this.getBoundingShape = function() {
        return new runtime.SvgShape().M(x, y).L(x + width, y).M(x + width, y + height).L(x, y + height);
      };
      this.drawInDocument = function(isClip, isMask) {
        if (this.get('visibility') === 'hidden' || !image) {return;}
        runtime.doc.save();
        this.transform();
        if (this.get('overflow') === 'hidden') {
          runtime.doc.rect(x, y, width, height).clip();
        }
        this.clip();
        this.mask();
        runtime.doc.translate(x, y);
        runtime.doc.transform.apply(runtime.doc, runtime.parseAspectRatio(this.attr('preserveAspectRatio'), width, height, image ? image.width : width, image ? image.height : height));
        if (!isClip) {
          runtime.doc.fillOpacity(this.get('opacity'));
          runtime.doc.image(image, 0, 0);
        } else {
          runtime.doc.rect(0, 0, image.width, image.height);
          runtime.docFillColor(runtime.DefaultColors.white).fill();
        }
        runtime.doc.restore();
      };
    };


    return { SvgElemUse, SvgElemSymbol, SvgElemGroup, SvgElemLink, SvgElemSvg, SVGElemImage };
};
