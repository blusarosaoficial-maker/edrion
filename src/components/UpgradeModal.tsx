import { Check, Lock, Shield, Sparkles, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { appendUtmToCheckout } from "@/utils/hotmartUtm";
import { trackInitiateCheckout } from "@/utils/pixel";
import type { AnalysisResult } from "@/types/analysis";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result?: AnalysisResult;
}

const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/G104699811K?off=u2ahjbe3";

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const BENEFITS = [
  "4 bios otimizadas — uma para cada objetivo de crescimento",
  "28 roteiros completos — 7 para cada estratégia (vender, crescer, engajar, autoridade)",
  "28 sequências de Stories prontas para postar",
  "Melhores horários para postar no seu nicho",
  "Mix ideal de formatos: Reels vs Carrossel vs Stories",
  "Estratégia de hashtags por nível de competição",
];

function UpgradeContent({ onClose, userEmail, result }: { onClose: () => void; userEmail?: string; result?: AnalysisResult }) {
  const baseUrl = userEmail
    ? `${HOTMART_CHECKOUT_URL}&email=${encodeURIComponent(userEmail)}`
    : HOTMART_CHECKOUT_URL;
  const checkoutUrl = appendUtmToCheckout(baseUrl);

  const profile = result?.profile;

  return (
    <div className="flex flex-col items-center gap-5 px-6 pb-8 pt-2 text-center">
      {/* Personalized profile header */}
      {profile ? (
        <div className="flex items-center gap-3 w-full bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
          <img
            src={profile.avatar_url}
            alt={profile.handle}
            className="w-12 h-12 rounded-full border-2 border-primary/30 object-cover"
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
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {profile
            ? `@${profile.handle}, seu relatório está pronto.`
            : "Sua análise completa está pronta"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {profile
            ? "Analisamos seu perfil e encontramos oportunidades reais de crescimento."
            : "Falta só um passo para desbloquear todos os detalhes e transformar seus resultados no Instagram."}
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

      <div className="flex flex-col items-center gap-1 pt-1">
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

      <button
        onClick={onClose}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        Continuar com análise gratuita
      </button>
    </div>
  );
}

export default function UpgradeModal({ isOpen, onClose, result }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <UpgradeContent onClose={onClose} userEmail={user?.email || undefined} result={result} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 border-border bg-background">
        <DialogTitle className="sr-only">Desbloquear análise completa</DialogTitle>
        <UpgradeContent onClose={onClose} userEmail={user?.email || undefined} result={result} />
      </DialogContent>
    </Dialog>
  );
}
