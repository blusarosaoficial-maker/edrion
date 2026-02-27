import { Lock, ArrowLeft, Sparkles, Check, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onBack: () => void;
}

const HOTMART_CHECKOUT_URL = "#"; // TODO: substituir pelo link real do checkout Hotmart

const BENEFITS = [
  "Análise detalhada do melhor e pior post",
  "Rubrica completa com nota em 5 critérios",
  "Plano de conteúdo com 7 roteiros prontos",
  "Hooks, legendas e hashtags para copiar",
  "Estratégia semanal personalizada",
];

export default function UpgradePrompt({ onBack }: Props) {
  const { user } = useAuth();
  const checkoutUrl = user?.email && HOTMART_CHECKOUT_URL !== "#"
    ? `${HOTMART_CHECKOUT_URL}?email=${encodeURIComponent(user.email)}`
    : HOTMART_CHECKOUT_URL;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-amber-400" />
      </div>

      <div className="space-y-2">
        <h2
          className="text-2xl font-bold text-gradient-brand"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Você já utilizou sua análise gratuita.
        </h2>
        <p className="text-muted-foreground text-sm">
          Desbloqueie a análise completa e transforme seus resultados no Instagram.
        </p>
      </div>

      <div className="w-full space-y-2.5 text-left">
        {BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-sm text-foreground/90">{benefit}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          50% OFF
        </span>
        <div className="flex items-baseline gap-2.5">
          <span className="text-muted-foreground line-through text-base">R$51,94</span>
          <span className="text-3xl font-bold text-foreground">R$25,97</span>
        </div>
        <span className="text-muted-foreground text-xs">
          Pagamento único · sem assinatura
        </span>
      </div>

      <button
        onClick={() => window.open(checkoutUrl, "_blank")}
        className="w-full h-12 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
      >
        <Lock className="w-4 h-4" />
        DESBLOQUEAR AGORA
      </button>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span className="text-xs">Pagamento seguro · Garantia de 7 dias</span>
      </div>

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
    </div>
  );
}
