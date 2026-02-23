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
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const doneTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const hasProfile = !!profileSnapshot;
  const showAvatar = hasProfile && avatarLoaded;
  const showStats = hasProfile && phase !== "A";
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

  // Reset on open
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setPhase("A");
      setShowDone(false);
      setAvatarLoaded(false);
      clearInterval(intervalRef.current);
      clearTimeout(doneTimerRef.current);
      return;
    }

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

  // When API is done, complete animation
  useEffect(() => {
    if (!isDone || !isOpen) return;
    clearInterval(intervalRef.current);

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
    <div className="flex flex-col items-center justify-center gap-5 p-6 sm:p-8 w-full max-w-sm mx-auto">

      {/* === AVATAR SECTION — always present, content transitions === */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Instagram icon with scanner — fades out when real avatar loads */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-700"
          style={{ opacity: showAvatar ? 0 : 1, transform: showAvatar ? "scale(0.8)" : "scale(1)" }}
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#6A5CFF] via-[#A855F7] to-[#FF3DAE] flex items-center justify-center scanner-container animate-pulse-glow">
            <div className="scanner-line-top" />
            <div className="scanner-line-right" />
            <div className="scanner-line-bottom" />
            <div className="scanner-line-left" />
            <Instagram className="w-12 h-12 text-white relative z-10" />
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

      {/* === STATUS + AI indicator === */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm min-h-[20px]">
        {phase === "D" && <Loader2 className="w-4 h-4 animate-spin" />}
        <span className="transition-opacity duration-300">{phaseLabel}</span>
      </div>

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
