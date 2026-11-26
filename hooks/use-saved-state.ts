"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export function readSaved<T>(key: string, accept: (value: unknown) => value is T): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    return accept(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSaved(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useSavedState<T>(key: string, fallback: T, accept: (value: unknown) => value is T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(fallback);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const acceptRef = useRef(accept);
  const fallbackRef = useRef(fallback);
  acceptRef.current = accept;
  fallbackRef.current = fallback;

  useEffect(() => {
    const saved = readSaved(key, acceptRef.current);
    setValue(saved ?? fallbackRef.current);
    setReadyKey(key);
  }, [key]);

  useEffect(() => {
    if (readyKey !== key) return;
    writeSaved(key, value);
  }, [key, readyKey, value]);

  return [value, setValue];
}
