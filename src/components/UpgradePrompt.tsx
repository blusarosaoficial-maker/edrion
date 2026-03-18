import { useState, useEffect } from "react";
import { Lock, ArrowLeft, Sparkles, Check, Shield, Users, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { appendUtmToCheckout } from "@/utils/hotmartUtm";
import { trackInitiateCheckout } from "@/utils/pixel";
import ReferralSection from "@/components/ReferralSection";
import type { AnalysisResult } from "@/types/analysis";

interface Props {
  onBack: () => void;
  result?: AnalysisResult;
}

const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/G104699811K?off=u2ahjbe3";

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const BENEFITS = [
  "Bio otimizada com 3 variações estratégicas",
  "Análise completa do melhor e pior post",
  "7 roteiros de conteúdo — um para cada dia da semana",
  "30 sequências de Stories prontas para postar",
  "Estratégia de hashtags por nível de competição",
];

function useCountdown() {
  const PROMO_KEY = "edrion_promo_start";
  const PROMO_DURATION = 24 * 60 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState("23:59:59");

  useEffect(() => {
    if (!sessionStorage.getItem(PROMO_KEY)) {
      sessionStorage.setItem(PROMO_KEY, String(Date.now()));
    }

    const tick = () => {
      const start = Number(sessionStorage.getItem(PROMO_KEY) || Date.now());
      const remaining = Math.max(0, PROMO_DURATION - (Date.now() - start));
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

export default function UpgradePrompt({ onBack, result }: Props) {
  const { user } = useAuth();
  const timeLeft = useCountdown();
  const baseUrl = user?.email
    ? `${HOTMART_CHECKOUT_URL}&email=${encodeURIComponent(user.email)}`
    : HOTMART_CHECKOUT_URL;
  const checkoutUrl = appendUtmToCheckout(baseUrl);

  const profile = result?.profile;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-12 text-center">
      {/* Personalized profile header */}
      {profile ? (
        <div className="flex items-center gap-3 w-full bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <img
            src={profile.avatar_url}
            alt={profile.handle}
            className="w-14 h-14 rounded-full border-2 border-primary/30 object-cover"
          />
          <div className="text-left min-w-0 flex-1">
            <p className="text-foreground font-semibold text-sm truncate">@{profile.handle}</p>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <Users className="w-3 h-3" />
              {formatNum(profile.followers)} seguidores
            </p>
          </div>
        </div>
      ) : (
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-amber-400" />
        </div>
      )}

      <div className="space-y-2">
        <h2
          className="text-2xl font-bold text-gradient-brand"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {profile
            ? `@${profile.handle}, seu relatório está pronto.`
            : "Você já utilizou sua análise gratuita."}
        </h2>
        <p className="text-muted-foreground text-sm">
          {profile
            ? "Analisamos seu perfil e encontramos oportunidades reais de crescimento."
            : "Desbloqueie a análise completa e transforme seus resultados no Instagram."}
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

      {/* Countdown timer */}
      <div className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-500/5 border border-amber-500/15">
        <Clock className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-muted-foreground">
          Preço promocional expira em <strong className="text-amber-400 font-mono">{timeLeft}</strong>
        </span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          70% OFF na sua primeira analise
        </span>
        <div className="flex items-baseline gap-2.5">
          <span className="text-muted-foreground line-through text-base">R$67,00</span>
          <span className="text-3xl font-bold text-foreground">R$19,99</span>
        </div>
        <span className="text-muted-foreground text-xs">
          Pagamento unico · sem assinatura
        </span>
        <span className="text-muted-foreground/60 text-[11px]">
          Cartão ou Pix
        </span>
      </div>

      <button
        onClick={() => { trackInitiateCheckout(); window.open(checkoutUrl, "_blank"); }}
        className="w-full h-12 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
      >
        <Lock className="w-4 h-4" />
        Desbloquear Meu Relatório
      </button>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span className="text-xs">Pagamento seguro · Garantia de 7 dias</span>
      </div>

      {/* Referral section */}
      {user && <ReferralSection userId={user.id} />}

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
