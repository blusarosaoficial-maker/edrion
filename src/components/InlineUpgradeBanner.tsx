import { Zap, Search, Lightbulb, Target, ArrowRight } from "lucide-react";

interface Props {
  handle: string;
  topScore?: number;
  worstScore?: number;
  onUpgrade: () => void;
}

export default function InlineUpgradeBanner({ handle, topScore, worstScore, onUpgrade }: Props) {
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
          <span className="text-[11px] text-center text-muted-foreground">4 estratégias por objetivo</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] text-center text-muted-foreground">28 roteiros prontos</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] text-center text-muted-foreground">28 sequências de Stories</span>
        </div>
      </div>

      <button
        onClick={onUpgrade}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
      >
        Ver analise completa
        <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  );
}
