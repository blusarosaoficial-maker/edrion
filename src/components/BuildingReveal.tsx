import { useMemo, useCallback, useRef } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Crown,
  ArrowLeft,
} from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
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

interface Props {
  result: AnalysisResult;
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

/* ─── Main component ─────────────────────────────────────────── */

export default function BuildingReveal({ result, onComplete, onReset, isShowcase }: Props) {
  const { profile, deliverables, limits } = result;
  const { bio_suggestion, latest_post, top_post, worst_post } = deliverables;
  const isPremium = result.plan === "premium";
  const showFullFreeContent = isShowcase || isPremium;

  const healthScore = computeHealthScore(result);
  const health = healthLabel(healthScore);

  const onUpgradeAction = useCallback(() => {
    // During building, upgrade actions just scroll to top
    onReset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [onReset]);

  // Track when enrichment data arrives to set relative delays
  const enrichmentArrivalRef = useRef<number | null>(null);
  const hasEnrichment = !!(deliverables.weekly_content_plan || deliverables.stories_plan || deliverables.hashtag_strategy);
  if (hasEnrichment && !enrichmentArrivalRef.current) {
    enrichmentArrivalRef.current = Date.now();
  }

  // Track mount time for calculating absolute delays
  const mountTimeRef = useRef(Date.now());

  // Build sections list dynamically based on available data
  // When enrichment data arrives later, new sections are added with short delays
  const sections = useMemo<RevealSection[]>(() => {
    const s: RevealSection[] = [
      { id: "profileHeader", delay: 0 },
      { id: "healthScore", delay: 500 },
      { id: "bio", delay: 1500 },
      { id: "latestPost", delay: 3500 },
      { id: "posts", delay: 5000 },
    ];

    let nextDelay = 7000;

    if (!isPremium && !isShowcase) {
      s.push({ id: "upgradeBanner", delay: nextDelay });
      nextDelay += 1500;
    }

    // Enrichment sections: if data arrived later via Realtime,
    // use short staggered delays from current time
    if (hasEnrichment) {
      const elapsed = Date.now() - mountTimeRef.current;
      // If enrichment arrived after initial render, start revealing from now
      const enrichBase = elapsed > 6000 ? Math.max(nextDelay, elapsed + 500) : nextDelay;

      if (deliverables.weekly_content_plan) {
        s.push({ id: "weekly", delay: enrichBase });
        nextDelay = enrichBase + 1500;
      }
      if (deliverables.stories_plan) {
        s.push({ id: "stories", delay: nextDelay });
        nextDelay += 1500;
      }
      if (deliverables.hashtag_strategy) {
        s.push({ id: "hashtags", delay: nextDelay });
        nextDelay += 1000;
      }
    }

    if (!isPremium && !isShowcase) {
      // Only add final CTA after enrichment sections are present
      if (hasEnrichment) {
        s.push({ id: "finalCta", delay: nextDelay });
      }
    }

    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverables.weekly_content_plan, deliverables.stories_plan, deliverables.hashtag_strategy, isPremium, isShowcase, hasEnrichment]);

  // Only fire onComplete after enrichment sections are also revealed
  const isDeferred = result._deferred === true;
  const stableOnComplete = useCallback(() => {
    if (!isDeferred) onComplete();
  }, [isDeferred, onComplete]);

  const { revealState, isComplete } = useRevealSequence(sections, {
    enabled: true,
    onComplete: stableOnComplete,
  });

  // Header building label
  const buildingLabel = useMemo(() => {
    const state = (id: string) => revealState(id);
    if (state("hashtags") !== "hidden") return "Finalizando diagnostico...";
    if (state("stories") !== "hidden") return "Montando stories...";
    if (state("weekly") !== "hidden") return "Criando roteiros semanais...";
    // If posts revealed but enrichment not yet arrived, show generating label
    if (state("posts") !== "hidden" && !hasEnrichment) return "Gerando roteiros e stories...";
    if (state("posts") !== "hidden") return "Analisando seus posts...";
    if (state("bio") !== "hidden") return "Analisando sua bio...";
    if (state("healthScore") !== "hidden") return "Calculando saude do perfil...";
    return "Montando seu diagnostico...";
  }, [revealState, hasEnrichment]);

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
      {!isComplete && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <TypewriterText
            text={buildingLabel}
            enabled={true}
            speed={30}
            className="text-sm text-primary font-medium"
          />
        </div>
      )}

      {/* Profile header — immediate */}
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

      {/* Health Score */}
      <RevealWrapper id="healthScore" revealState={revealState("healthScore")}>
        <ProfileHealthScore score={healthScore} health={health} isPremium={isPremium} onUpgrade={onUpgradeAction} />
        {limits && (
          <p className="text-muted-foreground text-xs text-center mt-3">
            {limits.posts_analyzed} posts analisados · {limits.note}
          </p>
        )}
      </RevealWrapper>

      {/* Bio Analysis */}
      <RevealWrapper id="bio" revealState={revealState("bio")}>
        <BioAnalysisSection bio={bio_suggestion} />
      </RevealWrapper>

      {/* Latest Post */}
      <RevealWrapper id="latestPost" revealState={revealState("latestPost")}>
        {latest_post && <LatestPostCard post={latest_post} />}
      </RevealWrapper>

      {/* Top & Worst Post */}
      <RevealWrapper id="posts" revealState={revealState("posts")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PostCard
            title="Melhor Post"
            icon={<ThumbsUp className="w-5 h-5 text-primary" />}
            post={top_post}
            accentClass="border-primary/30"
            locked={!showFullFreeContent}
            onClickAnalysis={onUpgradeAction}
          />
          <PostCard
            title="Pior Post"
            icon={<ThumbsDown className="w-5 h-5 text-destructive" />}
            post={worst_post}
            accentClass="border-destructive/30"
            locked={!showFullFreeContent}
            onClickAnalysis={onUpgradeAction}
          />
        </div>
      </RevealWrapper>

      {/* Inline upgrade banner */}
      {!isPremium && !isShowcase && (
        <RevealWrapper id="upgradeBanner" revealState={revealState("upgradeBanner")}>
          <InlineUpgradeBanner
            handle={profile.handle}
            topScore={top_post.analysis?.nota_geral}
            worstScore={worst_post.analysis?.nota_geral}
            onUpgrade={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Weekly Content Plan */}
      {deliverables.weekly_content_plan && (
        <RevealWrapper id="weekly" revealState={revealState("weekly")}>
          <WeeklyContentSection
            plan={deliverables.weekly_content_plan}
            locked={!showFullFreeContent}
            onLockedClick={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Stories Plan */}
      {deliverables.stories_plan && (
        <RevealWrapper id="stories" revealState={revealState("stories")}>
          <StoriesSection
            plan={deliverables.stories_plan}
            locked={!showFullFreeContent}
            onLockedClick={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Hashtag Strategy */}
      {deliverables.hashtag_strategy && (
        <RevealWrapper id="hashtags" revealState={revealState("hashtags")}>
          <HashtagStrategySection
            data={deliverables.hashtag_strategy}
            locked={!showFullFreeContent}
            onLockedClick={onUpgradeAction}
          />
        </RevealWrapper>
      )}

      {/* Final CTA */}
      {!isPremium && !isShowcase && (
        <RevealWrapper id="finalCta" revealState={revealState("finalCta")}>
          <FinalCTA handle={profile.handle} onUpgrade={onUpgradeAction} />
        </RevealWrapper>
      )}
    </div>
  );
}
