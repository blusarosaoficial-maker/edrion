import { useState, useEffect } from "react";
import { Search, Clock, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistory, type HistoryEntry } from "@/hooks/useHistory";
import HistoryCard from "@/components/HistoryCard";
import ResultView from "@/components/ResultView";

export default function HistoryPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: entries, isLoading } = useHistory(debouncedSearch);

  if (selectedEntry) {
    return (
      <div>
        <button
          onClick={() => setSelectedEntry(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao histórico
        </button>
        <ResultView
          result={selectedEntry.result}
          onReset={() => setSelectedEntry(null)}
          resetLabel="Voltar ao histórico"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por @perfil..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 bg-secondary"
        />
      </div>

      {isLoading && <SkeletonCards />}

      {!isLoading && entries?.length === 0 && (
        <EmptyState hasSearch={!!debouncedSearch} />
      )}

      {!isLoading && entries && entries.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
          <p className="text-muted-foreground/50 text-[10px] text-center">
            Análises ficam disponíveis por 90 dias.
          </p>
        </>
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground text-sm">
        {hasSearch
          ? "Nenhum perfil encontrado com esse nome."
          : "Você ainda não analisou nenhum perfil."}
      </p>
      {!hasSearch && (
        <p className="text-muted-foreground/60 text-xs mt-1">
          Analise seu primeiro perfil na aba &ldquo;Nova Análise&rdquo;.
        </p>
      )}
    </div>
  );
}
