"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboard(resetAfterMs: number = 1500) {
  const [hasCopied, setHasCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (!text) return false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setHasCopied(true);
        clear();
        timeoutRef.current = window.setTimeout(
          () => setHasCopied(false),
          resetAfterMs
        );
        return true;
      } catch {
        setHasCopied(false);
        return false;
      }
    },
    [clear, resetAfterMs]
  );

  useEffect(() => () => clear(), [clear]);

  return { copy, hasCopied } as const;
}
