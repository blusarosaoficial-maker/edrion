import { useState } from "react";
import { Hash, Lock, Copy, Check } from "lucide-react";
import type { HashtagStrategy } from "@/types/analysis";

interface Props {
  data: HashtagStrategy;
  locked?: boolean;
  onLockedClick?: () => void;
}

const TIERS = [
  { key: "high_competition" as const, label: "Alta Competição", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  { key: "medium_competition" as const, label: "Média Competição", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { key: "low_competition" as const, label: "Baixa Competição", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
] as const;

export default function HashtagStrategySection({ data, locked, onLockedClick }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyTier = (key: string, hashtags: string[]) => {
    navigator.clipboard.writeText(hashtags.join(" "));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Hash className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Estratégia de Hashtags
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
            <span className="text-xs text-muted-foreground">Desbloquear estratégia de hashtags</span>
          </div>
        )}

        <div className={`p-5 space-y-4 ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}>
          {TIERS.map((tier) => {
            const hashtags = data[tier.key];
            if (!hashtags || hashtags.length === 0) return null;
            return (
              <div key={tier.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${tier.color}`}>{tier.label}</span>
                  <button
                    onClick={() => copyTier(tier.key, hashtags)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied === tier.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied === tier.key ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((tag) => (
                    <span key={tag} className={`px-2 py-0.5 rounded text-xs ${tier.bg} ${tier.border} border ${tier.color}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground italic">{data.usage_tip}</p>
        </div>
      </div>
    </section>
  );
}
