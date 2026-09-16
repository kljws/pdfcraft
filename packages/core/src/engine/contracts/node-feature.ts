export interface NodeFeatureStages {
	preprocessedNode: unknown;
	measuredNode: unknown;
	layoutNode: unknown;
	renderNode: unknown;
	preprocessContext: unknown;
	measureContext: unknown;
	layoutContext: unknown;
	renderContext: unknown;
}

export interface NodeFeature<Stages extends NodeFeatureStages> {
	readonly kind: string;
	matches(node: Stages["preprocessedNode"]): boolean;
	preprocess(
		node: Stages["preprocessedNode"],
		context: Stages["preprocessContext"],
	): Stages["preprocessedNode"];
	measure(node: Stages["measuredNode"], context: Stages["measureContext"]): Stages["measuredNode"];
	layout?(node: Stages["layoutNode"], context: Stages["layoutContext"]): void;
	render?(node: Stages["renderNode"], context: Stages["renderContext"]): void;
}
