import { useState, useEffect } from "react";
import { Lock, Clock, ArrowRight } from "lucide-react";

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

interface Props {
  handle: string;
  onUpgrade: () => void;
}

export default function FinalCTA({ handle, onUpgrade }: Props) {
  const timeLeft = useCountdown();

  return (
    <section className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5 p-6 space-y-5">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Voce viu o diagnostico. Agora veja a solucao.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A analise completa inclui tudo que voce precisa para transformar seu perfil em 7 dias — posts analisados em profundidade, roteiros prontos e bio otimizada.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
            70% OFF na sua primeira analise
          </span>
          <span className="text-muted-foreground line-through text-sm">R$67,00</span>
          <span className="text-xl font-bold text-foreground">R$19,99</span>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full max-w-sm h-12 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
        >
          <Lock className="w-4 h-4" />
          Desbloquear Meu Relatorio
        </button>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Expira em <strong className="text-amber-400 font-mono">{timeLeft}</strong></span>
          </div>
          <span>·</span>
          <span>Pagamento unico</span>
          <span>·</span>
          <span>Garantia 7 dias</span>
        </div>
      </div>
    </section>
  );
}
