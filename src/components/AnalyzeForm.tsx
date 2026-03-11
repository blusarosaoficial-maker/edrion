import { useState, useCallback, useEffect, useRef } from "react";
import {
  Instagram,
  Sparkles,
  Dumbbell,
  Megaphone,
  UtensilsCrossed,
  Shirt,
  GraduationCap,
  Monitor,
  Palette,
  DollarSign,
  Clapperboard,
  MoreHorizontal,
  TrendingUp,
  Heart,
  ShoppingBag,
  Award,
  CalendarCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

const NICHOS = [
  { value: "fitness", label: "Fitness & Saúde", icon: Dumbbell },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "gastronomia", label: "Gastronomia", icon: UtensilsCrossed },
  { value: "moda", label: "Moda & Estilo", icon: Shirt },
  { value: "educacao", label: "Educação", icon: GraduationCap },
  { value: "tecnologia", label: "Tecnologia", icon: Monitor },
  { value: "beleza", label: "Beleza", icon: Palette },
  { value: "financas", label: "Finanças", icon: DollarSign },
  { value: "entretenimento", label: "Entretenimento", icon: Clapperboard },
  { value: "outro", label: "Outro", icon: MoreHorizontal },
];

const OBJETIVOS = [
  { value: "crescer", label: "Crescer seguidores", icon: TrendingUp },
  { value: "engajar", label: "Mais engajamento", icon: Heart },
  { value: "vender", label: "Vender mais", icon: ShoppingBag },
  { value: "autoridade", label: "Construir autoridade", icon: Award },
  { value: "consistencia", label: "Ser consistente", icon: CalendarCheck },
];

const HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

interface Props {
  onSubmit: (handle: string, nicho: string, objetivo: string) => void;
  isLoading: boolean;
}

type Step = "handle" | "nicho" | "objetivo";

export default function AnalyzeForm({ onSubmit, isLoading }: Props) {
  const [handle, setHandle] = useState("");
  const [nicho, setNicho] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [step, setStep] = useState<Step>("handle");
  const [handleError, setHandleError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validateHandle = useCallback(() => {
    const clean = handle.replace(/^@/, "").trim();
    if (!clean) {
      setHandleError("Informe o @ do perfil");
      return false;
    }
    if (!HANDLE_REGEX.test(clean)) {
      setHandleError("Handle inválido. Use letras, números, . ou _");
      return false;
    }
    setHandleError("");
    return true;
  }, [handle]);

  const handleNext = () => {
    if (step === "handle") {
      if (!validateHandle()) return;
      setStep("nicho");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  const selectNicho = (value: string) => {
    setNicho(value);
    setStep("objetivo");
  };

  const selectObjetivo = (value: string) => {
    setObjetivo(value);
    const clean = handle.replace(/^@/, "").trim();
    onSubmit(clean, nicho, value);
  };

  const goBack = () => {
    if (step === "objetivo") setStep("nicho");
    else if (step === "nicho") setStep("handle");
  };

  // Direct submit for handle step (click button)
  const handleSubmitHandle = (ev: React.FormEvent) => {
    ev.preventDefault();
    handleNext();
  };

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-5">
        {(["handle", "nicho", "objetivo"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-300 ${
              s === step
                ? "w-8 bg-gradient-brand"
                : i < ["handle", "nicho", "objetivo"].indexOf(step)
                ? "w-8 bg-primary/40"
                : "w-4 bg-white/[0.08]"
            }`}
          />
        ))}
      </div>

      {/* STEP 1: Handle input */}
      {step === "handle" && (
        <form onSubmit={handleSubmitHandle} className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-base select-none">@</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="seuperfil"
                value={handle}
                onChange={(e) => { setHandle(e.target.value); setHandleError(""); }}
                onKeyDown={handleKeyDown}
                className="w-full h-14 pl-9 pr-12 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-foreground text-lg placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                disabled={isLoading}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Instagram className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
            </div>
            {handleError && <p className="text-xs text-destructive px-1">{handleError}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !handle.trim()}
            className="w-full h-14 rounded-2xl bg-gradient-brand text-primary-foreground font-semibold text-base tracking-wide flex items-center justify-center gap-2.5 glow-brand hover:glow-brand-strong transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            Ver minha análise grátis
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-muted-foreground/40 text-[11px]">
            Grátis · Sem cadastro · Resultado em 30s
          </p>
        </form>
      )}

      {/* STEP 2: Niche selection */}
      {step === "nicho" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={goBack}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-sm font-medium text-foreground">Qual o seu nicho?</p>
              <p className="text-xs text-muted-foreground/60">Isso ajuda a personalizar sua análise</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {NICHOS.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.value}
                  onClick={() => selectNicho(n.value)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-all duration-200 text-left ${
                    nicho === n.value
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium truncate">{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Objective selection */}
      {step === "objetivo" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={goBack}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-sm font-medium text-foreground">Qual seu objetivo principal?</p>
              <p className="text-xs text-muted-foreground/60">Escolha o que mais importa agora</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {OBJETIVOS.map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  onClick={() => selectObjetivo(o.value)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 text-left ${
                    objetivo === o.value
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-foreground"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm font-medium">{o.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>

          <p className="text-center text-muted-foreground/30 text-[11px]">
            Analisando @{handle.replace(/^@/, "")}
          </p>
        </div>
      )}
    </div>
  );
}
