import { BarChart3, Lock } from "lucide-react";
import type { FormatMixRecommendation } from "@/types/analysis";

interface Props {
  data: FormatMixRecommendation;
  locked?: boolean;
  onLockedClick?: () => void;
}

const FORMAT_COLORS = {
  reels: { bar: "bg-violet-500", label: "Reels" },
  carousels: { bar: "bg-blue-500", label: "Carrossel" },
  stories: { bar: "bg-pink-500", label: "Stories" },
};

export default function FormatMixSection({ data, locked, onLockedClick }: Props) {
  const formats = [
    { key: "reels" as const, pct: data.reels_pct },
    { key: "carousels" as const, pct: data.carousels_pct },
    { key: "stories" as const, pct: data.stories_pct },
  ];

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Mix Ideal de Formatos
        </h3>
      </div>

      <div className="relative">
        {locked && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 cursor-pointer bg-background/60 backdrop-blur-sm"
            onClick={onLockedClick}
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">PRO</span>
            </div>
            <span className="text-xs text-muted-foreground">Desbloquear mix de formatos</span>
          </div>
        )}

        <div className={`p-5 space-y-4 ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <div className="space-y-3">
            {formats.map((f) => {
              const config = FORMAT_COLORS[f.key];
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{config.label}</span>
                    <span className="text-muted-foreground font-mono">{f.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground italic">{data.rationale}</p>
        </div>
      </div>
    </section>
  );
}
