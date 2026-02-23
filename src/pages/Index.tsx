import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import AnalyzeForm from "@/components/AnalyzeForm";
import LoadingOverlay from "@/components/LoadingOverlay";
import ResultView from "@/components/ResultView";
import EmailCaptureModal from "@/components/EmailCaptureModal";
import UpgradePrompt from "@/components/UpgradePrompt";
import { analyzeProfile, saveAfterSignup } from "@/services/analyze";
import type { AnalysisResult, ProfileData } from "@/types/analysis";

type AppState = "form" | "loading" | "result" | "upgrade";

const ERROR_MESSAGES: Record<string, string> = {
  private: "Esse perfil é privado. Só conseguimos analisar perfis públicos.",
  not_found: "Não encontramos esse perfil. Verifique o @.",
  timeout: "O Instagram pode estar instável agora. Tente novamente em alguns minutos.",
  handle_taken: "Esse perfil já foi analisado por outro usuário.",
};

const Index = () => {
  const [state, setState] = useState<AppState>("form");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileData | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingResult, setPendingResult] = useState<AnalysisResult | null>(null);
  const [pendingInputs, setPendingInputs] = useState<{ handle: string; nicho: string; objetivo: string } | null>(null);
  const [currentHandle, setCurrentHandle] = useState("");
  const abortRef = useRef(false);

  const handleSubmit = useCallback(async (handle: string, nicho: string, objetivo: string) => {
    setState("loading");
    setIsDone(false);
    setProfileSnapshot(null);
    setCurrentHandle(handle);
    abortRef.current = false;

    try {
      const response = await analyzeProfile(handle, nicho, objetivo);

      if (abortRef.current) return;

      if (!response.success) {
        if (response.error === "email_required" && response.pending_result) {
          // Use REAL profile data from API response for the loading animation
          if (response.pending_result.profile) {
            setProfileSnapshot(response.pending_result.profile as ProfileData);
          }
          setPendingResult(response.pending_result);
          setPendingInputs({ handle, nicho, objetivo });
          setIsDone(true);
          setTimeout(() => {
            if (!abortRef.current) {
              setState("form");
              setShowEmailModal(true);
            }
          }, 4500); // longer delay so user sees the full loading animation
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

      // Use real profile data for loading animation
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

  const handleEmailSuccess = useCallback(async () => {
    if (pendingResult && pendingInputs) {
      // Try to persist but show result regardless
      saveAfterSignup(pendingInputs.handle, pendingInputs.nicho, pendingInputs.objetivo, pendingResult).catch(() => {});
      setResult(pendingResult);
      setShowEmailModal(false);
      setState("result");
      setPendingResult(null);
      setPendingInputs(null);
    }
  }, [pendingResult, pendingInputs]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    setState("form");
    setResult(null);
    setIsDone(false);
    setProfileSnapshot(null);
    setPendingResult(null);
    setPendingInputs(null);
    setShowEmailModal(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay isOpen={state === "loading"} isDone={isDone} handle={currentHandle} profileSnapshot={profileSnapshot} />
      <EmailCaptureModal isOpen={showEmailModal} onSuccess={handleEmailSuccess} />

      <main className="container max-w-4xl py-12 px-4">
        {state === "form" && !showEmailModal && (
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
