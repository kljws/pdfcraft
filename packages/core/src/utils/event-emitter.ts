type EventMap = object;
export type EventKey<Events extends EventMap> = Extract<keyof Events, string | symbol>;
export type EventArgs<
	Events extends EventMap,
	Event extends EventKey<Events>,
> = Events[Event] extends unknown[] ? Events[Event] : never;
export type EventListener<Args extends unknown[]> = (...args: Args) => void;

/**
 * Minimal event emitter used by the layout engine in Node.js and browsers.
 * It intentionally implements only the methods required by PDFCraft.
 */
export default class EventEmitter<Events extends EventMap = Record<string | symbol, unknown[]>> {
	private readonly listeners = new Map<EventKey<Events>, Set<EventListener<unknown[]>>>();

	addListener<Event extends EventKey<Events>>(
		event: Event,
		listener: EventListener<EventArgs<Events, Event>>,
	): this {
		const eventListeners = this.listeners.get(event) ?? new Set<EventListener<unknown[]>>();
		eventListeners.add(listener as EventListener<unknown[]>);
		this.listeners.set(event, eventListeners);
		return this;
	}

	on<Event extends EventKey<Events>>(
		event: Event,
		listener: EventListener<EventArgs<Events, Event>>,
	): this {
		return this.addListener(event, listener);
	}

	removeListener<Event extends EventKey<Events>>(
		event: Event,
		listener: EventListener<EventArgs<Events, Event>>,
	): this {
		const eventListeners = this.listeners.get(event);
		eventListeners?.delete(listener as EventListener<unknown[]>);
		if (eventListeners?.size === 0) {
			this.listeners.delete(event);
		}
		return this;
	}

	emit<Event extends EventKey<Events>>(event: Event, ...args: EventArgs<Events, Event>): boolean {
		const eventListeners = this.listeners.get(event);
		if (!eventListeners?.size) {
			return false;
		}

		for (const listener of [...eventListeners]) {
			listener(...args);
		}
		return true;
	}
}
