import { useState, useEffect } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  RotateCcw,
  CheckCircle2,
  Crown,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import type { AnalysisResult, PostData } from "@/types/analysis";
import BioAnalysisSection from "@/components/BioAnalysisSection";
import PostAnalysisModal from "@/components/PostAnalysisModal";
import WeeklyContentSection from "@/components/WeeklyContentSection";
import StoriesSection from "@/components/StoriesSection";
import HashtagStrategySection from "@/components/HashtagStrategySection";
import UpgradeModal from "@/components/UpgradeModal";
import ProfileHealthScore, { computeHealthScore, healthLabel } from "@/components/ProfileHealthScore";
import PostCard from "@/components/PostCard";
import LatestPostCard from "@/components/LatestPostCard";
import InlineUpgradeBanner from "@/components/InlineUpgradeBanner";
import FinalCTA from "@/components/FinalCTA";
import { useAuth } from "@/contexts/AuthContext";
import { trackViewContent } from "@/utils/pixel";


interface Props {
  result: AnalysisResult;
  onReset: () => void;
  resetLabel?: string;
  isShowcase?: boolean;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ResultView({ result, onReset, resetLabel, isShowcase }: Props) {
  const { user } = useAuth();
  const { profile, deliverables, limits } = result;
  const { bio_suggestion, latest_post, top_post, worst_post } = deliverables;
  const isPremium = result.plan === "premium";
  // In showcase mode, treat free-tier content as unlocked to demonstrate value
  const showFullFreeContent = isShowcase || isPremium;
  const [selectedPost, setSelectedPost] = useState<{ post: PostData; variant: "top" | "worst" } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!isShowcase) trackViewContent(profile.handle);
  }, [profile.handle, isShowcase]);

  const healthScore = computeHealthScore(result);
  const health = healthLabel(healthScore);

  // In showcase mode, "upgrade" actions scroll to top to encourage own analysis
  const handleShowcaseUpgrade = () => {
    onReset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onUpgradeAction = isShowcase ? handleShowcaseUpgrade : () => setShowUpgrade(true);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-12">
      {/* Back navigation */}
      <button
        onClick={() => { onReset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isShowcase ? "Voltar ao portfólio" : "Analisar outro perfil"}
      </button>

      {/* Profile header */}
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

      {/* Profile Health Score */}
      <ProfileHealthScore score={healthScore} health={health} isPremium={isPremium} onUpgrade={onUpgradeAction} />

      {limits && (
        <p className="text-muted-foreground text-xs text-center">
          {limits.posts_analyzed} posts analisados · {limits.note}
        </p>
      )}

      {/* 1. Bio Suggestion (now with AI analysis) */}
      <BioAnalysisSection bio={bio_suggestion} />

      {/* Latest Post — visible for free, no analysis, just metrics */}
      {latest_post && (
        <LatestPostCard post={latest_post} />
      )}

      {/* 2 & 3. Top & Worst Post — fully locked for free */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PostCard
          title="Melhor Post"
          icon={<ThumbsUp className="w-5 h-5 text-primary" />}
          post={top_post}
          accentClass="border-primary/30"
          locked={!showFullFreeContent}
          onClickAnalysis={() => {
            if (showFullFreeContent) setSelectedPost({ post: top_post, variant: "top" });
            else onUpgradeAction();
          }}
        />
        <PostCard
          title="Pior Post"
          icon={<ThumbsDown className="w-5 h-5 text-destructive" />}
          post={worst_post}
          accentClass="border-destructive/30"
          locked={!showFullFreeContent}
          onClickAnalysis={() => {
            if (showFullFreeContent) setSelectedPost({ post: worst_post, variant: "worst" });
            else onUpgradeAction();
          }}
        />
      </div>

      {/* Inline upgrade CTA for free users — after posts, curiosity-driven */}
      {!isPremium && !isShowcase && (
        <InlineUpgradeBanner
          handle={profile.handle}
          topScore={top_post.analysis?.nota_geral}
          worstScore={worst_post.analysis?.nota_geral}
          onUpgrade={onUpgradeAction}
        />
      )}

      {/* Showcase CTA — encourage own analysis */}
      {isShowcase && (
        <ShowcaseCTA onAnalyze={handleShowcaseUpgrade} handle={profile.handle} />
      )}

      {selectedPost && (
        <PostAnalysisModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost.post}
          variant={selectedPost.variant}
        />
      )}

      {/* 4. Weekly Content Plan */}
      {deliverables.weekly_content_plan && (
        <WeeklyContentSection
          plan={deliverables.weekly_content_plan}
          locked={!showFullFreeContent}
          onLockedClick={onUpgradeAction}
        />
      )}

      {/* 5. Stories Plan */}
      {deliverables.stories_plan && (
        <StoriesSection
          plan={deliverables.stories_plan}
          locked={!showFullFreeContent}
          onLockedClick={onUpgradeAction}
        />
      )}

      {/* 6. Hashtag Strategy */}
      {deliverables.hashtag_strategy && (
        <HashtagStrategySection
          data={deliverables.hashtag_strategy}
          locked={!showFullFreeContent}
          onLockedClick={onUpgradeAction}
        />
      )}

      {/* Final CTA for free users — after everything */}
      {!isPremium && !isShowcase && <FinalCTA handle={profile.handle} onUpgrade={onUpgradeAction} />}

      {/* Showcase final CTA */}
      {isShowcase && (
        <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 space-y-4 text-center">
          <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Quer ver a análise do <span className="text-gradient-brand">seu perfil</span>?
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Essa foi a análise de @{profile.handle}. Descubra o que está travando o <strong>seu</strong> crescimento com uma análise gratuita.
          </p>
          <button
            onClick={handleShowcaseUpgrade}
            className="w-full max-w-sm mx-auto h-12 rounded-lg bg-gradient-brand text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
          >
            Analisar meu perfil — grátis
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {!isShowcase && (
        <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} result={result} />
      )}

      {/* WhatsApp support for premium users */}
      {isPremium && (
        <div className="text-center">
          <a
            href="https://wa.me/NUMERO_PLACEHOLDER"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com suporte
          </a>
        </div>
      )}

      {/* Reset */}
      <div className="text-center pt-4">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-secondary text-foreground font-medium hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {resetLabel || "Nova análise"}
        </button>
      </div>
    </div>
  );
}

/* ─── Showcase CTA (replaces upgrade banner in showcase mode) ─ */

function ShowcaseCTA({ onAnalyze, handle }: { onAnalyze: () => void; handle: string }) {
  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3
            className="text-foreground font-bold text-base"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Essa é a análise de @{handle}. E a sua?
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Descubra o que está travando o seu crescimento com uma análise gratuita de bio, posts e estratégia.
          </p>
        </div>
      </div>
      <button
        onClick={onAnalyze}
        className="w-full h-11 rounded-lg bg-gradient-brand text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
      >
        Analisar meu perfil — grátis
        <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  );
}

