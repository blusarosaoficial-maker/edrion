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
  // Track which sections have been scheduled to avoid re-scheduling
  const scheduledRef = useRef<Set<string>>(new Set());

  // When sections change, add new ones without resetting existing
  useEffect(() => {
    setStates((prev) => {
      const next = { ...prev };
      for (const s of sections) {
        if (!(s.id in next)) {
          next[s.id] = "hidden";
        }
      }
      return next;
    });
  }, [sections.map((s) => s.id).join(",")]);

  // Schedule reveal timers for sections (only new ones)
  useEffect(() => {
    if (!enabled || sections.length === 0) return;

    const newTimers: ReturnType<typeof setTimeout>[] = [];

    for (const section of sections) {
      // Skip already scheduled sections
      if (scheduledRef.current.has(section.id)) continue;
      scheduledRef.current.add(section.id);

      // Set to "revealing" at delay
      const revealTimer = setTimeout(() => {
        setStates((prev) => ({ ...prev, [section.id]: "revealing" }));
      }, section.delay);
      newTimers.push(revealTimer);

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
      newTimers.push(revealedTimer);
    }

    timersRef.current.push(...newTimers);

    return () => {
      for (const t of newTimers) clearTimeout(t);
      timersRef.current = timersRef.current.filter((t) => !newTimers.includes(t));
    };
  }, [enabled, sections.map((s) => `${s.id}:${s.delay}`).join(",")]);

  // Reset scheduledRef when component remounts (sections fully change)
  useEffect(() => {
    return () => {
      scheduledRef.current.clear();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

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

  const isComplete = sections.length > 0 && sections.every((s) => states[s.id] === "revealed");

  return { isRevealed, revealState, skipToEnd, isComplete };
}
