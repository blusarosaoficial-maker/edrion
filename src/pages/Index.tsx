import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import AnalyzeForm from "@/components/AnalyzeForm";
import LoadingOverlay from "@/components/LoadingOverlay";
import ResultView from "@/components/ResultView";
import AuthModal from "@/components/AuthModal";
import UpgradePrompt from "@/components/UpgradePrompt";
import { analyzeProfile, saveResult } from "@/services/analyze";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, ProfileData } from "@/types/analysis";
import { LogIn, LogOut } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HistoryPanel from "@/components/HistoryPanel";

type AppState = "form" | "loading" | "result" | "upgrade";

const ERROR_MESSAGES: Record<string, string> = {
  private: "Esse perfil é privado. Só conseguimos analisar perfis públicos.",
  not_found: "Não encontramos esse perfil. Verifique o @.",
  timeout: "O Instagram pode estar instável agora. Tente novamente em alguns minutos.",
};

const Index = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>("form");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingInputs, setPendingInputs] = useState<{ handle: string; nicho: string; objetivo: string } | null>(null);
  const [pendingResult, setPendingResult] = useState<AnalysisResult | null>(null);
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
        // AUTH_REQUIRED with pending result: scraping done, needs login
        if (response.error === "auth_required" && response.pendingResult) {
          setPendingResult(response.pendingResult);
          setPendingInputs({ handle, nicho, objetivo });
          // Show profile data in loading overlay
          if (response.pendingResult.profile) {
            setProfileSnapshot(response.pendingResult.profile);
          }
          setIsDone(true);
          // Small delay then open auth modal
          setTimeout(() => {
            if (!abortRef.current) {
              setShowAuthModal(true);
            }
          }, 2000);
          return;
        }

        // AUTH_REQUIRED without pending result (shouldn't happen with new flow)
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

  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false);

    // If we have a pending result from scraping, save it
    if (pendingResult && pendingInputs) {
      const { handle, nicho, objetivo } = pendingInputs;
      const saveResponse = await saveResult(handle, nicho, objetivo, pendingResult);

      if (!saveResponse.success) {
        if (saveResponse.error === "free_limit") {
          setState("upgrade");
          setPendingResult(null);
          setPendingInputs(null);
          return;
        }
      }

      // Show the result
      setResult(pendingResult);
      setPendingResult(null);
      setPendingInputs(null);
      setState("result");
      return;
    }

    // Fallback: re-run analysis if no pending result
    if (pendingInputs) {
      const { handle, nicho, objetivo } = pendingInputs;
      setPendingInputs(null);
      runAnalysis(handle, nicho, objetivo);
    }
  }, [pendingResult, pendingInputs, runAnalysis]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    setState("form");
    setResult(null);
    setIsDone(false);
    setProfileSnapshot(null);
    setPendingInputs(null);
    setPendingResult(null);
    setShowAuthModal(false);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container max-w-4xl flex justify-end items-center py-4 px-4">
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </button>
        )}
      </header>

      <LoadingOverlay isOpen={state === "loading"} isDone={isDone} handle={currentHandle} profileSnapshot={profileSnapshot} />
      <AuthModal isOpen={showAuthModal} onSuccess={handleAuthSuccess} onClose={() => { setShowAuthModal(false); setPendingInputs(null); setPendingResult(null); setState("form"); }} />

      <main className="container max-w-2xl px-4">
        {state === "form" && !showAuthModal && (
          user ? (
            <Tabs defaultValue="nova-analise" className="w-full">
              <TabsList className="inline-flex h-10 items-center rounded-full bg-white/[0.05] p-1 mx-auto mb-10">
                <TabsTrigger value="nova-analise" className="rounded-full px-5 text-sm data-[state=active]:bg-white/10 data-[state=active]:shadow-none">Nova Análise</TabsTrigger>
                <TabsTrigger value="historico" className="rounded-full px-5 text-sm data-[state=active]:bg-white/10 data-[state=active]:shadow-none">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="nova-analise">
                <div className="relative flex flex-col items-center gap-16 md:gap-20 pt-12 md:pt-20 pb-16">
                  <div className="hero-glow" aria-hidden="true" />

                  <div className="text-center space-y-6 max-w-2xl relative z-10">
                    <h1
                      className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span className="text-white">EDRION, a Inteligência que </span>
                      <span className="text-gradient-brand">evolui seu perfil.</span>
                    </h1>
                    <p className="text-muted-foreground/80 text-base md:text-lg max-w-md mx-auto">
                      Receba sugestão de bio, análise dos melhores e piores posts e um plano semanal com 7 roteiros prontos, em segundos.
                    </p>
                  </div>

                  <div className="glass-card rounded-2xl p-6 md:p-8 w-full max-w-md mx-auto relative z-10">
                    <AnalyzeForm onSubmit={handleSubmit} isLoading={false} />
                  </div>

                  <p className="text-muted-foreground/40 text-[11px] text-center relative z-10">
                    Não compartilhamos dados. Análise 100% automática de perfis públicos.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="historico">
                <HistoryPanel />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="relative flex flex-col items-center gap-16 md:gap-20 pt-12 md:pt-20 pb-16">
              <div className="hero-glow" aria-hidden="true" />

              <div className="text-center space-y-6 max-w-2xl relative z-10">
                <h1
                  className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span className="text-white">EDRION, a Inteligência que </span>
                  <span className="text-gradient-brand">evolui seu perfil.</span>
                </h1>
                <p className="text-muted-foreground/80 text-base md:text-lg max-w-md mx-auto">
                  Receba sugestão de bio, análise dos melhores e piores posts e um plano semanal com 7 roteiros prontos, em segundos.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 md:p-8 w-full max-w-md mx-auto relative z-10">
                <AnalyzeForm onSubmit={handleSubmit} isLoading={false} />
              </div>

              <p className="text-muted-foreground/40 text-[11px] text-center relative z-10">
                Não compartilhamos dados. Análise 100% automática de perfis públicos.
              </p>
            </div>
          )
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
