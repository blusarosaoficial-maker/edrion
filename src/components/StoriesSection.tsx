import { useState } from "react";
import {
  ChevronDown,
  Lock,
  MessageSquare,
  Camera,
  BarChart3,
  HelpCircle,
  Video,
  Image,
  Timer,
  Link2,
  Instagram,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { StoriesPlan, StorySequence, StorySlide } from "@/types/analysis";

interface Props {
  plan: StoriesPlan;
  locked?: boolean;
  onLockedClick?: () => void;
}

const SLIDE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  texto: { icon: <MessageSquare className="w-3 h-3" />, label: "Texto", color: "bg-blue-500/10 text-blue-400" },
  enquete: { icon: <BarChart3 className="w-3 h-3" />, label: "Enquete", color: "bg-emerald-500/10 text-emerald-400" },
  quiz: { icon: <HelpCircle className="w-3 h-3" />, label: "Quiz", color: "bg-amber-500/10 text-amber-400" },
  caixa_perguntas: { icon: <HelpCircle className="w-3 h-3" />, label: "Caixa", color: "bg-pink-500/10 text-pink-400" },
  video_selfie: { icon: <Video className="w-3 h-3" />, label: "Video", color: "bg-violet-500/10 text-violet-400" },
  foto: { icon: <Image className="w-3 h-3" />, label: "Foto", color: "bg-cyan-500/10 text-cyan-400" },
  countdown: { icon: <Timer className="w-3 h-3" />, label: "Countdown", color: "bg-red-500/10 text-red-400" },
  link: { icon: <Link2 className="w-3 h-3" />, label: "Link", color: "bg-orange-500/10 text-orange-400" },
};

export default function StoriesSection({ plan, locked, onLockedClick }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const totalDays = plan.sequences.length;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3
            className="text-foreground font-bold text-lg"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {totalDays} Sequencias de Stories
          </h3>
          <p className="text-muted-foreground text-xs">
            {plan.estrategia_stories}
          </p>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 ml-auto shrink-0">
            <Lock className="w-2.5 h-2.5" /> PRO
          </span>
        )}
      </div>

      {locked ? (
        <div className="relative">
          <div className="space-y-2 opacity-60 pointer-events-none select-none">
            {plan.sequences.slice(0, 5).map((seq) => (
              <LockedStoryCard key={seq.dia} sequence={seq} />
            ))}
          </div>
          <div
            onClick={onLockedClick}
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/90 flex flex-col items-center justify-center cursor-pointer rounded-xl"
          >
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
                <Instagram className="w-6 h-6 text-pink-400" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Desbloquear {totalDays} sequencias de Stories
              </span>
              <span className="text-xs text-muted-foreground text-center max-w-xs">
                1 sequencia por dia com enquetes, quizzes, videos e textos prontos para postar
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {plan.sequences.map((seq) => (
            <StoryCard
              key={seq.dia}
              sequence={seq}
              isExpanded={expandedDay === seq.dia}
              onToggle={() =>
                setExpandedDay(expandedDay === seq.dia ? null : seq.dia)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LockedStoryCard({ sequence }: { sequence: StorySequence }) {
  return (
    <div className="rounded-xl border border-pink-500/15 bg-gradient-to-r from-pink-500/5 to-orange-500/5 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-card border border-border flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-pink-400">Dia</span>
          <span className="text-foreground font-bold text-sm leading-none">{sequence.dia}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground/40 font-semibold text-sm">
            ━━━━━━━━━━━━━━━━━
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground/60">{sequence.slides.length} slides</span>
            <span className="text-border">·</span>
            <div className="flex gap-1">
              {sequence.slides.slice(0, 3).map((slide, i) => {
                const cfg = SLIDE_TYPE_CONFIG[slide.tipo] || SLIDE_TYPE_CONFIG.texto;
                return (
                  <span key={i} className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${cfg.color}`}>
                    {cfg.label}
                  </span>
                );
              })}
              {sequence.slides.length > 3 && (
                <span className="text-[9px] text-muted-foreground/50">+{sequence.slides.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryCard({
  sequence,
  isExpanded,
  onToggle,
}: {
  sequence: StorySequence;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="rounded-xl border border-pink-500/15 bg-gradient-to-r from-pink-500/5 to-orange-500/5 p-4 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-card border border-border flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-pink-400">Dia</span>
              <span className="text-foreground font-bold text-sm leading-none">{sequence.dia}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">{sequence.tema}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">{sequence.slides.length} slides</span>
                <span className="text-border">·</span>
                <span className="text-xs text-muted-foreground/70">{sequence.objetivo}</span>
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
        <div className="mx-2 mt-1 p-4 rounded-b-xl border border-t-0 border-border bg-card space-y-3">
          {sequence.slides.map((slide) => (
            <SlideItem key={slide.numero} slide={slide} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SlideItem({ slide }: { slide: StorySlide }) {
  const cfg = SLIDE_TYPE_CONFIG[slide.tipo] || SLIDE_TYPE_CONFIG.texto;

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/10 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-pink-400">{slide.numero}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-line">{slide.conteudo}</p>
        {slide.instrucao_visual && (
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {slide.instrucao_visual}
          </p>
        )}
      </div>
    </div>
  );
}
