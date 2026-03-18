import { Target, Sparkles, ArrowRight } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

export function computeHealthScore(result: AnalysisResult): number {
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

export function healthLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 8) return { text: "Excelente", color: "text-emerald-400", bg: "from-emerald-500 to-emerald-400" };
  if (score >= 6) return { text: "Bom", color: "text-primary", bg: "from-primary to-violet-400" };
  if (score >= 4) return { text: "Regular", color: "text-yellow-500", bg: "from-yellow-500 to-amber-400" };
  return { text: "Precisa melhorar", color: "text-destructive", bg: "from-red-500 to-orange-500" };
}

interface Props {
  score: number;
  health: { text: string; color: string; bg: string };
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function ProfileHealthScore({ score, health, isPremium, onUpgrade }: Props) {
  const pct = Math.min(score * 10, 100);
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
        <div className="relative w-36 h-20 shrink-0">
          <svg viewBox="0 0 140 80" className="w-full h-full">
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="10"
              strokeLinecap="round"
            />
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
