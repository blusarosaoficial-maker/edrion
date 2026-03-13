import { useState, useEffect } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
  TrendingUp,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Trophy,
  Medal,
  Circle,
  Search,
  Lock,
  Crown,
  Sparkles,
  Clock,
  ArrowRight,
  Lightbulb,
  Target,
  Zap,
  AlertTriangle,
} from "lucide-react";
import type { AnalysisResult, PostData } from "@/types/analysis";
import BioAnalysisSection from "@/components/BioAnalysisSection";
import PostAnalysisModal from "@/components/PostAnalysisModal";
import WeeklyContentSection from "@/components/WeeklyContentSection";
import UpgradeModal from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import { appendUtmToCheckout } from "@/utils/hotmartUtm";
import { trackInitiateCheckout } from "@/utils/pixel";

interface Props {
  result: AnalysisResult;
  onReset: () => void;
  resetLabel?: string;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/G104699811K?bid=1772370414415";

function computeHealthScore(result: AnalysisResult): number {
  const scores: number[] = [];
  if (result.deliverables.bio_suggestion.score !== undefined) {
    scores.push(result.deliverables.bio_suggestion.score);
  }
  const topScore = result.deliverables.top_post.analysis?.nota_geral;
  if (topScore !== undefined) scores.push(topScore);
  const worstScore = result.deliverables.worst_post.analysis?.nota_geral;
  if (worstScore !== undefined) scores.push(worstScore);
  if (scores.length === 0) return 5;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function healthLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 8) return { text: "Excelente", color: "text-emerald-400", bg: "from-emerald-500 to-emerald-400" };
  if (score >= 6) return { text: "Bom", color: "text-primary", bg: "from-primary to-violet-400" };
  if (score >= 4) return { text: "Regular", color: "text-yellow-500", bg: "from-yellow-500 to-amber-400" };
  return { text: "Precisa melhorar", color: "text-destructive", bg: "from-red-500 to-orange-500" };
}

export default function ResultView({ result, onReset, resetLabel }: Props) {
  const { user } = useAuth();
  const { profile, deliverables, limits } = result;
  const { bio_suggestion, top_post, worst_post } = deliverables;
  const isPremium = result.plan === "premium";
  const [selectedPost, setSelectedPost] = useState<{ post: PostData; variant: "top" | "worst" } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const healthScore = computeHealthScore(result);
  const health = healthLabel(healthScore);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-12">
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
      <ProfileHealthScore score={healthScore} health={health} isPremium={isPremium} onUpgrade={() => setShowUpgrade(true)} />

      {limits && (
        <p className="text-muted-foreground text-xs text-center">
          {limits.posts_analyzed} posts analisados · {limits.note}
        </p>
      )}

      {/* 1. Bio Suggestion (now with AI analysis) */}
      <BioAnalysisSection bio={bio_suggestion} />

      {/* 2 & 3. Top & Worst Post */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PostCard
          title="Melhor Post"
          icon={<ThumbsUp className="w-5 h-5 text-primary" />}
          post={top_post}
          accentClass="border-primary/30"
          locked={!isPremium}
          showPositiveFactors={!isPremium}
          onClickAnalysis={() => {
            if (isPremium) setSelectedPost({ post: top_post, variant: "top" });
            else setShowUpgrade(true);
          }}
        />
        <PostCard
          title="Pior Post"
          icon={<ThumbsDown className="w-5 h-5 text-destructive" />}
          post={worst_post}
          accentClass="border-destructive/30"
          locked={!isPremium}
          onClickAnalysis={() => {
            if (isPremium) setSelectedPost({ post: worst_post, variant: "worst" });
            else setShowUpgrade(true);
          }}
        />
      </div>

      {/* Inline upgrade CTA for free users — after posts, curiosity-driven */}
      {!isPremium && (
        <InlineUpgradeBanner
          handle={profile.handle}
          userEmail={user?.email}
          topScore={top_post.analysis?.nota_geral}
          worstScore={worst_post.analysis?.nota_geral}
        />
      )}

      {/* Blurred next post suggestion for free users */}
      {!isPremium && deliverables.next_post_suggestion && (
        <BlurredNextPost
          suggestion={deliverables.next_post_suggestion}
          onUpgrade={() => setShowUpgrade(true)}
        />
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
          locked={!isPremium}
          onLockedClick={() => setShowUpgrade(true)}
        />
      )}

      {/* Final CTA for free users — after everything */}
      {!isPremium && <FinalCTA handle={profile.handle} userEmail={user?.email} />}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} result={result} />

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

/* ─── Profile Health Score ─────────────────────────────────── */

function ProfileHealthScore({
  score,
  health,
  isPremium,
  onUpgrade,
}: {
  score: number;
  health: { text: string; color: string; bg: string };
  isPremium: boolean;
  onUpgrade: () => void;
}) {
  const pct = Math.min(score * 10, 100);
  // SVG arc for semicircle gauge
  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Saude do Perfil
        </h3>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Gauge */}
        <div className="relative w-36 h-20 shrink-0">
          <svg viewBox="0 0 140 80" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Score arc */}
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none"
              stroke="url(#healthGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#eab308" />
                <stop offset="70%" stopColor="#6A5CFF" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
            <span className={`text-2xl font-bold ${health.color}`}>{score}</span>
            <span className="text-[10px] text-muted-foreground">/10</span>
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <p className={`text-sm font-bold ${health.color}`}>{health.text}</p>
          <p className="text-xs text-muted-foreground">
            Nota calculada a partir da sua bio, melhor e pior post.
            {!isPremium && " Desbloqueie a analise completa para entender cada ponto e como melhorar."}
          </p>
          {!isPremium && (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Ver como melhorar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Blurred Next Post Suggestion ─────────────────────────── */

function BlurredNextPost({
  suggestion,
  onUpgrade,
}: {
  suggestion: { format: string; hook: string; outline: string[]; cta: string; angle: string };
  onUpgrade: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Proximo Post Sugerido
        </h3>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
          <Lock className="w-2.5 h-2.5" /> PRO
        </span>
      </div>
      <div className="relative p-5">
        {/* Blurred content preview */}
        <div className="space-y-3 blur-[6px] select-none pointer-events-none" aria-hidden>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary">{suggestion.format}</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-accent/10 text-accent">{suggestion.angle}</span>
          </div>
          <p className="text-sm text-foreground font-medium">"{suggestion.hook}"</p>
          <div className="space-y-1.5">
            {suggestion.outline.map((item, i) => (
              <p key={i} className="text-sm text-foreground/70">{i + 1}. {item}</p>
            ))}
          </div>
          <p className="text-sm text-foreground/60">CTA: {suggestion.cta}</p>
        </div>
        {/* Overlay */}
        <div
          onClick={onUpgrade}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/80 flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Seu proximo post ja foi planejado
            </span>
            <span className="text-xs text-muted-foreground">
              Hook, roteiro e CTA prontos para usar
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Tier Badge ───────────────────────────────────────────── */

function tierBadge(tier?: "gold" | "silver" | "bronze") {
  if (!tier) return null;
  const cfg = {
    gold: { label: "Gold", icon: <Trophy className="w-3 h-3" />, cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    silver: { label: "Silver", icon: <Medal className="w-3 h-3" />, cls: "bg-slate-400/10 text-slate-400 border-slate-400/20" },
    bronze: { label: "Bronze", icon: <Circle className="w-3 h-3" />, cls: "bg-orange-600/10 text-orange-600 border-orange-600/20" },
  }[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ─── Post Card ────────────────────────────────────────────── */

function PostCard({
  title,
  icon,
  post,
  accentClass,
  locked,
  showPositiveFactors,
  onClickAnalysis,
}: {
  title: string;
  icon: React.ReactNode;
  post: PostData;
  accentClass: string;
  locked?: boolean;
  showPositiveFactors?: boolean;
  onClickAnalysis: () => void;
}) {
  const tier = post.analysis?.classificacao || post.tier;
  const score = post.analysis?.nota_geral;
  const positives = post.analysis?.fatores_positivos;

  return (
    <section className={`rounded-xl border bg-card overflow-hidden ${accentClass} cursor-pointer hover:border-primary/50 hover:scale-[1.01] transition-all duration-200 group`} onClick={onClickAnalysis}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        {icon}
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h3>
        {tierBadge(tier)}
        {score !== undefined && (
          <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
            score >= 7 ? "bg-primary/10 text-primary" : score >= 4 ? "bg-yellow-500/10 text-yellow-600" : "bg-destructive/10 text-destructive"
          }`}>
            {score}/10
          </span>
        )}
        {locked && (
          <span className={`${score === undefined ? "ml-auto" : ""} inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20`}>
            <Lock className="w-2.5 h-2.5" /> PRO
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={post.thumb_url}
            alt={post.caption_preview}
            className="w-full aspect-square rounded-lg object-cover bg-muted transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-white text-xs font-medium backdrop-blur-sm px-2 py-0.5 rounded">
              {locked ? "Toque para desbloquear" : "Toque para ver analise"}
            </span>
          </div>
        </div>
        <p className="text-sm text-foreground line-clamp-2">{post.caption_preview}</p>

        {/* Free preview: show positive factors for top post */}
        {showPositiveFactors && positives && positives.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Por que performou bem</p>
            {positives.slice(0, 2).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/80">{f}</span>
              </div>
            ))}
            {positives.length > 2 && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                +{positives.length - 2} insights · fatores negativos · recomendacoes
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricItem icon={<ThumbsUp className="w-3.5 h-3.5" />} label="Likes" value={formatNum(post.metrics.likes)} />
          <MetricItem icon={<MessageCircle className="w-3.5 h-3.5" />} label="Comments" value={formatNum(post.metrics.comments)} />
          {post.metrics.views > 0 && (
            <MetricItem icon={<Eye className="w-3.5 h-3.5" />} label="Views" value={formatNum(post.metrics.views)} />
          )}
          <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="Score" value={post.metrics.engagement_score.toFixed(4)} />
        </div>
        <div className="flex items-center justify-between">
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver no Instagram <ExternalLink className="w-3 h-3" />
          </a>
          {locked ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
              <Lock className="w-3 h-3" /> Desbloquear Analise
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:text-primary/80 transition-colors">
              <Search className="w-3 h-3" /> Ver Analise Completa &rarr;
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Countdown Hook ───────────────────────────────────────── */

function useCountdown() {
  const PROMO_KEY = "edrion_promo_start";
  const PROMO_DURATION = 24 * 60 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState("23:59:59");

  useEffect(() => {
    if (!sessionStorage.getItem(PROMO_KEY)) {
      sessionStorage.setItem(PROMO_KEY, String(Date.now()));
    }

    const tick = () => {
      const start = Number(sessionStorage.getItem(PROMO_KEY) || Date.now());
      const remaining = Math.max(0, PROMO_DURATION - (Date.now() - start));
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

/* ─── Inline Upgrade Banner (curiosity-driven, no price) ───── */

function InlineUpgradeBanner({
  handle,
  userEmail,
  topScore,
  worstScore,
}: {
  handle: string;
  userEmail?: string | null;
  topScore?: number;
  worstScore?: number;
}) {
  const baseUrl = userEmail
    ? `${HOTMART_CHECKOUT_URL}&email=${encodeURIComponent(userEmail)}`
    : HOTMART_CHECKOUT_URL;
  const checkoutUrl = appendUtmToCheckout(baseUrl);

  const hasScores = topScore !== undefined && worstScore !== undefined;
  const scoreDiff = hasScores ? Math.abs(topScore - worstScore).toFixed(1) : null;

  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3
            className="text-foreground font-bold text-base"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {hasScores
              ? `@${handle}, tem ${scoreDiff} pontos separando seu melhor do pior post.`
              : `@${handle}, encontramos padres que voce pode replicar.`}
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Descubra exatamente o que fez seu melhor post funcionar, o que travou o pior, e receba um plano de 7 dias personalizado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border">
          <Search className="w-4 h-4 text-primary" />
          <span className="text-[11px] text-center text-muted-foreground">Analise completa dos posts</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] text-center text-muted-foreground">Roteiros prontos para 7 dias</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] text-center text-muted-foreground">Hooks e legendas para copiar</span>
        </div>
      </div>

      <button
        onClick={() => { trackInitiateCheckout(); window.open(checkoutUrl, "_blank"); }}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
      >
        Ver analise completa
        <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  );
}

/* ─── Final CTA (after everything, urgency + social proof) ── */

function FinalCTA({ handle, userEmail }: { handle: string; userEmail?: string | null }) {
  const timeLeft = useCountdown();
  const baseUrl = userEmail
    ? `${HOTMART_CHECKOUT_URL}&email=${encodeURIComponent(userEmail)}`
    : HOTMART_CHECKOUT_URL;
  const checkoutUrl = appendUtmToCheckout(baseUrl);

  return (
    <section className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5 p-6 space-y-5">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Voce viu o diagnostico. Agora veja a solucao.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A analise completa inclui tudo que voce precisa para transformar seu perfil em 7 dias — posts analisados em profundidade, roteiros prontos e bio otimizada.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
            50% OFF
          </span>
          <span className="text-muted-foreground line-through text-sm">R$51,94</span>
          <span className="text-xl font-bold text-foreground">R$25,97</span>
        </div>

        <button
          onClick={() => { trackInitiateCheckout(); window.open(checkoutUrl, "_blank"); }}
          className="w-full max-w-sm h-12 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
        >
          <Lock className="w-4 h-4" />
          Desbloquear Meu Relatorio
        </button>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Expira em <strong className="text-amber-400 font-mono">{timeLeft}</strong></span>
          </div>
          <span>·</span>
          <span>Pagamento unico</span>
          <span>·</span>
          <span>Garantia 7 dias</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Metric Item ──────────────────────────────────────────── */

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs">{label}</span>
      <span className="ml-auto text-foreground font-medium text-xs">{value}</span>
    </div>
  );
}
