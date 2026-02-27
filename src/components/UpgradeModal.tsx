import { Check, Lock, Shield, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HOTMART_CHECKOUT_URL = "#"; // TODO: substituir pelo link real do checkout Hotmart

const BENEFITS = [
  "Análise detalhada do melhor e pior post",
  "Rubrica completa com nota em 5 critérios",
  "Plano de conteúdo com 7 roteiros prontos",
  "Hooks, legendas e hashtags para copiar",
  "Estratégia semanal personalizada",
];

function UpgradeContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 pb-8 pt-2 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-amber-400" />
      </div>

      <div className="space-y-2">
        <h2
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Sua análise completa está pronta
        </h2>
        <p className="text-muted-foreground text-sm">
          Falta só um passo para desbloquear todos os detalhes e transformar seus resultados no Instagram.
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
        onClick={() => window.open(HOTMART_CHECKOUT_URL, "_blank")}
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
        onClick={onClose}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        Continuar com análise gratuita
      </button>
    </div>
  );
}

export default function UpgradeModal({ isOpen, onClose }: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <UpgradeContent onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 border-border bg-background">
        <DialogTitle className="sr-only">Desbloquear análise completa</DialogTitle>
        <UpgradeContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
