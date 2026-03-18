import { useEffect, useState, useRef } from "react";
import { ScanSearch, Check, BadgeCheck, Loader2, Circle, Sparkles } from "lucide-react";
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

const STEPS = [
  { id: "locate", label: "Perfil localizado" },
  { id: "collect", label: "Coletando dados do perfil" },
  { id: "analyze", label: "Analisando bio e posts" },
  { id: "diagnostic", label: "Montando seu diagnostico" },
] as const;

/* Counter labels that cycle during Phase D (diagnostic assembly) */
const GENERATION_LABELS = [
  "Calculando saude do perfil...",
  "Analisando engajamento...",
  "Preparando diagnostico...",
];

/* Motivational tips shown after extended wait */
const TIPS = [
  "Quanto mais posts, mais preciso o diagnostico",
  "Estamos analisando padroes de engajamento",
  "Nossa IA compara com +10 mil perfis do seu nicho",
  "Cada roteiro e personalizado para seu publico",
];

function getStepState(
  stepIndex: number,
  phase: Phase,
): "done" | "active" | "pending" {
  const phaseIndex = { A: 0, B: 1, C: 2, D: 3, done: 4 }[phase];
  if (stepIndex < phaseIndex) return "done";
  if (stepIndex === phaseIndex) return "active";
  if (phase === "done") return "done";
  return "pending";
}

function CountUpNumber({ target, start }: { target: number; start: boolean }) {
  const value = useCountUp(target, 3000, start);
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toString();
  return <span>{formatted}</span>;
}

export default function LoadingOverlay({ isOpen, isDone, handle, profileSnapshot }: Props) {
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("A");
  const [showDone, setShowDone] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [genLabelIndex, setGenLabelIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const doneTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const genLabelRef = useRef<ReturnType<typeof setInterval>>();
  const tipTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const startTimeRef = useRef(0);

  const hasProfile = !!profileSnapshot;
  const showAvatar = hasProfile && avatarLoaded;
  // Show stats as soon as profile data arrives (even in phase A)
  const showStats = hasProfile;
  const showBio = hasProfile && (phase === "C" || phase === "D" || phase === "done") && !!profileSnapshot?.bio_text;

  // Preload avatar image
  useEffect(() => {
    if (!profileSnapshot?.avatar_url) {
      setAvatarLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => setAvatarLoaded(true);
    img.src = profileSnapshot.avatar_url;
  }, [profileSnapshot?.avatar_url]);

  // Cycle generation labels during phase D
  useEffect(() => {
    if (phase === "D") {
      setGenLabelIndex(0);
      genLabelRef.current = setInterval(() => {
        setGenLabelIndex((prev) => (prev + 1) % GENERATION_LABELS.length);
      }, 3500);
      return () => clearInterval(genLabelRef.current);
    }
    clearInterval(genLabelRef.current);
  }, [phase]);

  // Show motivational tip after 45s
  useEffect(() => {
    if (!isOpen) {
      setTipIndex(-1);
      clearTimeout(tipTimerRef.current);
      return;
    }
    tipTimerRef.current = setTimeout(() => {
      setTipIndex(0);
      // Rotate tips every 8s
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
      }, 8000);
      return () => clearInterval(interval);
    }, 45000);
    return () => clearTimeout(tipTimerRef.current);
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setPhase("A");
      setShowDone(false);
      setAvatarLoaded(false);
      setGenLabelIndex(0);
      setTipIndex(-1);
      clearInterval(intervalRef.current);
      clearTimeout(doneTimerRef.current);
      clearInterval(genLabelRef.current);
      clearTimeout(tipTimerRef.current);
      startTimeRef.current = 0;
      return;
    }

    startTimeRef.current = Date.now();
    let current = 0;
    // Progress timing for ~30-45s total (partial result — bio + posts only)
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // First 12s: quick to 25% (scraping profile)
      // 12-25s: to 55% (scraping posts)
      // 25-40s: to 85% (bio + posts AI analysis)
      // 40s+: oscillate around 88-94%
      if (elapsed < 12) {
        current = (elapsed / 12) * 25;
      } else if (elapsed < 25) {
        current = 25 + ((elapsed - 12) / 13) * 30;
      } else if (elapsed < 40) {
        current = 55 + ((elapsed - 25) / 15) * 30;
      } else {
        current = 88 + Math.sin(Date.now() / 500) * 3;
      }
      setProgress(Math.min(current, 94));
    }, 250);

    return () => clearInterval(intervalRef.current);
  }, [isOpen]);

  // Phase transitions based on progress (4 phases now)
  useEffect(() => {
    if (showDone) return;
    if (progress < 12) setPhase("A");
    else if (progress < 35) setPhase("B");
    else if (progress < 65) setPhase("C");
    else setPhase("D");
  }, [progress, showDone]);

  // When API is done, complete animation
  useEffect(() => {
    if (!isDone || !isOpen) return;
    clearInterval(intervalRef.current);

    if (progress < 40) setProgress(45);

    setProgress(100);
    setPhase("done");
    setShowDone(true);

    return () => clearTimeout(doneTimerRef.current);
  }, [isDone, isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col items-center justify-center gap-5 p-6 sm:p-8 w-full max-w-sm mx-auto">

      {/* === AVATAR SECTION — always present, content transitions === */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Instagram icon with scanner — fades out when real avatar loads */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-700"
          style={{ opacity: showAvatar ? 0 : 1, transform: showAvatar ? "scale(0.8)" : "scale(1)" }}
        >
          <div className="ai-scanner">
            <div className="ai-scanner-pulse" />
            <div className="ai-scanner-pulse ai-scanner-pulse-delayed" />
            <div className="ai-scanner-ring-outer" />
            <div className="ai-scanner-ring-inner" />
            <div className="ai-scanner-core">
              <ScanSearch className="w-8 h-8 text-white relative z-10" />
            </div>
          </div>
        </div>

        {/* Real avatar — fades in when loaded */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-700"
          style={{ opacity: showAvatar ? 1 : 0, transform: showAvatar ? "scale(1)" : "scale(1.1)" }}
        >
          {profileSnapshot?.avatar_url && (
            <img
              src={profileSnapshot.avatar_url}
              alt={profileSnapshot.handle}
              className="w-24 h-24 rounded-full border-2 border-border object-cover"
            />
          )}
        </div>

        {/* Done checkmark overlay */}
        {phase === "done" && (
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center shadow-lg">
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      {/* === NAME + HANDLE — always present === */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-foreground font-semibold text-lg truncate max-w-[250px] transition-all duration-500">
            {hasProfile ? profileSnapshot.full_name : `@${handle || "..."}`}
          </p>
          {profileSnapshot?.is_verified && (
            <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
          )}
        </div>
        {hasProfile && (
          <p className="text-muted-foreground text-sm transition-opacity duration-500">
            @{profileSnapshot.handle}
          </p>
        )}
      </div>

      {/* === STATS — always in DOM, opacity controlled === */}
      <div
        className="w-full grid grid-cols-3 gap-3 transition-all duration-700"
        style={{ opacity: showStats ? 1 : 0.15, transform: showStats ? "translateY(0)" : "translateY(4px)" }}
      >
        {[
          { label: "posts", value: profileSnapshot?.posts_count || 0 },
          { label: "seguidores", value: profileSnapshot?.followers || 0 },
          { label: "seguindo", value: profileSnapshot?.following || 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-foreground font-bold text-xl">
              <CountUpNumber target={stat.value} start={showStats} />
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* === BIO — expands when available === */}
      <div
        className="w-full overflow-hidden transition-all duration-700 ease-out"
        style={{
          maxHeight: showBio ? "120px" : "0px",
          opacity: showBio ? 1 : 0,
        }}
      >
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 whitespace-pre-line text-center px-2">
          {profileSnapshot?.bio_text}
        </p>
      </div>

      {/* === STEP CHECKLIST === */}
      <div className="w-full space-y-2 py-2">
        {STEPS.map((step, i) => {
          const state = getStepState(i, phase);
          return (
            <div key={step.id}>
              <div
                className={`flex items-center gap-2.5 transition-all duration-300 ${
                  state === "pending" ? "opacity-30" : "opacity-100"
                }`}
              >
                {state === "done" ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 step-check-enter">
                    <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                  </div>
                ) : state === "active" ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={`text-sm transition-colors duration-300 ${
                    state === "done"
                      ? "text-emerald-400"
                      : state === "active"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {step.label}
                  {state === "active" && "..."}
                </span>
              </div>
              {/* Sub-label for diagnostic phase — cycles through labels */}
              {step.id === "diagnostic" && state === "active" && (
                <p className="ml-[30px] text-xs text-primary/70 mt-1 transition-opacity duration-500 animate-pulse">
                  {GENERATION_LABELS[genLabelIndex]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* === MOTIVATIONAL TIP — appears after 45s === */}
      {tipIndex >= 0 && !showDone && (
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 transition-opacity duration-500">
          <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0" />
          <p className="text-xs text-muted-foreground leading-snug">{TIPS[tipIndex]}</p>
        </div>
      )}

      {/* === PROGRESS BAR — always visible === */}
      <div className="w-full space-y-1">
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full shimmer-bar transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-muted-foreground text-xs text-center">{Math.round(progress)}%</p>
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
