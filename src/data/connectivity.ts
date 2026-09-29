import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Whether the app can currently reach the database.
 *
 * Deliberately not only the browser's `navigator.onLine`: that reports the
 * network interface, not whether anything answers on it — a phone on a hotel
 * wifi with no route out reads as online. So the authority is whether the last
 * statement actually reached Turso, and the browser event is used only as an
 * early hint that it is worth trying again.
 */

type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

/** Called by the data layer after every attempt. */
export function reportReachable(reachable: boolean): void {
  if (online === reachable) return;
  online = reachable;
  for (const listener of listeners) listener(reachable);
}

export function isOnline(): boolean {
  return online;
}

export function useOnline(): boolean {
  const [value, setValue] = useState(online);

  useEffect(() => {
    const listener: Listener = setValue;
    listeners.add(listener);
    setValue(online);

    // The browser's events cannot confirm the database is reachable, but
    // "the interface came back" is a good moment to stop assuming it is not.
    let detach: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const up = () => reportReachable(true);
      const down = () => reportReachable(false);
      window.addEventListener('online', up);
      window.addEventListener('offline', down);
      detach = () => {
        window.removeEventListener('online', up);
        window.removeEventListener('offline', down);
      };
    }

    return () => {
      listeners.delete(listener);
      detach?.();
    };
  }, []);

  return value;
}
