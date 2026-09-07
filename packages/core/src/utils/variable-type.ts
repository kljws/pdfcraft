export function isString(variable: unknown): variable is string {
	return typeof variable === "string" || variable instanceof String;
}

export function isNumber(variable: unknown): variable is number {
	return (typeof variable === "number" || variable instanceof Number) && !Number.isNaN(variable);
}

export function isPositiveInteger(variable: unknown): variable is number {
	if (!isNumber(variable) || !Number.isInteger(variable) || variable <= 0) {
		return false;
	}
	return true;
}

export function isObject(variable: unknown): variable is Record<string, unknown> {
	return (
		variable !== null &&
		!Array.isArray(variable) &&
		!isString(variable) &&
		!isNumber(variable) &&
		typeof variable === "object"
	);
}

export function isEmptyObject(variable: unknown): boolean {
	return isObject(variable) && Object.keys(variable).length === 0;
}

export function isValue<T>(variable: T): variable is NonNullable<T> {
	return variable !== undefined && variable !== null;
}
