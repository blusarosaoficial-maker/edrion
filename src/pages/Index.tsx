import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import AnalyzeForm from "@/components/AnalyzeForm";
import LoadingOverlay from "@/components/LoadingOverlay";
import ResultView from "@/components/ResultView";
import { analyzeMock } from "@/services/analyze";
import type { AnalysisResult, ProfileData } from "@/types/analysis";

type AppState = "form" | "loading" | "result";

const ERROR_MESSAGES: Record<string, string> = {
  private: "Esse perfil é privado. Só conseguimos analisar perfis públicos.",
  not_found: "Não encontramos esse perfil. Verifique o @.",
  timeout: "O Instagram pode estar instável agora. Tente novamente em alguns minutos.",
};

const Index = () => {
  const [state, setState] = useState<AppState>("form");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileData | null>(null);
  const abortRef = useRef(false);

  const handleSubmit = useCallback(async (handle: string, nicho: string, objetivo: string) => {
    setState("loading");
    setIsDone(false);
    setProfileSnapshot(null);
    abortRef.current = false;

    // Generate a quick snapshot for loading phase B
    const snapshot: ProfileData = {
      handle,
      full_name: handle.charAt(0).toUpperCase() + handle.slice(1).replace(/[._]/g, " "),
      avatar_url: `https://i.pravatar.cc/150?u=${handle}`,
      bio_text: "",
      followers: Math.floor(Math.random() * 50000) + 1000,
      following: Math.floor(Math.random() * 1000) + 100,
      posts_count: Math.floor(Math.random() * 400) + 50,
      is_verified: false,
    };
    // Delay showing snapshot to align with phase B
    setTimeout(() => {
      if (!abortRef.current) setProfileSnapshot(snapshot);
    }, 1200);

    try {
      const response = await analyzeMock(handle, nicho, objetivo);

      if (abortRef.current) return;

      if (!response.success) {
        setState("form");
        toast.error(ERROR_MESSAGES[response.error || "timeout"] || ERROR_MESSAGES.timeout);
        return;
      }

      setResult(response.data!);
      setIsDone(true);
      // Small delay before showing result
      setTimeout(() => {
        if (!abortRef.current) setState("result");
      }, 600);
    } catch {
      setState("form");
      toast.error(ERROR_MESSAGES.timeout);
    }
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    setState("form");
    setResult(null);
    setIsDone(false);
    setProfileSnapshot(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Loading overlay */}
      <LoadingOverlay isOpen={state === "loading"} isDone={isDone} profileSnapshot={profileSnapshot} />

      <main className="container max-w-4xl py-12 px-4">
        {state === "form" && (
          <div className="flex flex-col items-center gap-10">
            {/* Hero */}
            <div className="text-center space-y-4 max-w-lg">
              <h1
                className="text-3xl md:text-4xl font-bold text-gradient-brand"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                EDRION, a Inteligência que evolui seu perfil.
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Receba sugestão de bio, análise dos melhores e piores posts e ideias para o próximo conteúdo, em segundos.
              </p>
            </div>

            <AnalyzeForm onSubmit={handleSubmit} isLoading={false} />

            {/* Trust signals */}
            <p className="text-muted-foreground text-xs text-center max-w-sm">
              Não compartilhamos dados. Análise 100% automática de perfis públicos.
            </p>
          </div>
        )}

        {state === "result" && result && (
          <ResultView result={result} onReset={handleReset} />
        )}
      </main>
    </div>
  );
};

export default Index;
