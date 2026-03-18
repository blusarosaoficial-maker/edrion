import {
  ThumbsUp,
  MessageCircle,
  Eye,
  TrendingUp,
  ExternalLink,
  Clock,
} from "lucide-react";
import type { PostData } from "@/types/analysis";
import { MetricItem } from "./PostCard";

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function LatestPostCard({ post }: { post: PostData }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Seu Último Post
        </h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={post.thumb_url}
            alt={post.caption_preview}
            className="w-full aspect-square rounded-lg object-cover bg-muted"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/6A5CFF?text=${encodeURIComponent(post.caption_preview?.slice(0, 20) || "Post")}`;
            }}
          />
        </div>
        <p className="text-sm text-foreground line-clamp-2">{post.caption_preview}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricItem icon={<ThumbsUp className="w-3.5 h-3.5" />} label="Likes" value={formatNum(post.metrics.likes)} />
          <MetricItem icon={<MessageCircle className="w-3.5 h-3.5" />} label="Comments" value={formatNum(post.metrics.comments)} />
          {post.metrics.views > 0 && (
            <MetricItem icon={<Eye className="w-3.5 h-3.5" />} label="Views" value={formatNum(post.metrics.views)} />
          )}
          <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="Engajamento" value={(post.metrics.engagement_score * 100).toFixed(2) + "%"} />
        </div>
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Ver no Instagram <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </section>
  );
}
