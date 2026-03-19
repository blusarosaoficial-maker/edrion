import { useMemo, useCallback } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Crown,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { AnalysisResult, ProfileData } from "@/types/analysis";
import { useRevealSequence, type RevealSection } from "@/hooks/useRevealSequence";
import { useTypewriter } from "@/hooks/useTypewriter";
import ProfileHealthScore, { computeHealthScore, healthLabel } from "@/components/ProfileHealthScore";
import PostCard from "@/components/PostCard";
import LatestPostCard from "@/components/LatestPostCard";
import BioAnalysisSection from "@/components/BioAnalysisSection";
import WeeklyContentSection from "@/components/WeeklyContentSection";
import StoriesSection from "@/components/StoriesSection";
import HashtagStrategySection from "@/components/HashtagStrategySection";
import InlineUpgradeBanner from "@/components/InlineUpgradeBanner";
import FinalCTA from "@/components/FinalCTA";

type AnalysisPhase = "scraping" | "analyzing" | "done";

interface Props {
  result: AnalysisResult | null;
  profileSnapshot?: ProfileData | null;
  analysisPhase: AnalysisPhase;
  onComplete: () => void;
  onReset: () => void;
  isShowcase?: boolean;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

/* ─── Reveal wrapper ─────────────────────────────────────────── */

function RevealWrapper({
  id,
  revealState,
  children,
  className = "",
}: {
  id: string;
  revealState: "hidden" | "revealing" | "revealed";
  children: React.ReactNode;
  className?: string;
}) {
  if (revealState === "hidden") return null;

  return (
    <div
      className={`reveal-section revealed ${className}`}
      data-reveal-id={id}
    >
      {children}
    </div>
  );
}

/* ─── Typewriter text display ─────────────────────────────────── */

function TypewriterText({
  text,
  enabled,
  speed = 50,
  className = "",
}: {
  text: string;
  enabled: boolean;
  speed?: number;
  className?: string;
}) {
  const { text: displayed, isDone } = useTypewriter(text, {
    speed,
    enabled,
  });

  return (
    <span className={className}>
      {displayed}
      {enabled && !isDone && <span className="typewriter-cursor" />}
    </span>
  );
}

/* ─── Skeleton placeholders ──────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card animate-pulse">
      <div className="w-16 h-16 rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-5 bg-muted rounded w-32" />
        <div className="h-4 bg-muted rounded w-20" />
      </div>
      <div className="flex gap-6">
        <div className="text-center space-y-1">
          <div className="h-4 bg-muted rounded w-10 mx-auto" />
          <div className="h-3 bg-muted rounded w-14" />
        </div>
        <div className="text-center space-y-1">
          <div className="h-4 bg-muted rounded w-10 mx-auto" />
          <div className="h-3 bg-muted rounded w-14" />
        </div>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Health score skeleton */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-40" />
            <div className="h-3 bg-muted rounded w-56" />
          </div>
        </div>
      </div>
      {/* Bio skeleton */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <div className="h-5 bg-muted rounded w-36" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
      {/* Posts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="p-5 rounded-xl border border-border bg-card space-y-3">
            <div className="h-5 bg-muted rounded w-28" />
            <div className="w-full h-40 bg-muted rounded-lg" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function BuildingReveal({
  result,
  profileSnapshot,
  analysisPhase,
  onComplete,
  onReset,
  isShowcase,
}: Props) {
  const profile = result?.profile || profileSnapshot;
  const deliverables = result?.deliverables;
  const limits = result?.limits;
  const isPremium = result?.plan === "premium";
  const showFullFreeContent = isShowcase || isPremium;

  const healthScore = result ? computeHealthScore(result) : 0;
  const health = result ? healthLabel(healthScore) : { label: "", color: "" };

  const onUpgradeAction = useCallback(() => {
    onReset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [onReset]);

  // Build sections dynamically based on available data
  const sections = useMemo<RevealSection[]>(() => {
    const s: RevealSection[] = [];

    // Phase 1: Profile arrived (after scraping)
    if (profile) {
      s.push({ id: "profileHeader", delay: 0 });
    }

    // Phase 2: Full result arrived (after AI analysis)
    if (result && deliverables) {
      s.push({ id: "healthScore", delay: 500 });
      let nextDelay = 1500;
      s.push({ id: "bio", delay: nextDelay });
      nextDelay += 2000;
      s.push({ id: "latestPost", delay: nextDelay });
      nextDelay += 1500;
      s.push({ id: "posts", delay: nextDelay });
      nextDelay += 2000;

      if (!isPremium && !isShowcase) {
        s.push({ id: "upgradeBanner", delay: nextDelay });
        nextDelay += 1500;
      }

      if (deliverables.weekly_content_plan) {
        s.push({ id: "weekly", delay: nextDelay });
        nextDelay += 1500;
      }
      if (deliverables.stories_plan) {
        s.push({ id: "stories", delay: nextDelay });
        nextDelay += 1500;
      }
      if (deliverables.hashtag_strategy) {
        s.push({ id: "hashtags", delay: nextDelay });
        nextDelay += 1000;
      }

      if (!isPremium && !isShowcase) {
        s.push({ id: "finalCta", delay: nextDelay });
      }
    }

    return s;
  }, [
    !!profile,
    !!result,
    deliverables?.weekly_content_plan,
    deliverables?.stories_plan,
    deliverables?.hashtag_strategy,
    isPremium,
    isShowcase,
  ]);

  const { revealState, isComplete } = useRevealSequence(sections, {
    enabled: true,
    onComplete,
  });

  // Building label based on current phase
  const buildingLabel = useMemo(() => {
    if (analysisPhase === "scraping") return "Coletando dados do perfil...";
    if (analysisPhase === "analyzing") {
      const state = (id: string) => revealState(id);
      if (state("hashtags") !== "hidden") return "Finalizando diagnostico...";
      if (state("stories") !== "hidden") return "Montando stories...";
      if (state("weekly") !== "hidden") return "Criando roteiros semanais...";
      if (state("posts") !== "hidden") return "Analisando seus posts...";
      if (state("bio") !== "hidden") return "Analisando sua bio...";
      if (state("healthScore") !== "hidden") return "Calculando saude do perfil...";
      return "Gerando analise com IA...";
    }
    if (analysisPhase === "done" && !isComplete) {
      const rs = (id: string) => revealState(id);
      if (rs("hashtags") !== "hidden") return "Finalizando diagnostico...";
      if (rs("stories") !== "hidden") return "Montando stories...";
      if (rs("weekly") !== "hidden") return "Criando roteiros semanais...";
      return "Montando seu diagnostico...";
    }
    return "Diagnostico completo!";
  }, [analysisPhase, revealState, isComplete]);

  const showStatusBar = !isComplete;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-12">
      {/* Back navigation */}
      <button
        onClick={() => { onReset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Analisar outro perfil
      </button>

      {/* Building status bar */}
      {showStatusBar && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
          {analysisPhase === "scraping" || analysisPhase === "analyzing" ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
          <TypewriterText
            text={buildingLabel}
            enabled={true}
            speed={30}
            className="text-sm text-primary font-medium"
          />
        </div>
      )}

      {/* Skeletons while scraping (no profile yet) */}
      {!profile && analysisPhase === "scraping" && (
        <>
          <ProfileSkeleton />
          <ContentSkeleton />
        </>
      )}

      {/* Profile header */}
      {profile && (
        <RevealWrapper id="profileHeader" revealState={revealState("profileHeader")}>
          <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card">
            <img
              src={profile.avatar_url}
              alt={profile.handle}
              className="w-16 h-16 rounded-full border-2 border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-foreground font-bold text-lg truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {profile.full_name}
                </h2>
                {profile.is_verified && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                )}
                {isPremium && (
                  <span
                    className="premium-badge inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full text-amber-950 shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #D4AF37, #F5D060)",
                      boxShadow: "0 0 8px rgba(212, 175, 55, 0.3), 0 0 16px rgba(245, 208, 96, 0.12)",
                    }}
                  >
                    <Crown className="w-3 h-3" /> PRO
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">@{profile.handle}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-foreground font-semibold text-sm">{formatNum(profile.followers)}</p>
                <p className="text-muted-foreground text-xs">seguidores</p>
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">{formatNum(profile.posts_count)}</p>
                <p className="text-muted-foreground text-xs">posts</p>
              </div>
            </div>
          </div>
        </RevealWrapper>
      )}

      {/* Health Score — only when we have full result */}
      {result && (
        <RevealWrapper id="healthScore" revealState={revealState("healthScore")}>
          <ProfileHealthScore score={healthScore} health={health} isPremium={!!isPremium} onUpgrade={onUpgradeAction} />
          {limits && (
            <p className="text-muted-foreground text-xs text-center mt-3">
              {limits.posts_analyzed} posts analisados · {limits.note}
            </p>
          )}
        </RevealWrapper>
      )}

      {/* Content skeletons while AI analysis runs */}
      {profile && !result && analysisPhase === "analyzing" && <ContentSkeleton />}

      {/* Bio Analysis */}
      {deliverables && (
        <RevealWrapper id="bio" revealState={revealState("bio")}>
          <BioAnalysisSection bio={deliverables.bio_suggestion} />
        </RevealWrapper>
      )}

      {/* Latest Post */}
      {deliverables && (
        <RevealWrapper id="latestPost" revealState={revealState("latestPost")}>
          {deliverables.latest_post && <LatestPostCard post={deliverables.latest_post} />}
        </RevealWrapper>
      )}

      {/* Top & Worst Post */}
      {deliverables && (
        <RevealWrapper id="posts" revealState={revealState("posts")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PostCard
              title="Melhor Post"
              icon={<ThumbsUp className="w-5 h-5 text-primary" />}
              post={deliverables.top_post}
              accentClass="border-primary/30"
              locked={!showFullFreeContent}
              onClickAnalysis={onUpgradeAction}
            />
            <PostCard
              title="Pior Post"
              icon={<ThumbsDown className="w-5 h-5 text-destructive" />}
              post={deliverables.worst_post}
              accentClass="border-destructive/30"
              locked={!showFullFreeContent}
              onClickAnalysis={onUpgradeAction}
            />
          </div>
        </RevealWrapper>
      )}

      {/* Inline upgrade banner */}
      {deliverables && !isPremium && !isShowcase && (
        <RevealWrapper id="upgradeBanner" revealState={revealState("upgradeBanner")}>
          <InlineUpgradeBanner
            handle={profile?.handle || ""}
            topScore={deliverables.top_post?.analysis?.nota_geral}
            worstScore={deliverables.worst_post?.analysis?.nota_geral}
            onUpgrade={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Weekly Content Plan */}
      {deliverables?.weekly_content_plan && (
        <RevealWrapper id="weekly" revealState={revealState("weekly")}>
          <WeeklyContentSection
            plan={deliverables.weekly_content_plan}
            locked={!showFullFreeContent}
            onLockedClick={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Stories Plan */}
      {deliverables?.stories_plan && (
        <RevealWrapper id="stories" revealState={revealState("stories")}>
          <StoriesSection
            plan={deliverables.stories_plan}
            locked={!showFullFreeContent}
            onLockedClick={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Hashtag Strategy */}
      {deliverables?.hashtag_strategy && (
        <RevealWrapper id="hashtags" revealState={revealState("hashtags")}>
          <HashtagStrategySection
            data={deliverables.hashtag_strategy}
            locked={!showFullFreeContent}
            onLockedClick={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Final CTA */}
      {deliverables && !isPremium && !isShowcase && (
        <RevealWrapper id="finalCta" revealState={revealState("finalCta")}>
          <FinalCTA handle={profile?.handle || ""} onUpgrade={onUpgradeAction} />
        </RevealWrapper>
      )}
    </div>
  );
}
