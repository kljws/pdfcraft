import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const architectureDocument = resolve(sourceRoot, "../ARCHITECTURE.md");

/**
 * Module categories and dependency rules from packages/core/ARCHITECTURE.md ("Module categories",
 * "Dependency rules"). Orchestration is listed file by file; every other file outside `features/`
 * and `composition/` is a shared service.
 */
const orchestrationFiles = new Set([
	"index.ts",
	"adapter.ts",
	"layout/layout-builder.ts",
	"rendering/renderer.ts",
]);

type Category =
	| { kind: "feature"; feature: string }
	| { kind: "composition" | "orchestration" | "shared" };

type RemovalStep = 2 | 3 | 4 | 5 | 6;

/**
 * Imports that break a dependency rule and are removed by a later refactoring step. Each entry is
 * also listed in ARCHITECTURE.md ("Known import exceptions"). The test fails when an entry no
 * longer matches an import, so removing the import requires removing its entry.
 */
const allowedViolations: ReadonlyArray<{
	source: string;
	target: string;
	reason: string;
	removalStep: RemovalStep;
}> = [
	{
		source: "features/attachment/attachment-resources.ts",
		target: "core/printer.types.ts",
		reason: "resource types are declared by orchestration",
		removalStep: 6,
	},
	{
		source: "features/attachment/attachment.feature.ts",
		target: "core/printer.types.ts",
		reason: "resource types are declared by orchestration",
		removalStep: 6,
	},
	{
		source: "services/resources/resource-reference.ts",
		target: "core/printer.types.ts",
		reason: "resource types are declared by orchestration",
		removalStep: 6,
	},
	{
		source: "composition/built-in-printer-resources.ts",
		target: "core/printer.types.ts",
		reason: "resource types are declared by orchestration",
		removalStep: 6,
	},
];

/**
 * Shared node-state fields used by a single feature, removed by a later refactoring step. Each
 * entry is also listed in ARCHITECTURE.md ("Known shared-state exceptions").
 */
const allowedFeatureOwnedFields: ReadonlyArray<{
	field: string;
	owner: string;
	reason: string;
	removalStep: RemovalStep;
}> = [
	{
		field: "cell",
		owner: "features/table",
		reason: "row layout records the aligned cell on the vertical-alignment box",
		removalStep: 2,
	},
	{
		field: "nodeHeight",
		owner: "features/table",
		reason: "row layout records the aligned content height on the vertical-alignment box",
		removalStep: 2,
	},
	{
		field: "nodeInfo",
		owner: "features/repeatables",
		reason: "pageBreakBefore stores the node information it builds on the layout node",
		removalStep: 6,
	},
];

/** ESTree node produced by oxc-parser, read structurally. */
type AstNode = { type: string } & Record<string, unknown>;

const isAstNode = (value: unknown): value is AstNode =>
	typeof value === "object" && value !== null && typeof (value as AstNode).type === "string";

/**
 * Parses a TypeScript source and calls `visit` for every syntax node. Comments, string contents and
 * literal template text are not nodes; expressions inside `${…}` are.
 */
function walkSource(source: string, visit: (node: AstNode) => void): void {
	const { program, errors } = parseSync("source.ts", source, { lang: "ts", sourceType: "module" });
	if (errors.length > 0) {
		throw new Error(`Cannot parse source: ${errors.map((error) => error.message).join("; ")}`);
	}
	const walk = (value: unknown): void => {
		if (Array.isArray(value)) {
			for (const item of value) walk(item);
			return;
		}
		if (!isAstNode(value)) return;
		visit(value);
		for (const child of Object.values(value)) {
			if (typeof child === "object" && child !== null) walk(child);
		}
	};
	walk(program);
}

/** Value of a string literal node, or `undefined` for any other node. */
const stringValue = (node: unknown): string | undefined =>
	isAstNode(node) && node.type === "Literal" && typeof node.value === "string"
		? node.value
		: undefined;

/** Name of a non-computed identifier key, or the value of a string-literal key. */
const keyName = (key: unknown, computed: unknown): string | undefined => {
	if (isAstNode(key) && key.type === "Identifier" && !computed) return key.name as string;
	return stringValue(key);
};

/**
 * Module specifiers referenced by a source: runtime and type-only imports, re-exports, side-effect
 * and dynamic imports, `import("…")` type queries, `require` calls, `import x = require(…)` and
 * module augmentations.
 */
function moduleSpecifiers(source: string): string[] {
	const specifiers = new Set<string>();
	walkSource(source, (node) => {
		let specifier: string | undefined;
		switch (node.type) {
			case "ImportDeclaration":
			case "ExportAllDeclaration":
			case "ExportNamedDeclaration":
			case "ImportExpression":
			case "TSImportType":
				specifier = stringValue(node.source);
				break;
			case "TSExternalModuleReference":
				specifier = stringValue(node.expression);
				break;
			case "TSModuleDeclaration":
				specifier = stringValue(node.id);
				break;
			case "CallExpression": {
				const callee = node.callee;
				const [argument] = node.arguments as unknown[];
				if (isAstNode(callee) && callee.type === "Identifier" && callee.name === "require") {
					specifier = stringValue(argument);
				}
				break;
			}
		}
		if (specifier !== undefined) specifiers.add(specifier);
	});
	return [...specifiers];
}

const relativeSpecifiers = (source: string): string[] =>
	moduleSpecifiers(source).filter((specifier) => specifier.startsWith("."));

/**
 * Names a source uses as properties: member accesses (dotted or with a string index), object keys
 * including shorthand and destructured properties, type members and class members, string-literal
 * indexed access types and `"name" in` tests. Variables, parameters and arguments do not count.
 */
function listPropertyNames(source: string): Set<string> {
	const names = new Set<string>();
	const add = (name: string | undefined): void => {
		if (name !== undefined) names.add(name);
	};
	walkSource(source, (node) => {
		switch (node.type) {
			case "MemberExpression":
				add(keyName(node.property, node.computed));
				break;
			case "Property":
			case "PropertyDefinition":
			case "MethodDefinition":
			case "AccessorProperty":
			case "TSPropertySignature":
			case "TSMethodSignature":
				add(keyName(node.key, node.computed));
				break;
			case "TSIndexedAccessType":
				if (isAstNode(node.indexType) && node.indexType.type === "TSLiteralType") {
					add(stringValue(node.indexType.literal));
				}
				break;
			case "BinaryExpression":
				if (node.operator === "in") add(stringValue(node.left));
				break;
		}
	});
	return names;
}

/** Members of the object type declared as `type Name = { … }` or `interface Name { … }`. */
function listDeclaredMembers(source: string, name: string): string[] | undefined {
	let members: string[] | undefined;
	walkSource(source, (node) => {
		const id = node.id;
		if (members !== undefined || !isAstNode(id) || id.name !== name) return;
		let body: unknown;
		if (node.type === "TSTypeAliasDeclaration") {
			const annotation = node.typeAnnotation;
			if (isAstNode(annotation) && annotation.type === "TSTypeLiteral") body = annotation.members;
		} else if (node.type === "TSInterfaceDeclaration") {
			body = isAstNode(node.body) ? node.body.body : undefined;
		}
		if (!Array.isArray(body)) return;
		members = body.flatMap((member: unknown) => {
			if (!isAstNode(member)) return [];
			if (member.type !== "TSPropertySignature" && member.type !== "TSMethodSignature") return [];
			const key = keyName(member.key, member.computed);
			return key === undefined ? [] : [key];
		});
	});
	return members;
}

function categoryOf(file: string): Category {
	const [layer, feature] = file.split("/");
	if (layer === "features" && feature && file !== `features/${feature}`) {
		return { kind: "feature", feature };
	}
	if (layer === "composition") return { kind: "composition" };
	if (layer === "core" || orchestrationFiles.has(file)) return { kind: "orchestration" };
	return { kind: "shared" };
}

function describeCategory(category: Category): string {
	return category.kind === "feature" ? `feature '${category.feature}'` : category.kind;
}

/** Why `source` may not import `target`, or `null` when the dependency is allowed. */
function brokenRule(source: Category, target: Category): string | null {
	switch (source.kind) {
		case "feature":
			if (target.kind === "feature" && target.feature !== source.feature) return "rule 1";
			return target.kind === "composition" || target.kind === "orchestration" ? "rule 1" : null;
		case "shared":
			return target.kind === "shared" ? null : "rule 2";
		case "composition":
			return target.kind === "orchestration" ? "rule 3" : null;
		case "orchestration":
			return target.kind === "feature" ? "rule 4" : null;
	}
}

function listSourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "__tests__" || entry.name === "node_modules"
				? []
				: listSourceFiles(path);
		}
		return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [path] : [];
	});
}

function resolveSource(fromFile: string, specifier: string): string {
	const base = resolve(dirname(fromFile), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}.d.ts`, resolve(base, "index.ts")]) {
		if (candidate.endsWith(".ts") && existsSync(candidate)) return relative(sourceRoot, candidate);
	}
	throw new Error(`Cannot resolve ${specifier} from ${relative(sourceRoot, fromFile)}`);
}

function readSource(file: string): string {
	return readFileSync(file, "utf8");
}

/** Parses every production file, reporting the file that cannot be parsed. */
function inspectSourceFile<T>(file: string, inspect: (source: string) => T): T {
	try {
		return inspect(readSource(file));
	} catch (error) {
		throw new Error(`${relative(sourceRoot, file)}: ${(error as Error).message}`, { cause: error });
	}
}

function findViolations(): string[] {
	const violations = new Set<string>();
	for (const file of listSourceFiles(sourceRoot)) {
		const source = relative(sourceRoot, file);
		const sourceCategory = categoryOf(source);
		for (const specifier of inspectSourceFile(file, relativeSpecifiers)) {
			const target = resolveSource(file, specifier);
			const targetCategory = categoryOf(target);
			const rule = brokenRule(sourceCategory, targetCategory);
			if (rule) {
				const from = describeCategory(sourceCategory);
				const to = describeCategory(targetCategory);
				violations.add(`${source} -> ${target} (${rule}: ${from} imports ${to})`);
			}
		}
	}
	return [...violations].sort();
}

const violationKey = ({ source, target }: { source: string; target: string }): string =>
	`${source} -> ${target}`;

const fieldKey = ({ field, owner }: { field: string; owner: string }): string =>
	`${field} (${owner})`;

const sharedNodeState = ["PreprocessedNodeState", "MeasuredNodeState", "LayoutNodeState"];

function listSharedNodeStateFields(): Map<string, string[] | undefined> {
	const source = readSource(join(sourceRoot, "types/document.types.ts"));
	return new Map(sharedNodeState.map((name) => [name, listDeclaredMembers(source, name)]));
}

/** Owner of a source file: its feature for feature code, otherwise its top-level layer. */
function ownerOf(file: string): string {
	const [layer, feature] = relative(sourceRoot, file).split("/");
	return layer === "features" ? `features/${feature}` : layer;
}

function findFeatureOwnedSharedFields(): string[] {
	const sources = listSourceFiles(sourceRoot)
		.filter((file) => ownerOf(file) !== "types")
		.map((file) => ({
			owner: ownerOf(file),
			names: inspectSourceFile(file, listPropertyNames),
		}));
	const fields = [...listSharedNodeStateFields().values()].flatMap((members) => members ?? []);
	return fields.flatMap((field) => {
		const owners = new Set(
			sources.filter(({ names }) => names.has(field)).map(({ owner }) => owner),
		);
		const [owner] = owners;
		return owners.size === 1 && owner?.startsWith("features/") ? [fieldKey({ field, owner })] : [];
	});
}

/** List items of ARCHITECTURE.md, each joined on one line. */
function listDocumentItems(): string[] {
	return readFileSync(architectureDocument, "utf8")
		.split(/\n(?=- |\n)/)
		.map((item) => item.replace(/\s+/g, " "));
}

describe("core architecture", () => {
	const violations = findViolations();
	const violationKeys = new Set(violations.map((violation) => violation.split(" (")[0]));
	const featureOwnedFields = findFeatureOwnedSharedFields();

	it("allows no dependency that breaks a rule outside the known exceptions", () => {
		const allowed = new Set(allowedViolations.map(violationKey));
		expect(violations.filter((violation) => !allowed.has(violation.split(" (")[0]))).toEqual([]);
	});

	it("keeps no obsolete or duplicated import exception", () => {
		const keys = allowedViolations.map(violationKey);
		expect(keys.filter((key) => !violationKeys.has(key))).toEqual([]);
		expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
	});

	it("finds the fields of every shared node-state declaration", () => {
		const fields = listSharedNodeStateFields();
		for (const name of sharedNodeState) {
			expect(fields.get(name), name).toEqual(expect.arrayContaining([expect.any(String)]));
		}
	});

	it("keeps shared node state free of fields owned by a single feature", () => {
		const allowed = new Set(allowedFeatureOwnedFields.map(fieldKey));
		expect(featureOwnedFields.filter((field) => !allowed.has(field))).toEqual([]);
	});

	it("keeps no obsolete or duplicated shared-state exception", () => {
		const keys = allowedFeatureOwnedFields.map(fieldKey);
		expect(keys.filter((key) => !featureOwnedFields.includes(key))).toEqual([]);
		expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
	});

	it("documents every known exception in ARCHITECTURE.md", () => {
		// One list item per exception: "- `source` → `target`: reason. Removed in step N." for an
		// import, "- `field` (`owner`): reason. Removed in step N." for shared node state.
		const items = listDocumentItems();
		const isDocumented = (prefix: string, removalStep: RemovalStep): boolean =>
			items.some(
				(item) => item.startsWith(prefix) && item.includes(`Removed in step ${removalStep}.`),
			);
		expect(
			allowedViolations
				.filter(({ source, target, removalStep }) => {
					return !isDocumented(`- \`${source}\` → \`${target}\`:`, removalStep);
				})
				.map(violationKey),
		).toEqual([]);
		expect(
			allowedFeatureOwnedFields
				.filter(({ field, owner, removalStep }) => {
					return !isDocumented(`- \`${field}\` (\`${owner}\`):`, removalStep);
				})
				.map(({ field }) => field),
		).toEqual([]);
	});

	it("recognizes every kind of module reference", () => {
		expect(
			relativeSpecifiers(`
				import type { A } from "./type-only";
				import { type B, C } from "./mixed";
				import {
					D,
				} from "./multiline";
				export { E } from "./re-export";
				export type { F } from "./type-re-export";
				export * from "./star";
				import "./side-effect";
				type G = import("./type-query").G;
				const lazy = () => import("./dynamic");
				const legacy = require("./required");
				import equals = require("./import-equals");
				const ratio = total / count; import "./after-division";
				const next = count++ / divisor; import "./after-increment";
				const asserted = value! / divisor; import "./after-non-null";
				const template = \`\${await import("./in-template-expression")}\`;
				declare module "./augmented" {}
				import external from "external";
			`).sort(),
		).toEqual(
			[
				"./type-only",
				"./mixed",
				"./multiline",
				"./re-export",
				"./type-re-export",
				"./star",
				"./side-effect",
				"./type-query",
				"./dynamic",
				"./required",
				"./import-equals",
				"./after-division",
				"./after-increment",
				"./after-non-null",
				"./in-template-expression",
				"./augmented",
			].sort(),
		);
	});

	it("ignores import-like text that is not a module reference", () => {
		expect(
			relativeSpecifiers(`
				// import commented from "./line-comment";
				/* import blocked from "./block-comment"; */
				run(); // import trailing from "./trailing-comment";
				const message = "import quoted from './in-string'";
				const single = 'export * from "./in-single-quotes"';
				const template = \`import("./in-template-text") \${value} from "./after-expression"\`;
				const pattern = /from "\\.\\/in-regex"/;
				const copy = Array.from("./array-from");
				const loader = { import: "./object-key", from: "./other-key" };
				loader.import("./member-call");
				loader.require("./member-require");
			`),
		).toEqual([]);
	});

	it("finds declared members syntactically", () => {
		expect(
			listDeclaredMembers(
				`export type State<Node = Pdf> = {
					first?: Node | undefined;
					// commented?: number;
					second: (value: { nested: number }) => void;
					third?: { inner: string } | undefined;
					method(argument: string): void;
				};
				interface Other { fourth: string }`,
				"State",
			),
		).toEqual(["first", "second", "third", "method"]);
		expect(listDeclaredMembers("interface Other { fourth: string }", "Other")).toEqual(["fourth"]);
		expect(listDeclaredMembers("type Missing = string;", "Absent")).toBeUndefined();
	});

	it("counts property uses but not variables, parameters or arguments", () => {
		const names = listPropertyNames(`
			node.access; node?.optional; ({ key: 1, shorthand }); type T = { member?: number };
			const { destructured = 0 } = node; node["indexed"]; "tested" in node;
			type Picked = Node["indexedType"]; class Box { field = 1; method() {} }
			const text = \`\${node.inTemplateExpression}\`;
			const typedLocal: number = 10;
			function measure(parameter: unknown, { destructuredParameter }: Node) {}
			const arrow = (arrowParameter: number) => arrowParameter;
			call(firstArgument, secondArgument, thirdArgument);
			const ternary = condition ? whenTrue : whenFalse; spread(...rest);
			const label = \`templateText.ignored\`; // comment.ignored
			const quoted = "string.ignored";
		`);
		expect([...names].sort()).toEqual(
			[
				"access",
				"destructured",
				"destructuredParameter",
				"field",
				"inTemplateExpression",
				"indexed",
				"indexedType",
				"key",
				"member",
				"method",
				"optional",
				"shorthand",
				"tested",
			].sort(),
		);
	});

	it("classifies modules and applies the dependency rules", () => {
		const table = categoryOf("features/table/table.feature.ts");
		const text = categoryOf("features/text/text.types.ts");
		expect(brokenRule(table, text)).toBe("rule 1");
		expect(brokenRule(table, categoryOf("features/table/layout-row.ts"))).toBeNull();
		expect(brokenRule(table, categoryOf("composition/built-in-layout.ts"))).toBe("rule 1");
		expect(brokenRule(table, categoryOf("core/printer.types.ts"))).toBe("rule 1");
		expect(brokenRule(table, categoryOf("layout/element-writer.page.ts"))).toBeNull();
		expect(brokenRule(categoryOf("layout/line.ts"), table)).toBe("rule 2");
		expect(brokenRule(categoryOf("layout/line.ts"), categoryOf("layout/layout-builder.ts"))).toBe(
			"rule 2",
		);
		const composition = categoryOf("composition/built-in-layout.ts");
		expect(brokenRule(composition, table)).toBeNull();
		expect(brokenRule(composition, categoryOf("composition/built-in-rendering.ts"))).toBeNull();
		expect(brokenRule(composition, categoryOf("index.ts"))).toBe("rule 3");
		const renderer = categoryOf("rendering/renderer.ts");
		expect(brokenRule(renderer, table)).toBe("rule 4");
		expect(brokenRule(renderer, categoryOf("composition/built-in-rendering.ts"))).toBeNull();
		expect(brokenRule(renderer, categoryOf("core/printer.ts"))).toBeNull();
	});
});
