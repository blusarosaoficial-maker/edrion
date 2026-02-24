import {
  FileText,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import type { BioSuggestion } from "@/types/analysis";

interface Props {
  bio: BioSuggestion;
}

function CriteriaItem({ label, value }: { label: string; value: string }) {
  const present = value === "Presente";
  return (
    <div className="flex items-center gap-2 text-sm">
      {present ? (
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
      )}
      <span className="text-foreground">{label}</span>
      <span className={`ml-auto text-xs font-medium ${present ? "text-primary" : "text-destructive"}`}>
        {value}
      </span>
    </div>
  );
}

export default function BioAnalysisSection({ bio }: Props) {
  const hasAI = bio.score !== undefined;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Sugestão de Bio
        </h3>
        {hasAI && (
          <span className="ml-auto px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
            {bio.score}/10
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        {/* AI Criteria */}
        {hasAI && bio.criteria && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary border border-border">
            <CriteriaItem label="Profissão/Nome" value={bio.criteria.profession_name} />
            <CriteriaItem label="Serviço" value={bio.criteria.service} />
            <CriteriaItem label="Autoridade" value={bio.criteria.authority} />
            <CriteriaItem label="Call to Action" value={bio.criteria.call_to_action} />
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
            </div>
            <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border">
              {bio.current_bio}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Sugerida
            </div>
            <p className="text-sm text-foreground bg-primary/10 rounded-lg p-3 border border-primary/20">
              {bio.suggested_bio}
            </p>
          </div>
        </div>
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
