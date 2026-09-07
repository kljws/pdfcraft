import { describe, expect, it, vi } from "vitest";

import EventEmitter from "../event-emitter";

interface Events {
	change: [value: number];
}

describe("EventEmitter", () => {
	it("emits typed arguments and removes listeners", () => {
		const emitter = new EventEmitter<Events>();
		const listener = vi.fn<(value: number) => void>();
		emitter.on("change", listener);

		expect(emitter.emit("change", 42)).toBe(true);
		expect(listener).toHaveBeenCalledWith(42);

		emitter.removeListener("change", listener);
		expect(emitter.emit("change", 7)).toBe(false);
	});
});
