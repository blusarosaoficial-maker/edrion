import {
  ThumbsUp,
  MessageCircle,
  Eye,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Trophy,
  Medal,
  Circle,
  Search,
  Lock,
} from "lucide-react";
import type { PostData } from "@/types/analysis";

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs">{label}</span>
      <span className="ml-auto text-foreground font-medium text-xs">{value}</span>
    </div>
  );
}

export function tierBadge(tier?: "gold" | "silver" | "bronze") {
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

interface PostCardProps {
  title: string;
  icon: React.ReactNode;
  post: PostData;
  accentClass: string;
  locked?: boolean;
  showPositiveFactors?: boolean;
  onClickAnalysis: () => void;
}

export default function PostCard({
  title,
  icon,
  post,
  accentClass,
  locked,
  showPositiveFactors,
  onClickAnalysis,
}: PostCardProps) {
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
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/6A5CFF?text=${encodeURIComponent(post.caption_preview?.slice(0, 20) || "Post")}`;
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-white text-xs font-medium backdrop-blur-sm px-2 py-0.5 rounded">
              {locked ? "Toque para desbloquear" : "Toque para ver analise"}
            </span>
          </div>
        </div>
        <p className="text-sm text-foreground line-clamp-2">{post.caption_preview}</p>

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
          <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="Engajamento" value={(post.metrics.engagement_score * 100).toFixed(2) + "%"} />
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
