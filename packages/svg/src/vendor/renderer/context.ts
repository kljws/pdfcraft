import { installColors } from "./css/colors";
import { installStylesheet } from "./css/stylesheet";
import { installBaseElements } from "./elements/base";
import { installContainerElements } from "./elements/containers";
import { installElementFactory } from "./elements/factory";
import { installPaintElements } from "./elements/paint";
import { installShapeElements } from "./elements/shapes";
import { installTextElements } from "./elements/text";
import { installGeometry } from "./geometry/matrix";
import { installPath } from "./geometry/path";
import { installStringParser } from "./parsing/string-parser";
import { installPdfKitBridge } from "./pdfkit/bridge";
import type { SvgRendererInstaller, SvgRendererRuntime } from "./runtime.types";
import { installTextMetrics } from "./text/metrics";
import { installXmlParser } from "./xml/parser";

const installers: SvgRendererInstaller[] = [
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

export const createSvgRenderContext = (
	initialState: SvgRendererRuntime,
): SvgRendererRuntime => {
  const runtime = {...initialState};
  for (const install of installers) {
    Object.assign(runtime, install(runtime));
  }
  return runtime;
};
