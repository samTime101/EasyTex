import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const show = useCallback((text) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 1600);
  }, []);

  const node = message ? <div className="toast visible">{message}</div> : null;

  return { message, show, node };
}
