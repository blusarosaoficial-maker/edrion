import { useEffect, useRef, useState } from "react";

interface TypewriterOptions {
  speed?: number;      // chars per second, default 40
  delay?: number;      // initial delay in ms, default 0
  enabled?: boolean;   // start condition, default true
}

export function useTypewriter(
  fullText: string,
  options: TypewriterOptions = {},
): { text: string; isDone: boolean } {
  const { speed = 40, delay = 0, enabled = true } = options;
  const [charCount, setCharCount] = useState(0);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const delayedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !fullText) {
      setCharCount(0);
      delayedRef.current = false;
      return;
    }

    const msPerChar = 1000 / speed;
    startTimeRef.current = undefined;
    delayedRef.current = false;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      if (!delayedRef.current) {
        if (elapsed < delay) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }
        delayedRef.current = true;
        startTimeRef.current = timestamp;
      }

      const elapsedAfterDelay = timestamp - startTimeRef.current;
      const chars = Math.min(
        Math.floor(elapsedAfterDelay / msPerChar) + 1,
        fullText.length,
      );
      setCharCount(chars);

      if (chars < fullText.length) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fullText, speed, delay, enabled]);

  return {
    text: enabled ? fullText.slice(0, charCount) : "",
    isDone: charCount >= fullText.length,
  };
}
