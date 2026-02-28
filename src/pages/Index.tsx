import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import AnalyzeForm from "@/components/AnalyzeForm";
import LoadingOverlay from "@/components/LoadingOverlay";
import ResultView from "@/components/ResultView";
import AuthModal from "@/components/AuthModal";
import UpgradePrompt from "@/components/UpgradePrompt";
import { analyzeProfile, saveResult, checkUserCredits } from "@/services/analyze";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, ProfileData } from "@/types/analysis";
import { LogIn, LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HistoryPanel from "@/components/HistoryPanel";

type AppState = "form" | "loading" | "result" | "upgrade";

const ERROR_MESSAGES: Record<string, string> = {
  private: "Esse perfil é privado. Só conseguimos analisar perfis públicos.",
  not_found: "Não encontramos esse perfil. Verifique o @.",
  timeout: "O Instagram pode estar instável agora. Tente novamente em alguns minutos.",
};

function getInitials(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase() || "?";
}

function getDisplayName(email: string): string {
  return email.split("@")[0];
}

const Index = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AppState>("form");
  const [activeTab, setActiveTab] = useState("nova-analise");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingInputs, setPendingInputs] = useState<{ handle: string; nicho: string; objetivo: string } | null>(null);
  const [pendingResult, setPendingResult] = useState<AnalysisResult | null>(null);
  const [currentHandle, setCurrentHandle] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const abortRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const runAnalysis = useCallback(async (handle: string, nicho: string, objetivo: string) => {
    // Pre-check credits for logged-in users
    if (user) {
      const creditCheck = await checkUserCredits();
      if (!creditCheck.canAnalyze) {
        setState("upgrade");
        return;
      }
    }

    setState("loading");
    setIsDone(false);
    setProfileSnapshot(null);
    setCurrentHandle(handle);
    abortRef.current = false;

    try {
      const response = await analyzeProfile(handle, nicho, objetivo);

      if (abortRef.current) return;

      if (!response.success) {
        if (response.error === "auth_required" && response.pendingResult) {
          setPendingResult(response.pendingResult);
          setPendingInputs({ handle, nicho, objetivo });
          if (response.pendingResult.profile) {
            setProfileSnapshot(response.pendingResult.profile);
          }
          setIsDone(true);
          setTimeout(() => {
            if (!abortRef.current) {
              setShowAuthModal(true);
            }
          }, 2000);
          return;
        }

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

      if (response.data?.profile) {
        setProfileSnapshot(response.data.profile);
      }
      setResult(response.data!);
      setIsDone(true);
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setTimeout(() => {
        if (!abortRef.current) setState("result");
      }, 4500);
    } catch {
      setState("form");
      toast.error(ERROR_MESSAGES.timeout);
    }
  }, [queryClient, user]);

  const handleSubmit = useCallback((handle: string, nicho: string, objetivo: string) => {
    runAnalysis(handle, nicho, objetivo);
  }, [runAnalysis]);

  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false);

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

      setResult(pendingResult);
      setPendingResult(null);
      setPendingInputs(null);
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setState("result");
      return;
    }

    if (pendingInputs) {
      const { handle, nicho, objetivo } = pendingInputs;
      setPendingInputs(null);
      runAnalysis(handle, nicho, objetivo);
    }
  }, [pendingResult, pendingInputs, runAnalysis, queryClient]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    setState("form");
    setActiveTab("nova-analise");
    setResult(null);
    setIsDone(false);
    setProfileSnapshot(null);
    setPendingInputs(null);
    setPendingResult(null);
    setShowAuthModal(false);
  }, []);

  const handleGoToHistory = useCallback(() => {
    abortRef.current = true;
    setState("form");
    setActiveTab("historico");
    setResult(null);
    setIsDone(false);
    setProfileSnapshot(null);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
  };

  // Navigation tabs component (reused across views)
  const NavTabs = ({ current }: { current: "nova-analise" | "historico" | "resultado" }) => (
    <div className="flex justify-center mb-6">
      <div className="inline-flex h-9 items-center rounded-full bg-white/[0.05] p-1">
        <button
          onClick={() => { handleReset(); setActiveTab("nova-analise"); }}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
            current === "nova-analise" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Nova Análise
        </button>
        <button
          onClick={handleGoToHistory}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
            current === "historico" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Histórico
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container max-w-4xl flex justify-between items-center py-3 px-4">
        <span
          className="text-sm font-bold tracking-tight text-white/80"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          EDRION
        </span>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{getInitials(user.email || "")}</span>
              </div>
              <span className="text-sm text-foreground/80 truncate max-w-[120px] hidden sm:inline">
                {getDisplayName(user.email || "")}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#11151C] border border-white/[0.08] shadow-xl py-1 z-50">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-xs text-muted-foreground">Logado como</p>
                  <p className="text-sm text-foreground truncate mt-0.5">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
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
            <>
              <NavTabs current={activeTab as "nova-analise" | "historico"} />

              {activeTab === "nova-analise" && (
                <div className="relative flex flex-col items-center gap-6 md:gap-8 pt-4 md:pt-8 pb-6">
                  <div className="hero-glow" aria-hidden="true" />

                  <div className="text-center space-y-3 max-w-2xl relative z-10">
                    <h1
                      className="text-[clamp(1.75rem,4vw+0.5rem,3.5rem)] font-bold tracking-tight leading-[1.1]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span className="text-white">EDRION, a Inteligência que </span>
                      <span className="text-gradient-brand">evolui seu perfil.</span>
                    </h1>
                    <p className="text-muted-foreground/80 text-sm md:text-base max-w-md mx-auto">
                      Receba sugestão de bio, análise dos melhores e piores posts e um plano semanal com 7 roteiros prontos, em segundos.
                    </p>
                  </div>

                  <div className="glass-card rounded-2xl p-5 md:p-6 w-full max-w-md mx-auto relative z-10">
                    <AnalyzeForm onSubmit={handleSubmit} isLoading={false} />
                  </div>

                  <p className="text-muted-foreground/40 text-[11px] text-center relative z-10">
                    Não compartilhamos dados. Análise 100% automática de perfis públicos.
                  </p>
                </div>
              )}

              {activeTab === "historico" && (
                <HistoryPanel />
              )}
            </>
          ) : (
            <div className="relative flex flex-col items-center gap-6 md:gap-8 pt-6 md:pt-10 pb-6">
              <div className="hero-glow" aria-hidden="true" />

              <div className="text-center space-y-3 max-w-2xl relative z-10">
                <h1
                  className="text-[clamp(1.75rem,4vw+0.5rem,3.5rem)] font-bold tracking-tight leading-[1.1]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span className="text-white">EDRION, a Inteligência que </span>
                  <span className="text-gradient-brand">evolui seu perfil.</span>
                </h1>
                <p className="text-muted-foreground/80 text-sm md:text-base max-w-md mx-auto">
                  Receba sugestão de bio, análise dos melhores e piores posts e um plano semanal com 7 roteiros prontos, em segundos.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 md:p-6 w-full max-w-md mx-auto relative z-10">
                <AnalyzeForm onSubmit={handleSubmit} isLoading={false} />
              </div>

              <p className="text-muted-foreground/40 text-[11px] text-center relative z-10">
                Não compartilhamos dados. Análise 100% automática de perfis públicos.
              </p>
            </div>
          )
        )}

        {state === "result" && result && (
          <>
            {user && <NavTabs current="resultado" />}
            <ResultView result={result} onReset={handleReset} />
          </>
        )}

        {state === "upgrade" && (
          <>
            {user && <NavTabs current="resultado" />}
            <UpgradePrompt onBack={handleReset} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
