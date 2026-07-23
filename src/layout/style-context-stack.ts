import { isObject, isString, isValue } from "../utils/variable-type";
import type { Dictionary, Style } from "../types";
import type { NodeStyleValue } from "../types/internal";

type StyleRecord = Style;
type StyleNode = object;
type StyleOverride = string | object;
const readProperty = (value: object, key: string): unknown =>
	(value as Record<string, unknown>)[key];
type Widen<T> = T extends string
	? string
	: T extends number
		? number
		: T extends boolean
			? boolean
			: T;

/**
 * Used for style inheritance and style overrides
 */
class StyleContextStack {
	styleDictionary: Dictionary<StyleRecord>;
	defaultStyle: StyleRecord;
	styleOverrides: StyleOverride[];

	/**
	 * @param styleDictionary named styles dictionary
	 * @param defaultStyle optional default style definition
	 */
	constructor(
		styleDictionary: Dictionary<StyleRecord> | null = null,
		defaultStyle: StyleRecord = {},
	) {
		this.styleDictionary = styleDictionary ?? {};
		this.defaultStyle = defaultStyle;
		this.styleOverrides = [];
	}

	/**
	 * Creates cloned version of current stack
	 *
	 * @returns current stack snapshot
	 */
	clone(): StyleContextStack {
		let stack = new StyleContextStack(this.styleDictionary, this.defaultStyle);

		this.styleOverrides.forEach((item) => {
			stack.styleOverrides.push(item);
		});

		return stack;
	}

	/**
	 * Pushes style-name or style-overrides-object onto the stack for future evaluation
	 *
	 * @param styleNameOrOverride style-name (referring to styleDictionary) or
	 *                                            a new dictionary defining overriding properties
	 */
	push(styleNameOrOverride: string | object): void {
		this.styleOverrides.push(styleNameOrOverride);
	}

	/**
	 * Removes last style-name or style-overrides-object from the stack
	 *
	 * @param howMany optional number of elements to be popped (if not specified,
	 *                         one element will be removed from the stack)
	 */
	pop(howMany = 1): void {
		while (howMany-- > 0) {
			this.styleOverrides.pop();
		}
	}

	/**
	 * Creates a set of named styles or/and a style-overrides-object based on the item,
	 * pushes those elements onto the stack for future evaluation and returns the number
	 * of elements pushed, so they can be easily popped then.
	 *
	 * @param item - an object with optional style property and/or style overrides
	 * @returns the number of items pushed onto the stack
	 */
	autopush<Node extends StyleNode>(item: Node): number {
		if (isString(item)) {
			return 0;
		}

		const node = item as { style?: NodeStyleValue; section?: unknown };
		if (typeof node.section !== "undefined") {
			// section node not support style overrides
			return 0;
		}

		let styleNames: string[] = [];

		if (node.style) {
			if (Array.isArray(node.style)) {
				styleNames = node.style;
			} else if (isString(node.style)) {
				styleNames = [node.style];
			}
		}

		for (let i = 0, l = styleNames.length; i < l; i++) {
			this.push(styleNames[i]);
		}
		let pushedStyleOverride = 0;
		if (isObject(node.style)) {
			this.push(node.style);
			pushedStyleOverride = 1;
		}

		// rather than spend significant time making a styleOverrideObject, just add item
		this.push(item);
		return styleNames.length + pushedStyleOverride + 1;
	}

	/**
	 * Automatically pushes elements onto the stack, using autopush based on item,
	 * executes callback and then pops elements back. Returns value returned by callback
	 *
	 * @param item - an object with optional style property and/or style overrides
	 * @param callback to be called between autopush and pop
	 * @returns value returned by callback
	 */
	auto<T, Node extends StyleNode>(item: Node, callback: () => T): T {
		let pushedItems = this.autopush(item);
		let result = callback();

		if (pushedItems > 0) {
			this.pop(pushedItems);
		}

		return result;
	}

	/**
	 * Evaluates stack and returns value of a named property
	 *
	 * @param property - property name
	 * @returns property value or null if not found
	 */
	getProperty(property: string): unknown {
		if (this.styleOverrides) {
			for (let i = this.styleOverrides.length - 1; i >= 0; i--) {
				let item = this.styleOverrides[i];

				if (isString(item)) {
					// named-style-override
					let value = this.getStylePropertyFromStyle(item, property, new Set());
					if (isValue(value)) {
						return value;
					}
				} else if (isValue(readProperty(item, property))) {
					// style-overrides-object
					return readProperty(item, property);
				}
			}
		}

		return this.defaultStyle && readProperty(this.defaultStyle, property);
	}

	getPropertyOrDefault<T>(property: string, defaultValue: T): Widen<T> {
		const value = this.getProperty(property);
		return isValue(value) ? (value as Widen<T>) : (defaultValue as Widen<T>);
	}

	private getStylePropertyFromStyle(
		styleName: string,
		property: string,
		visited: Set<string>,
	): unknown {
		if (visited.has(styleName)) {
			return undefined;
		}
		visited.add(styleName);

		const style = this.styleDictionary[styleName];
		if (!style) {
			return undefined;
		}

		const directValue = readProperty(style, property);
		if (isValue(directValue)) {
			return directValue;
		}

		if (style.extends) {
			const parents = Array.isArray(style.extends) ? style.extends : [style.extends];
			for (let i = parents.length - 1; i >= 0; i--) {
				const value = this.getStylePropertyFromStyle(parents[i], property, visited);
				if (isValue(value)) {
					return value;
				}
			}
		}

		return undefined;
	}

	/**
	 * @param item
	 * @param styleContextStack
	 * @param property
	 * @param defaultValue
	 * @returns
	 */
	static getStyleProperty<T, Node extends StyleNode>(
		item: Node,
		styleContextStack: StyleContextStack | null,
		property: string,
		defaultValue: T,
	): Widen<T> {
		let value: unknown;

		const values = item as Record<string, unknown>;
		if (isValue(values[property])) {
			// item defines this property
			return values[property] as Widen<T>;
		}

		if (!styleContextStack) {
			return defaultValue as Widen<T>;
		}

		styleContextStack.auto(item, () => {
			value = styleContextStack.getProperty(property);
		});

		return isValue(value) ? (value as Widen<T>) : (defaultValue as Widen<T>);
	}

	/**
	 * @param source
	 * @param destination
	 * @returns
	 */
	static copyStyle<T extends Record<string, unknown>>(
		source?: object | null,
		destination: T = {} as T,
	): T {
		const values = (source ?? {}) as Record<string, unknown>;
		for (let key in values) {
			if (key !== "text" && Object.hasOwn(values, key)) {
				(destination as Record<string, unknown>)[key] = values[key];
			}
		}

		return destination;
	}
}

export default StyleContextStack;
