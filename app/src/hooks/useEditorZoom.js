import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "easytex.zoom";
export const MIN_ZOOM = 11;
export const MAX_ZOOM = 24;
export const DEFAULT_ZOOM = 14.5;

// A touch screen zooms the page when a field with small text takes the
// focus, so the smallest size is larger there.
export function minimumZoom() {
  try {
    return window.matchMedia?.("(pointer: coarse)")?.matches ? 16 : MIN_ZOOM;
  } catch {
    return MIN_ZOOM;
  }
}

function readZoom() {
  const floor = minimumZoom();
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored >= floor && stored <= MAX_ZOOM) {
      return stored;
    }
  } catch {
    // Storage may be unavailable; the default size is used instead.
  }
  return Math.max(DEFAULT_ZOOM, floor);
}

// The size of the source text. The editor and its highlight layer share the
// same font size, so the code stays aligned at every size.
export function useEditorZoom() {
  const [zoom, setZoom] = useState(readZoom);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(zoom));
    } catch {
      // Storage may be unavailable; the size still works for this session.
    }
  }, [zoom]);

  const zoomIn = useCallback(() => {
    setZoom((current) => Math.min(MAX_ZOOM, Math.round((current + 1) * 10) / 10));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((current) => Math.max(minimumZoom(), Math.round((current - 1) * 10) / 10));
  }, []);

  const reset = useCallback(() => setZoom(DEFAULT_ZOOM), []);

  return { zoom, zoomIn, zoomOut, reset };
}
