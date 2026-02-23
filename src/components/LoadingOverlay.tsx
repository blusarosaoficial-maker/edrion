import { useEffect, useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProfileData } from "@/types/analysis";

type Phase = "A" | "B" | "C" | "D" | "done";

const PHASE_CONFIG: Record<Exclude<Phase, "done">, { label: string; min: number; max: number }> = {
  A: { label: "Conectando ao Instagram...", min: 0, max: 18 },
  B: { label: "Capturando dados do perfil...", min: 18, max: 45 },
  C: { label: "Lendo posts recentes...", min: 45, max: 78 },
  D: { label: "Gerando diagnóstico estratégico...", min: 78, max: 90 },
};

interface Props {
  isOpen: boolean;
  isDone: boolean;
  /** Mock profile to show during phase B */
  profileSnapshot?: ProfileData | null;
}

export default function LoadingOverlay({ isOpen, isDone, profileSnapshot }: Props) {
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("A");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const oscillateRef = useRef<ReturnType<typeof setInterval>>();

  // Progress simulation
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setPhase("A");
      return;
    }

    if (isDone) {
      // Complete quickly
      clearInterval(intervalRef.current);
      clearInterval(oscillateRef.current);
      setProgress(100);
      setPhase("done");
      return;
    }

    // Simulate progress through phases
    let current = 0;
    const phases: Exclude<Phase, "done">[] = ["A", "B", "C", "D"];
    let phaseIdx = 0;

    intervalRef.current = setInterval(() => {
      if (phaseIdx >= phases.length) {
        clearInterval(intervalRef.current);
        // Oscillate at 90-94%
        let dir = 1;
        let osc = 90;
        oscillateRef.current = setInterval(() => {
          osc += dir * 0.3;
          if (osc >= 94) dir = -1;
          if (osc <= 90) dir = 1;
          setProgress(osc);
        }, 100);
        return;
      }

      const p = phases[phaseIdx];
      const cfg = PHASE_CONFIG[p];
      const step = (cfg.max - cfg.min) / 30; // ~30 ticks per phase
      current += step;

      if (current >= cfg.max) {
        current = cfg.max;
        phaseIdx++;
        if (phaseIdx < phases.length) {
          setPhase(phases[phaseIdx]);
        }
      }

      setProgress(current);
    }, 150);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(oscillateRef.current);
    };
  }, [isOpen, isDone]);

  // Update phase based on progress
  useEffect(() => {
    if (progress < 18) setPhase("A");
    else if (progress < 45) setPhase("B");
    else if (progress < 78) setPhase("C");
    else if (progress < 100) setPhase("D");
  }, [progress]);

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col items-center justify-center gap-8 p-8 w-full max-w-lg mx-auto">
      {/* Phase label */}
      <div className="text-center space-y-2">
        <p className="text-foreground font-medium text-lg">
          {phase === "done" ? "Diagnóstico pronto!" : PHASE_CONFIG[phase as Exclude<Phase, "done">]?.label}
        </p>
        <p className="text-muted-foreground text-sm">{Math.round(progress)}%</p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden animate-pulse-glow">
        <div
          className="h-full rounded-full shimmer-bar transition-all duration-200 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Phase B: profile snapshot */}
      {phase === "B" && profileSnapshot && (
        <div className="w-full rounded-xl border border-border bg-card p-5 space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <img
              src={profileSnapshot.avatar_url}
              alt={profileSnapshot.handle}
              className="w-14 h-14 rounded-full border-2 border-border object-cover"
            />
            <div className="min-w-0">
              <p className="text-foreground font-semibold truncate">{profileSnapshot.full_name}</p>
              <p className="text-muted-foreground text-sm">@{profileSnapshot.handle}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-foreground font-semibold text-sm">{profileSnapshot.followers.toLocaleString("pt-BR")}</p>
              <p className="text-muted-foreground text-xs">seguidores</p>
            </div>
          </div>
          {/* Mini grid */}
          <div className="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Mobile: fullscreen / Desktop: centered modal with blur
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="rounded-2xl border border-border bg-card shadow-2xl p-2">
        {content}
      </div>
    </div>
  );
}
