import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
  TrendingUp,
  Lightbulb,
  FileText,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

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

      <p className="text-muted-foreground text-xs text-center">
        {limits.posts_analyzed} posts analisados · {limits.note}
      </p>

      {/* 1. Bio Suggestion */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Sugestão de Bio
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 text-destructive" /> Atual
              </div>
              <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border">
                {bio_suggestion.current_bio}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Sugerida
              </div>
              <p className="text-sm text-foreground bg-primary/10 rounded-lg p-3 border border-primary/20">
                {bio_suggestion.suggested_bio}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            💡 {bio_suggestion.rationale_short}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-foreground font-medium">CTA sugerido:</span>
            <span className="text-muted-foreground">{bio_suggestion.cta_option}</span>
          </div>
        </div>
      </section>

      {/* 2 & 3. Top & Worst Post */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Post */}
        <PostCard
          title="Top Post"
          icon={<ThumbsUp className="w-5 h-5 text-primary" />}
          post={top_post}
          accentClass="border-primary/30"
        />
        {/* Worst Post */}
        <PostCard
          title="Worst Post"
          icon={<ThumbsDown className="w-5 h-5 text-destructive" />}
          post={worst_post}
          accentClass="border-destructive/30"
        />
      </div>

      {/* 4. Next Post Suggestion */}
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

function PostCard({
  title,
  icon,
  post,
  accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  post: AnalysisResult["deliverables"]["top_post"];
  accentClass: string;
}) {
  return (
    <section className={`rounded-xl border bg-card overflow-hidden ${accentClass}`}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        {icon}
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h3>
      </div>
      <div className="p-5 space-y-4">
        <img
          src={post.thumb_url}
          alt={post.caption_preview}
          className="w-full aspect-square rounded-lg object-cover bg-muted"
          loading="lazy"
        />
        <p className="text-sm text-foreground line-clamp-2">{post.caption_preview}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricItem icon={<ThumbsUp className="w-3.5 h-3.5" />} label="Likes" value={formatNum(post.metrics.likes)} />
          <MetricItem icon={<MessageCircle className="w-3.5 h-3.5" />} label="Comments" value={formatNum(post.metrics.comments)} />
          {post.metrics.views > 0 && (
            <MetricItem icon={<Eye className="w-3.5 h-3.5" />} label="Views" value={formatNum(post.metrics.views)} />
          )}
          <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="Score" value={post.metrics.engagement_score.toFixed(4)} />
        </div>
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          Ver no Instagram <ExternalLink className="w-3 h-3" />
        </a>
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
