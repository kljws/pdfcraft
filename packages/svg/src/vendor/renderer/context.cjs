const installPdfKitBridge = require("./pdfkit/bridge.cjs");
const installStringParser = require("./parsing/string-parser.cjs");
const installXmlParser = require("./xml/parser.cjs");
const installColors = require("./css/colors.cjs");
const installGeometry = require("./geometry/matrix.cjs");
const installStylesheet = require("./css/stylesheet.cjs");
const installTextMetrics = require("./text/metrics.cjs");
const installPath = require("./geometry/path.cjs");
const installBaseElements = require("./elements/base.cjs");
const installContainerElements = require("./elements/containers.cjs");
const installShapeElements = require("./elements/shapes.cjs");
const installPaintElements = require("./elements/paint.cjs");
const installTextElements = require("./elements/text.cjs");
const installElementFactory = require("./elements/factory.cjs");

const installers = [
  installPdfKitBridge,
  installStringParser,
  installXmlParser,
  installColors,
  installGeometry,
  installStylesheet,
  installTextMetrics,
  installPath,
  installBaseElements,
  installContainerElements,
  installShapeElements,
  installPaintElements,
  installTextElements,
  installElementFactory
];

module.exports = function createSvgRenderContext(initialState) {
  const runtime = {...initialState};
  for (const install of installers) {
    Object.assign(runtime, install(runtime));
  }
  return runtime;
};
