import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import AnalyzeForm from "@/components/AnalyzeForm";
import LoadingOverlay from "@/components/LoadingOverlay";
import ResultView from "@/components/ResultView";
import AuthModal from "@/components/AuthModal";
import UpgradePrompt from "@/components/UpgradePrompt";
import { analyzeProfile } from "@/services/analyze";
import type { AnalysisResult, ProfileData } from "@/types/analysis";

type AppState = "form" | "loading" | "result" | "upgrade";

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingInputs, setPendingInputs] = useState<{ handle: string; nicho: string; objetivo: string } | null>(null);
  const [currentHandle, setCurrentHandle] = useState("");
  const abortRef = useRef(false);

  const runAnalysis = useCallback(async (handle: string, nicho: string, objetivo: string) => {
    setState("loading");
    setIsDone(false);
    setProfileSnapshot(null);
    setCurrentHandle(handle);
    abortRef.current = false;

    try {
      const response = await analyzeProfile(handle, nicho, objetivo);

      if (abortRef.current) return;

      if (!response.success) {
        if (response.error === "auth_required") {
          setState("form");
          setPendingInputs({ handle, nicho, objetivo });
          setShowAuthModal(true);
          return;
        }

        if (response.error === "free_limit") {
          setState("upgrade");
          return;
        }

        setState("form");
        toast.error(ERROR_MESSAGES[response.error || "timeout"] || ERROR_MESSAGES.timeout);
        return;
      }

      // Success — show result
      if (response.data?.profile) {
        setProfileSnapshot(response.data.profile);
      }
      setResult(response.data!);
      setIsDone(true);
      setTimeout(() => {
        if (!abortRef.current) setState("result");
      }, 4500);
    } catch {
      setState("form");
      toast.error(ERROR_MESSAGES.timeout);
    }
  }, []);

  const handleSubmit = useCallback((handle: string, nicho: string, objetivo: string) => {
    runAnalysis(handle, nicho, objetivo);
  }, [runAnalysis]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    // Re-submit with same inputs now that user is authenticated
    if (pendingInputs) {
      const { handle, nicho, objetivo } = pendingInputs;
      setPendingInputs(null);
      runAnalysis(handle, nicho, objetivo);
    }
  }, [pendingInputs, runAnalysis]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    setState("form");
    setResult(null);
    setIsDone(false);
    setProfileSnapshot(null);
    setPendingInputs(null);
    setShowAuthModal(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay isOpen={state === "loading"} isDone={isDone} handle={currentHandle} profileSnapshot={profileSnapshot} />
      <AuthModal isOpen={showAuthModal} onSuccess={handleAuthSuccess} />

      <main className="container max-w-4xl py-12 px-4">
        {state === "form" && !showAuthModal && (
          <div className="flex flex-col items-center gap-10">
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

            <p className="text-muted-foreground text-xs text-center max-w-sm">
              Não compartilhamos dados. Análise 100% automática de perfis públicos.
            </p>
          </div>
        )}

        {state === "result" && result && (
          <ResultView result={result} onReset={handleReset} />
        )}

        {state === "upgrade" && (
          <UpgradePrompt onBack={handleReset} />
        )}
      </main>
    </div>
  );
};

export default Index;
