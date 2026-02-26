import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
  TrendingUp,
  Lightbulb,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Zap,
  Trophy,
  Medal,
  Circle,
  Search,
} from "lucide-react";
import type { AnalysisResult, PostData } from "@/types/analysis";
import BioAnalysisSection from "@/components/BioAnalysisSection";
import PostAnalysisModal from "@/components/PostAnalysisModal";
import WeeklyContentSection from "@/components/WeeklyContentSection";

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ResultView({ result, onReset }: Props) {
  const { profile, deliverables, limits } = result;
  const { bio_suggestion, top_post, worst_post, next_post_suggestion } = deliverables;
  const [selectedPost, setSelectedPost] = useState<{ post: PostData; variant: "top" | "worst" } | null>(null);

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

      {/* 2 & 3. Top & Worst Post */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PostCard
          title="Top Post"
          icon={<ThumbsUp className="w-5 h-5 text-primary" />}
          post={top_post}
          accentClass="border-primary/30"
          onClickAnalysis={() => setSelectedPost({ post: top_post, variant: "top" })}
        />
        <PostCard
          title="Worst Post"
          icon={<ThumbsDown className="w-5 h-5 text-destructive" />}
          post={worst_post}
          accentClass="border-destructive/30"
          onClickAnalysis={() => setSelectedPost({ post: worst_post, variant: "worst" })}
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
        <WeeklyContentSection plan={deliverables.weekly_content_plan} />
      )}

      {/* 5. Next Post Suggestion */}
      {next_post_suggestion && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Lightbulb className="w-5 h-5 text-accent" />
            <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Próximo Post
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                {next_post_suggestion.format}
              </span>
              <span className="text-xs text-muted-foreground">{next_post_suggestion.angle}</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Hook</p>
              <p className="text-foreground font-medium text-sm">"{next_post_suggestion.hook}"</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Roteiro</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/90">
                {next_post_suggestion.outline.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-foreground font-medium">CTA:</span>
              <span className="text-muted-foreground">{next_post_suggestion.cta}</span>
            </div>
          </div>
        </section>
      )}

      {/* Reset */}
      <div className="text-center pt-4">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-secondary text-foreground font-medium hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Nova análise
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
  onClickAnalysis,
}: {
  title: string;
  icon: React.ReactNode;
  post: PostData;
  accentClass: string;
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
              Toque para ver analise
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
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:text-primary/80 transition-colors">
            <Search className="w-3 h-3" /> Ver Analise Completa &rarr;
          </span>
        </div>
      </div>
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
