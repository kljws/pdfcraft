declare module "linebreak" {
	interface LineBreak {
		position: number;
		required: boolean;
	}

	class LineBreaker {
		constructor(text: string);
		nextBreak(): LineBreak | null;
	}

	export default LineBreaker;
}
