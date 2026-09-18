type Listener = (pending: boolean) => void;

const listeners = new Set<Listener>();
let pending = false;

export function isAppPending() {
  return pending;
}

export function setAppPending(next: boolean) {
  if (pending === next) return;
  pending = next;
  for (const listener of listeners) listener(pending);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("oma:pending", { detail: pending }));
  }
}

export function subscribeAppPending(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
