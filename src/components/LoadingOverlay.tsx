import { useEffect, useState, useRef } from "react";
import { Instagram, Check, BadgeCheck, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCountUp } from "@/hooks/useCountUp";
import type { ProfileData } from "@/types/analysis";

type Phase = "A" | "B" | "C" | "D" | "done";

interface Props {
  isOpen: boolean;
  isDone: boolean;
  handle?: string;
  profileSnapshot?: ProfileData | null;
}

function CountUpNumber({ target, start, suffix }: { target: number; start: boolean; suffix?: string }) {
  const value = useCountUp(target, 2000, start);
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toString();
  return <span>{formatted}{suffix}</span>;
}

function CircularTimer({ seconds }: { seconds: number }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e >= seconds) {
          clearInterval(intervalRef.current);
          return seconds;
        }
        return e + 0.1;
      });
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [seconds]);

  const progress = Math.min(elapsed / seconds, 1);
  const remaining = Math.max(Math.ceil(seconds - elapsed), 0);

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
        <circle
          cx="40" cy="40" r="35"
          fill="none"
          stroke="url(#timer-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 35}`}
          strokeDashoffset={`${2 * Math.PI * 35 * (1 - progress)}`}
          className="transition-all duration-100"
        />
        <defs>
          <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6A5CFF" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#FF3DAE" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-lg font-bold text-foreground">{remaining}s</span>
    </div>
  );
}

export default function LoadingOverlay({ isOpen, isDone, handle, profileSnapshot }: Props) {
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("A");
  const [showDone, setShowDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const doneTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset on open
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setPhase("A");
      setShowDone(false);
      clearInterval(intervalRef.current);
      clearTimeout(doneTimerRef.current);
      return;
    }

    // Slow progress simulation ~20s total
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += 0.5;
      if (current >= 90) {
        current = 90 + Math.sin(Date.now() / 500) * 2;
      }
      setProgress(Math.min(current, 94));
    }, 250);

    return () => clearInterval(intervalRef.current);
  }, [isOpen]);

  // Phase transitions based on progress
  useEffect(() => {
    if (showDone) return;
    if (progress < 15) setPhase("A");
    else if (progress < 40) setPhase("B");
    else if (progress < 75) setPhase("C");
    else setPhase("D");
  }, [progress, showDone]);

  // When API is done, show final phases then complete
  useEffect(() => {
    if (!isDone || !isOpen) return;
    // Let phases C/D show for a bit, then done
    clearInterval(intervalRef.current);

    // If we're still early, jump to C first
    if (progress < 40) setProgress(45);

    doneTimerRef.current = setTimeout(() => {
      setProgress(100);
      setPhase("done");
      setShowDone(true);
    }, 3500);

    return () => clearTimeout(doneTimerRef.current);
  }, [isDone, isOpen]);

  if (!isOpen) return null;

  const phaseLabel = {
    A: "Localizando perfil...",
    B: "Coletando dados do perfil...",
    C: "Analisando dados do perfil...",
    D: "Gerando diagnóstico estratégico...",
    done: "Diagnóstico pronto!",
  }[phase];

  const content = (
    <div className="flex flex-col items-center justify-center gap-6 p-6 sm:p-8 w-full max-w-md mx-auto">
      {/* Phase A: Instagram icon + handle + timer */}
      {phase === "A" && (
        <div className="flex flex-col items-center gap-5 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F56040] via-[#C13584] to-[#833AB4] flex items-center justify-center">
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <p className="text-foreground font-semibold text-lg">@{handle || "..."}</p>
          <CircularTimer seconds={18} />
        </div>
      )}

      {/* Phase B: Avatar + name appear */}
      {phase === "B" && (
        <div className="flex flex-col items-center gap-5 animate-in fade-in duration-500">
          {profileSnapshot ? (
            <img
              src={profileSnapshot.avatar_url}
              alt={profileSnapshot.handle}
              className="w-20 h-20 rounded-full border-2 border-border object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
          )}
          <div className="text-center">
            <p className="text-foreground font-semibold text-lg">
              {profileSnapshot?.full_name || handle || "..."}
            </p>
            <p className="text-muted-foreground text-sm">@{handle || "..."}</p>
          </div>
        </div>
      )}

      {/* Phase C: Full profile card with countup stats */}
      {(phase === "C" || phase === "D") && (
        <div className="w-full rounded-xl border border-border bg-card p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            {profileSnapshot ? (
              <img
                src={profileSnapshot.avatar_url}
                alt={profileSnapshot.handle}
                className="w-16 h-16 rounded-full border-2 border-border object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-foreground font-semibold truncate">
                  {profileSnapshot?.full_name || handle}
                </p>
                {profileSnapshot?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-muted-foreground text-sm">@{handle}</p>
            </div>
          </div>

          {/* Stats with countup */}
          <div className="grid grid-cols-3 divide-x divide-border text-center">
            <div className="px-2">
              <p className="text-foreground font-bold text-lg">
                <CountUpNumber
                  target={profileSnapshot?.posts_count || 0}
                  start={!!profileSnapshot}
                />
              </p>
              <p className="text-muted-foreground text-xs">posts</p>
            </div>
            <div className="px-2">
              <p className="text-foreground font-bold text-lg">
                <CountUpNumber
                  target={profileSnapshot?.followers || 0}
                  start={!!profileSnapshot}
                />
              </p>
              <p className="text-muted-foreground text-xs">seguidores</p>
            </div>
            <div className="px-2">
              <p className="text-foreground font-bold text-lg">
                <CountUpNumber
                  target={profileSnapshot?.following || 0}
                  start={!!profileSnapshot}
                />
              </p>
              <p className="text-muted-foreground text-xs">seguindo</p>
            </div>
          </div>

          {/* Bio */}
          {profileSnapshot?.bio_text && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 whitespace-pre-line">
              {profileSnapshot.bio_text}
            </p>
          )}
        </div>
      )}

      {/* Phase D indicator */}
      {phase === "D" && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm animate-in fade-in duration-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>IA processando dados...</span>
        </div>
      )}

      {/* Done: checkmark */}
      {phase === "done" && (
        <div className="flex flex-col items-center gap-3 animate-in zoom-in-50 duration-500">
          <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Phase label */}
      <div className="text-center space-y-1">
        <p className="text-foreground font-medium text-base">{phaseLabel}</p>
        <p className="text-muted-foreground text-sm">{Math.round(progress)}%</p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full shimmer-bar transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );

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
