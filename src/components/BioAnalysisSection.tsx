import {
  FileText,
  CheckCircle2,
  XCircle,
  Zap,
  Mic,
  Search,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from "lucide-react";
import type { BioSuggestion, BioCriteria, BioDiagnostic } from "@/types/analysis";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface Props {
  bio: BioSuggestion;
}

const CRITERIA_LABELS: { key: keyof BioCriteria; label: string }[] = [
  { key: "clarity", label: "Clareza" },
  { key: "authority", label: "Autoridade" },
  { key: "cta", label: "Força do CTA" },
  { key: "seo", label: "SEO / Descoberta" },
  { key: "brand_voice", label: "Voz da Marca" },
  { key: "specificity", label: "Especificidade" },
];

const DIAGNOSTIC_LABELS: { key: keyof BioDiagnostic; label: string }[] = [
  { key: "proposta_valor", label: "Proposta de Valor" },
  { key: "segmentacao_publico", label: "Segmentação de Público" },
  { key: "gatilhos_autoridade", label: "Gatilhos e Autoridade" },
  { key: "cta_conversao", label: "CTA e Conversão" },
  { key: "seo_instagram", label: "SEO no Instagram" },
  { key: "tom_de_voz", label: "Tom de Voz" },
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

function RubricItem({ label, value, compareValue }: { label: string; value: number; compareValue?: number }) {
  const diff = compareValue !== undefined ? compareValue - value : undefined;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold ${scoreTextColor(value)}`}>{value}/5</span>
          {diff !== undefined && diff !== 0 && (
            <span className={`text-xs font-bold flex items-center gap-0.5 ${diff > 0 ? "text-primary" : "text-destructive"}`}>
              {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {diff > 0 ? "+" : ""}{diff}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(value)}`}
          style={{ width: `${value * 20}%` }}
        />
      </div>
    </div>
  );
}

export default function BioAnalysisSection({ bio }: Props) {
  const hasAI = bio.score !== undefined;
  const [diagOpen, setDiagOpen] = useState(false);
  const bioTooLong = bio.suggested_bio.length > 149;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header with comparative scores */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Análise de Bio
        </h3>
        {hasAI && (
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              (bio.score ?? 0) >= 7 ? "bg-primary/10 text-primary" : (bio.score ?? 0) >= 4 ? "bg-yellow-500/10 text-yellow-600" : "bg-destructive/10 text-destructive"
            }`}>
              {bio.score}/10
            </span>
            {bio.score_new !== undefined && (
              <>
                <span className="text-muted-foreground text-xs">→</span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
                  {bio.score_new}/10
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* 6-criteria rubric - Bio Atual */}
        {hasAI && bio.criteria && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rubrica — Bio Atual</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-lg bg-secondary border border-border">
              {CRITERIA_LABELS.map(({ key, label }) => (
                <RubricItem
                  key={key}
                  label={label}
                  value={bio.criteria![key]}
                  compareValue={bio.criteria_new?.[key]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Diagnostic analysis (collapsible) */}
        {hasAI && bio.diagnostic && (
          <Collapsible open={diagOpen} onOpenChange={setDiagOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors">
              <Lightbulb className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">Análise Diagnóstica</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${diagOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {DIAGNOSTIC_LABELS.map(({ key, label }) => (
                <div key={key} className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs font-semibold text-primary mb-1">{label}</p>
                  <p className="text-sm text-foreground/80">{bio.diagnostic![key]}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Detected tone */}
        {hasAI && bio.detected_tone && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
            <Mic className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">
              <span className="font-medium">Tom identificado:</span>{" "}
              <span className="text-muted-foreground">{bio.detected_tone}</span>
            </span>
          </div>
        )}

        {/* Name keyword suggestion */}
        {hasAI && bio.name_keyword && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">
              <span className="font-medium">Sugestão para Nome:</span>{" "}
              <span className="text-muted-foreground">{bio.name_keyword}</span>
            </span>
          </div>
        )}

        {/* Strengths & Improvements */}
        {hasAI && bio.strengths && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-1">Pontos Fortes</p>
            <p className="text-sm text-foreground/80">{bio.strengths}</p>
          </div>
        )}
        {hasAI && bio.improvements && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs font-medium text-accent mb-1">Pontos de Melhoria</p>
            <p className="text-sm text-foreground/80">{bio.improvements}</p>
          </div>
        )}

        {/* Bio comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <XCircle className="w-3.5 h-3.5 text-destructive" /> Atual
              {hasAI && bio.score !== undefined && (
                <span className="ml-auto text-xs font-bold text-muted-foreground">{bio.score}/10</span>
              )}
            </div>
            <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border whitespace-pre-line">
              {bio.current_bio}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Sugerida
              {bio.score_new !== undefined && (
                <span className="ml-auto text-xs font-bold text-primary">{bio.score_new}/10</span>
              )}
            </div>
            <p className="text-sm text-foreground bg-primary/10 rounded-lg p-3 border border-primary/20 whitespace-pre-line">
              {bioTooLong ? bio.suggested_bio.slice(0, 149) : bio.suggested_bio}
            </p>
            {bioTooLong && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" />
                Bio truncada (original: {bio.suggested_bio.length} chars, limite: 149)
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">{Math.min(bio.suggested_bio.length, 149)}/149 chars</p>
          </div>
        </div>

        {/* Bio Variations */}
        {bio.variations && bio.variations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Variações Estratégicas
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {bio.variations.map((v, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary border border-border space-y-2">
                  <span className="text-xs font-bold text-primary">{v.label}</span>
                  <p className="text-sm text-foreground whitespace-pre-line">{v.bio}</p>
                  <p className="text-xs text-muted-foreground italic">{v.rationale}</p>
                  <p className="text-xs text-muted-foreground text-right">{v.bio.length}/149 chars</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rubric - Bio Nova */}
        {hasAI && bio.criteria_new && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rubrica — Bio Sugerida</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              {CRITERIA_LABELS.map(({ key, label }) => (
                <RubricItem
                  key={key}
                  label={label}
                  value={bio.criteria_new![key]}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          💡 {bio.rationale_short}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-foreground font-medium">CTA sugerido:</span>
          <span className="text-muted-foreground">{bio.cta_option}</span>
        </div>
      </div>
    </section>
  );
}
