import { Clock, Lock } from "lucide-react";
import type { BestTimesRecommendation } from "@/types/analysis";

interface Props {
  data: BestTimesRecommendation;
  locked?: boolean;
  onLockedClick?: () => void;
}

export default function BestTimesSection({ data, locked, onLockedClick }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Melhores Horários para Postar
        </h3>
      </div>

      <div className="relative">
        {locked && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 cursor-pointer bg-background/40"
            onClick={onLockedClick}
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">PRO</span>
            </div>
            <span className="text-xs text-muted-foreground">Desbloquear horários ideais</span>
          </div>
        )}

        <div className={`p-5 space-y-3 ${locked ? "opacity-30 blur-[2px] pointer-events-none select-none" : ""}`}>
          <div className="grid gap-2">
            {data.slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{slot.day}</span>
                    <span className="text-sm text-primary font-mono">{slot.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{slot.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
