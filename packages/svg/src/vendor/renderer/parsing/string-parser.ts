type MatchResult = string | RegExpMatchArray | undefined;

export interface StringParser {
	match(expression: RegExp, all?: boolean): MatchResult;
	matchSeparator(): MatchResult;
	matchSpace(): MatchResult;
	matchLengthUnit(): MatchResult;
	matchNumber(): MatchResult;
	matchAll(): MatchResult;
}

export interface StringParserConstructor {
	new (source: string): StringParser;
}

export const StringParser = function (this: StringParser, source: string) {
	let remaining = source;

	this.match = function (expression: RegExp, all?: boolean): MatchResult {
		const result = remaining.match(expression);
		if (!result || result.index !== 0) return undefined;
		remaining = remaining.substring(result[0].length);
		return all ? result : result[0];
	};
	this.matchSeparator = function (): MatchResult {
		return this.match(/^(?:\s*,\s*|\s*|)/);
	};
	this.matchSpace = function (): MatchResult {
		return this.match(/^(?:\s*)/);
	};
	this.matchLengthUnit = function (): MatchResult {
		return this.match(/^(?:px|pt|cm|mm|in|pc|em|ex|%|)/);
	};
	this.matchNumber = function (): MatchResult {
		return this.match(
			/^(?:[-+]?(?:[0-9]+[.][0-9]+|[0-9]+[.]|[.][0-9]+|[0-9]+)(?:[eE][-+]?[0-9]+)?)/,
		);
	};
	this.matchAll = function (): MatchResult {
		return this.match(/^[\s\S]+/);
	};
} as unknown as StringParserConstructor;

export const installStringParser = (): { StringParser: StringParserConstructor } => ({
	StringParser,
});
