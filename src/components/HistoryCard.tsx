import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, ChevronRight, Lock, Sparkles } from "lucide-react";
import type { HistoryEntry } from "@/hooks/useHistory";

interface Props {
  entry: HistoryEntry;
  onClick: () => void;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function HistoryCard({ entry, onClick }: Props) {
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <img
          src={entry.avatar_url}
          alt={entry.handle}
          className="w-12 h-12 rounded-full border border-border object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-foreground font-semibold text-sm truncate">
              {entry.full_name}
            </p>
            {entry.result.plan === "premium" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Sparkles className="w-2.5 h-2.5" /> Completa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                <Lock className="w-2.5 h-2.5" /> PRO
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">@{entry.handle}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {formatNum(entry.followers)}
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span>{timeAgo}</span>
      </div>
    </button>
  );
}
