import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Medal,
  Circle,
  Pin,
  Music,
  MapPin,
  Calendar,
  Video,
  Image,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PostData, PostRubric } from "@/types/analysis";

interface PostAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostData;
  variant: "top" | "worst";
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatDate(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const RUBRIC_LABELS: { key: keyof PostRubric; label: string }[] = [
  { key: "gancho", label: "Gancho / Hook" },
  { key: "legenda", label: "Legenda / Caption" },
  { key: "formato", label: "Formato" },
  { key: "engajamento", label: "Engajamento" },
  { key: "estrategia", label: "Estrategia" },
];

function scoreColor(v: number) {
  if (v >= 4) return "bg-primary";
  if (v >= 3) return "bg-yellow-500";
  return "bg-destructive";
}

function scoreTextColor(v: number) {
  if (v >= 4) return "text-primary";
  if (v >= 3) return "text-yellow-500";
  return "text-destructive";
}

function tierConfig(tier: "gold" | "silver" | "bronze") {
  switch (tier) {
    case "gold":
      return {
        label: "Gold",
        icon: <Trophy className="w-3.5 h-3.5" />,
        className: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
      };
    case "silver":
      return {
        label: "Silver",
        icon: <Medal className="w-3.5 h-3.5" />,
        className: "bg-slate-400/10 text-slate-400 border border-slate-400/20",
      };
    case "bronze":
      return {
        label: "Bronze",
        icon: <Circle className="w-3.5 h-3.5" />,
        className: "bg-orange-600/10 text-orange-600 border border-orange-600/20",
      };
  }
}

function postTypeIcon(type?: string) {
  switch (type) {
    case "Video": return <Video className="w-3.5 h-3.5" />;
    case "Sidecar": return <Layers className="w-3.5 h-3.5" />;
    default: return <Image className="w-3.5 h-3.5" />;
  }
}

function postTypeLabel(type?: string) {
  switch (type) {
    case "Video": return "Video / Reel";
    case "Sidecar": return "Carrossel";
    default: return "Imagem";
  }
}

export default function PostAnalysisModal({ isOpen, onClose, post, variant }: PostAnalysisModalProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const analysis = post.analysis;
  const tier = analysis?.classificacao || post.tier;
  const tierCfg = tier ? tierConfig(tier) : null;

  const isTop = variant === "top";
  const accentColor = isTop ? "text-primary" : "text-destructive";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden border-border bg-card p-0">
        <DialogDescription className="sr-only">
          Analise detalhada do {isTop ? "melhor" : "pior"} post
        </DialogDescription>
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-5">
            {/* Header */}
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className={accentColor}>
                  {isTop
                    ? <ThumbsUp className="w-5 h-5" />
                    : <ThumbsDown className="w-5 h-5" />}
                </span>
                <DialogTitle className="text-foreground font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {isTop ? "Top Post" : "Worst Post"}
                </DialogTitle>
                {tierCfg && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full ${tierCfg.className}`}>
                    {tierCfg.icon} {tierCfg.label}
                  </span>
                )}
                {analysis && (
                  <span className={`ml-auto px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    analysis.nota_geral >= 7 ? "bg-primary/10 text-primary" : analysis.nota_geral >= 4 ? "bg-yellow-500/10 text-yellow-600" : "bg-destructive/10 text-destructive"
                  }`}>
                    {analysis.nota_geral}/10
                  </span>
                )}
              </div>
            </DialogHeader>

            {/* Thumbnail */}
            <div className="relative">
              <img
                src={post.thumb_url}
                alt={post.caption_preview}
                className="w-full aspect-video rounded-lg object-cover bg-muted"
                loading="lazy"
              />
            </div>

            {/* Post meta */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {postTypeIcon(post.post_type)} {postTypeLabel(post.post_type)}
              </span>
              {post.timestamp && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(post.timestamp)}
                </span>
              )}
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Pin className="w-3.5 h-3.5" /> Fixado
                </span>
              )}
              {post.has_location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
              )}
              {post.music_info && (
                <span className="inline-flex items-center gap-1">
                  <Music className="w-3.5 h-3.5" /> {post.music_info}
                </span>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricBox icon={<Heart className="w-4 h-4" />} label="Likes" value={formatNum(post.metrics.likes)} />
              <MetricBox icon={<MessageCircle className="w-4 h-4" />} label="Comments" value={formatNum(post.metrics.comments)} />
              {post.metrics.views > 0 && (
                <MetricBox icon={<Eye className="w-4 h-4" />} label="Views" value={formatNum(post.metrics.views)} />
              )}
              <MetricBox icon={<TrendingUp className="w-4 h-4" />} label="Eng. Rate" value={post.metrics.engagement_score.toFixed(4)} />
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legenda</p>
              <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border whitespace-pre-line">
                {post.full_caption || post.caption_preview}
              </p>
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.hashtags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AI Analysis Section */}
            {analysis ? (
              <>
                {/* Rubric */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rubrica de Avaliacao</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-lg bg-secondary border border-border">
                    {RUBRIC_LABELS.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{label}</span>
                          <span className={`text-xs font-bold ${scoreTextColor(analysis.rubrica[key])}`}>
                            {analysis.rubrica[key]}/5
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${scoreColor(analysis.rubrica[key])}`}
                            style={{ width: `${analysis.rubrica[key] * 20}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Summary */}
                <div className={`p-3 rounded-lg border ${isTop ? "bg-primary/5 border-primary/10" : "bg-accent/10 border-accent/20"}`}>
                  <p className={`text-xs font-medium mb-1 ${isTop ? "text-primary" : "text-accent"}`}>
                    Resumo de Performance
                  </p>
                  <p className="text-sm text-foreground/80">{analysis.resumo_desempenho}</p>
                </div>

                {/* Performance Drivers */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fatores de Performance</p>
                  <div className="space-y-1.5">
                    {analysis.fatores_positivos.map((f, i) => (
                      <div key={`pos-${i}`} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </div>
                    ))}
                    {analysis.fatores_negativos.map((f, i) => (
                      <div key={`neg-${i}`} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Analysis (Collapsible) */}
                <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                    <span className="text-sm font-medium text-foreground flex-1">Analise Detalhada</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${detailOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <DetailBlock title="Gancho / Hook" text={analysis.analise_gancho} />
                    <DetailBlock title="Legenda / Caption" text={analysis.analise_legenda} />
                    <DetailBlock title="Formato" text={analysis.analise_formato} />
                    <DetailBlock title="Hashtags" text={analysis.analise_hashtags} />
                    {analysis.analise_audio && analysis.analise_audio !== "N/A" && (
                      <DetailBlock title="Audio / Fala" text={analysis.analise_audio} />
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Audio Transcription (collapsible) */}
                {post.transcription && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                      <Music className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1">Transcricao do Audio</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border whitespace-pre-line">
                        {post.transcription}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Transcription skipped message */}
                {post.transcription_skipped && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
                    <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">{post.transcription_skipped}</p>
                  </div>
                )}

                {/* Recommendations */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recomendacoes</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/80 pl-1">
                    {analysis.recomendacoes.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary border border-border text-center space-y-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    Analise de IA indisponivel
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A analise detalhada nao pode ser gerada neste momento.
                    Isso pode ocorrer por instabilidade temporaria do servico de IA.
                    Tente uma nova analise em alguns minutos.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resumo Rapido
                  </p>
                  <div className={`p-3 rounded-lg border ${isTop ? "bg-primary/5 border-primary/10" : "bg-accent/10 border-accent/20"}`}>
                    <p className="text-sm text-foreground/80">
                      {isTop
                        ? `Este foi o post com melhor engajamento entre os analisados, com taxa de ${post.metrics.engagement_score.toFixed(4)}.${post.metrics.views > 0 ? ` O conteudo alcancou ${formatNum(post.metrics.views)} visualizacoes.` : ` Recebeu ${formatNum(post.metrics.likes)} curtidas.`}`
                        : `Este post teve o menor engajamento entre os analisados, com taxa de ${post.metrics.engagement_score.toFixed(4)}.${post.post_type === "Image" ? " Considere testar formatos de video/reel para ampliar o alcance." : ""}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instagram Link */}
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Ver no Instagram <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary border border-border">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50 border border-border">
      <p className="text-xs font-semibold text-primary mb-1">{title}</p>
      <p className="text-sm text-foreground/80">{text}</p>
    </div>
  );
}
