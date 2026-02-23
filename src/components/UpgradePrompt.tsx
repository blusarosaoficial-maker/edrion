import { Lock, ArrowLeft, Sparkles } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function UpgradePrompt({ onBack }: Props) {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-3">
        <h2
          className="text-2xl font-bold text-gradient-brand"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Você já utilizou sua análise gratuita.
        </h2>
        <p className="text-muted-foreground text-base">
          Desbloqueie a análise completa com sugestões avançadas de bio, análise detalhada de todos os posts, 
          score estratégico e plano de melhoria.
        </p>
      </div>

      <button
        disabled
        className="w-full h-12 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-brand opacity-80 cursor-not-allowed"
      >
        <Sparkles className="w-5 h-5" />
        Desbloquear Premium — R$19,90
      </button>

      <p className="text-xs text-muted-foreground">Em breve disponível</p>

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
    </div>
  );
}
