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

export default function ResultView({ result, onReset, resetLabel }: Props) {
  const { user } = useAuth();
  const { profile, deliverables, limits } = result;
  const { bio_suggestion, top_post, worst_post } = deliverables;
  const isPremium = result.plan === "premium";
  const [selectedPost, setSelectedPost] = useState<{ post: PostData; variant: "top" | "worst" } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

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

      {limits && (
        <p className="text-muted-foreground text-xs text-center">
          {limits.posts_analyzed} posts analisados · {limits.note}
        </p>
      )}

      {/* 1. Bio Suggestion (now with AI analysis) */}
      <BioAnalysisSection bio={bio_suggestion} />

      {/* Inline upgrade banner for free users */}
      {!isPremium && <InlineUpgradeBanner handle={profile.handle} userEmail={user?.email} />}

      {/* 2 & 3. Top & Worst Post */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PostCard
          title="Melhor Post"
          icon={<ThumbsUp className="w-5 h-5 text-primary" />}
          post={top_post}
          accentClass="border-primary/30"
          locked={!isPremium}
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

function PostCard({
  title,
  icon,
  post,
  accentClass,
  locked,
  onClickAnalysis,
}: {
  title: string;
  icon: React.ReactNode;
  post: PostData;
  accentClass: string;
  locked?: boolean;
  onClickAnalysis: () => void;
}) {
  const tier = post.analysis?.classificacao || post.tier;
  const score = post.analysis?.nota_geral;

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
              <Lock className="w-3 h-3" /> Desbloquear Análise
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

function InlineUpgradeBanner({ handle, userEmail }: { handle: string; userEmail?: string | null }) {
  const timeLeft = useCountdown();
  const baseUrl = userEmail
    ? `${HOTMART_CHECKOUT_URL}&email=${encodeURIComponent(userEmail)}`
    : HOTMART_CHECKOUT_URL;
  const checkoutUrl = appendUtmToCheckout(baseUrl);

  return (
    <section className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3
            className="text-foreground font-bold text-base"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            @{handle}, seu diagnóstico revelou oportunidades.
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Desbloqueie a análise completa dos seus posts, plano de 7 dias com roteiros prontos e mais.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => { trackInitiateCheckout(); window.open(checkoutUrl, "_blank"); }}
          className="w-full sm:w-auto h-11 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
        >
          <Lock className="w-4 h-4" />
          Desbloquear por R$25,97
        </button>
        <div className="flex items-center gap-1.5 text-muted-foreground/70 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Preço promocional expira em <strong className="text-amber-400">{timeLeft}</strong></span>
        </div>
      </div>

      <p className="text-muted-foreground/50 text-[11px] text-center sm:text-left">
        Pagamento único · sem assinatura · garantia de 7 dias
      </p>
    </section>
  );
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs">{label}</span>
      <span className="ml-auto text-foreground font-medium text-xs">{value}</span>
    </div>
  );
}
