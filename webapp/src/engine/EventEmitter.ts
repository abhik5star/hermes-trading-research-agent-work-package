// Minimal typed event bus — keeps the engine decoupled from React.
export type Listener<T = unknown> = (payload: T) => void;

export class Emitter<Events extends object> {
  private map = new Map<keyof Events, Set<Listener>>();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(fn as Listener);
    return () => this.off(event, fn);
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): void {
    this.map.get(event)?.delete(fn as Listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.map.get(event)?.forEach((fn) => {
      try {
        (fn as Listener<Events[K]>)(payload);
      } catch (err) {
        console.error(`[emitter:${String(event)}]`, err);
      }
    });
  }
}
