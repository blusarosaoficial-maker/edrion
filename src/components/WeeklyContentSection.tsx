import { useState } from "react";
import {
  ChevronDown,
  Play,
  Layers,
  Sparkles,
  Hash,
  Copy,
  Check,
  Film,
  Clapperboard,
  Lock,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OBJECTIVE_TABS } from "@/constants/objectives";
import type { WeeklyContentPlan, ContentScript, ObjectiveKey } from "@/types/analysis";
import { Lightbulb } from "lucide-react";

interface Props {
  plan: WeeklyContentPlan;
  locked?: boolean;
  onLockedClick?: () => void;
  objectivePlans?: Record<ObjectiveKey, WeeklyContentPlan>;
  selectedObjetivo?: ObjectiveKey;
}

const DAY_COLORS: Record<number, string> = {
  1: "from-violet-500/20 to-violet-600/5 border-violet-500/30",
  2: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  3: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
  4: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
  5: "from-rose-500/20 to-rose-600/5 border-rose-500/30",
  6: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
  7: "from-fuchsia-500/20 to-fuchsia-600/5 border-fuchsia-500/30",
};

const DAY_ACCENT: Record<number, string> = {
  1: "text-violet-400",
  2: "text-blue-400",
  3: "text-emerald-400",
  4: "text-amber-400",
  5: "text-rose-400",
  6: "text-cyan-400",
  7: "text-fuchsia-400",
};

const FRAMEWORK_BADGE: Record<string, string> = {
  "Hook-Value-CTA": "bg-primary/10 text-primary",
  "PAS": "bg-orange-500/10 text-orange-400",
  "BAB": "bg-emerald-500/10 text-emerald-400",
  "AIDA": "bg-amber-500/10 text-amber-400",
  "Storytelling": "bg-pink-500/10 text-pink-400",
  "Mito vs Realidade": "bg-cyan-500/10 text-cyan-400",
  "Lista/Ranking": "bg-violet-500/10 text-violet-400",
};

function WeeklyPlanContent({ plan }: { plan: WeeklyContentPlan }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs text-muted-foreground">Adapte os roteiros para o seu produto/serviço</span>
      </div>
      {plan.scripts.map((script) => (
        <DayCard
          key={script.dia}
          script={script}
          isExpanded={expandedDay === script.dia}
          onToggle={() =>
            setExpandedDay(expandedDay === script.dia ? null : script.dia)
          }
        />
      ))}
    </div>
  );
}

export default function WeeklyContentSection({ plan, locked, onLockedClick, objectivePlans, selectedObjetivo }: Props) {
  const hasObjectives = objectivePlans && Object.keys(objectivePlans).length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
          <Clapperboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3
            className="text-foreground font-bold text-lg"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {hasObjectives ? "Roteiros por Objetivo" : "Sua Semana de Conteúdo"}
          </h3>
          <p className="text-muted-foreground text-xs">
            {hasObjectives ? "28 roteiros completos — 7 para cada estratégia" : plan.estrategia_semanal}
          </p>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 ml-auto">
            <Lock className="w-2.5 h-2.5" /> PRO
          </span>
        )}
      </div>

      {locked ? (
        <div className="relative">
          <div className="space-y-3 opacity-75 pointer-events-none select-none">
            {plan.scripts.map((script) => (
              <LockedDayCard key={script.dia} script={script} />
            ))}
          </div>
          <div
            onClick={onLockedClick}
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/60 flex flex-col items-center justify-center cursor-pointer rounded-xl"
          >
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Desbloquear plano completo
              </span>
              <span className="text-xs text-muted-foreground">
                {hasObjectives ? "28 roteiros prontos — 7 para cada objetivo" : "7 roteiros prontos com hooks, legendas e hashtags"}
              </span>
            </div>
          </div>
        </div>
      ) : hasObjectives ? (
        <Tabs defaultValue={selectedObjetivo || "crescer"}>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            {OBJECTIVE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-1.5 text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {OBJECTIVE_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              {objectivePlans[tab.key] && (
                <WeeklyPlanContent plan={objectivePlans[tab.key]} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <WeeklyPlanContent plan={plan} />
      )}
    </section>
  );
}

function LockedDayCard({ script }: { script: ContentScript }) {
  const colorClass = DAY_COLORS[script.dia] || DAY_COLORS[1];
  const accentClass = DAY_ACCENT[script.dia] || DAY_ACCENT[1];
  const frameworkBadge =
    FRAMEWORK_BADGE[script.framework] || "bg-primary/10 text-primary";

  return (
    <div
      className={`rounded-xl border bg-gradient-to-r ${colorClass} p-4`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-card border border-border flex flex-col items-center justify-center shrink-0">
          <span className={`text-[10px] font-bold ${accentClass}`}>Dia</span>
          <span className="text-foreground font-bold text-sm leading-none">
            {script.dia}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground/40 font-semibold text-sm">
            ━━━━━━━━━━━━━━━━━
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {script.dia_semana}
            </span>
            <span className="text-border">·</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${frameworkBadge}`}
            >
              {script.framework}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-secondary text-muted-foreground">
              {script.formato === "reel" ? (
                <Film className="w-2.5 h-2.5" />
              ) : (
                <Layers className="w-2.5 h-2.5" />
              )}
              {script.formato}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({
  text,
  field,
  copiedField,
  onCopy,
}: {
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCopy(text, field);
      }}
      className="p-1 rounded hover:bg-secondary transition-colors shrink-0"
      title="Copiar"
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function DayCard({
  script,
  isExpanded,
  onToggle,
}: {
  script: ContentScript;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const colorClass = DAY_COLORS[script.dia] || DAY_COLORS[1];
  const accentClass = DAY_ACCENT[script.dia] || DAY_ACCENT[1];
  const frameworkBadge =
    FRAMEWORK_BADGE[script.framework] || "bg-primary/10 text-primary";

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
      <CollapsibleTrigger className="w-full text-left">
        <div
          className={`rounded-xl border bg-gradient-to-r ${colorClass} p-4 hover:scale-[1.01] transition-all duration-200 cursor-pointer`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-card border border-border flex flex-col items-center justify-center shrink-0">
              <span className={`text-[10px] font-bold ${accentClass}`}>Dia</span>
              <span className="text-foreground font-bold text-sm leading-none">
                {script.dia}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">
                {script.titulo}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {script.dia_semana}
                </span>
                <span className="text-border">·</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${frameworkBadge}`}
                >
                  {script.framework}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-secondary text-muted-foreground">
                  {script.formato === "reel" ? (
                    <Film className="w-2.5 h-2.5" />
                  ) : (
                    <Layers className="w-2.5 h-2.5" />
                  )}
                  {script.formato}
                </span>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mx-2 mt-1 p-4 rounded-b-xl border border-t-0 border-border bg-card space-y-4">
          {/* Hook */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hook (0-3s)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <p className="text-sm text-foreground font-medium flex-1">
                &ldquo;{script.hook}&rdquo;
              </p>
              <CopyButton
                text={script.hook}
                field="hook"
                copiedField={copiedField}
                onCopy={handleCopy}
              />
            </div>
          </div>

          {/* Scenes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roteiro
            </p>
            <div className="space-y-2">
              {script.cenas.map((cena) => (
                <div
                  key={cena.numero}
                  className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 ${accentClass}`}
                  >
                    <span className="text-[10px] font-bold">{cena.numero}</span>
                  </div>
                  <div className="flex-1">
                    {cena.titulo_cena && (
                      <p className={`text-xs font-bold ${accentClass} mb-1`}>
                        {cena.titulo_cena}
                      </p>
                    )}
                    <p className="text-sm text-foreground/90 whitespace-pre-line">{cena.instrucao}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {cena.duracao_estimada}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Play className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-primary mb-0.5">CTA</p>
              <p className="text-sm text-foreground/80">{script.cta}</p>
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Legenda Sugerida
              </p>
              <CopyButton
                text={script.legenda_sugerida}
                field="legenda"
                copiedField={copiedField}
                onCopy={handleCopy}
              />
            </div>
            <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border whitespace-pre-line">
              {script.legenda_sugerida}
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hashtags
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {script.hashtags_sugeridas.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Theme */}
          <p className="text-xs text-muted-foreground italic">
            Ângulo estratégico: {script.tema}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
