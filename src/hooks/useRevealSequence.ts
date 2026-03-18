import { useCallback, useEffect, useRef, useState } from "react";

export interface RevealSection {
  id: string;
  delay: number; // ms from start when this section begins revealing
}

type RevealState = "hidden" | "revealing" | "revealed";

const REVEAL_DURATION = 600; // ms for revealing → revealed transition

interface RevealSequenceOptions {
  enabled?: boolean;
  onComplete?: () => void;
}

export function useRevealSequence(
  sections: RevealSection[],
  options: RevealSequenceOptions = {},
) {
  const { enabled = true, onComplete } = options;
  const [states, setStates] = useState<Record<string, RevealState>>(() => {
    const init: Record<string, RevealState> = {};
    for (const s of sections) init[s.id] = "hidden";
    return init;
  });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset when sections change
  useEffect(() => {
    const init: Record<string, RevealState> = {};
    for (const s of sections) init[s.id] = "hidden";
    setStates(init);
    completedRef.current = false;
  }, [sections.map((s) => s.id).join(",")]);

  // Start the timeline
  useEffect(() => {
    if (!enabled || sections.length === 0) return;

    // Clean up previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    for (const section of sections) {
      // Set to "revealing" at delay
      const revealTimer = setTimeout(() => {
        setStates((prev) => ({ ...prev, [section.id]: "revealing" }));
      }, section.delay);
      timersRef.current.push(revealTimer);

      // Set to "revealed" after delay + REVEAL_DURATION
      const revealedTimer = setTimeout(() => {
        setStates((prev) => {
          const next = { ...prev, [section.id]: "revealed" as RevealState };
          // Check if all sections are revealed
          const allRevealed = sections.every((s) => next[s.id] === "revealed");
          if (allRevealed && !completedRef.current) {
            completedRef.current = true;
            setTimeout(() => onCompleteRef.current?.(), 100);
          }
          return next;
        });
      }, section.delay + REVEAL_DURATION);
      timersRef.current.push(revealedTimer);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [enabled, sections.map((s) => `${s.id}:${s.delay}`).join(",")]);

  const skipToEnd = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setStates((prev) => {
      const next = { ...prev };
      for (const s of sections) next[s.id] = "revealed";
      return next;
    });
    if (!completedRef.current) {
      completedRef.current = true;
      setTimeout(() => onCompleteRef.current?.(), 100);
    }
  }, [sections]);

  const isRevealed = useCallback(
    (id: string) => states[id] === "revealing" || states[id] === "revealed",
    [states],
  );

  const revealState = useCallback(
    (id: string): RevealState => states[id] || "hidden",
    [states],
  );

  const isComplete = sections.every((s) => states[s.id] === "revealed");

  return { isRevealed, revealState, skipToEnd, isComplete };
}
