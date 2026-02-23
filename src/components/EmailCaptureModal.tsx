import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onSuccess: () => void;
}

export default function EmailCaptureModal({ isOpen, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("E-mail já cadastrado. Faça login.");
            setMode("login");
            setLoading(false);
            return;
          }
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md border-border bg-card"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl text-gradient-brand"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Seu diagnóstico está pronto!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Informe seu e-mail para liberar o resultado da análise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {mode === "signup" ? "Crie uma senha" : "Senha"}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-brand hover:glow-brand-strong transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Processando..." : "Liberar resultado"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "signup" ? "Já tem conta? Fazer login" : "Não tem conta? Criar agora"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Não compartilhamos seus dados. Sem spam.
        </p>
      </DialogContent>
    </Dialog>
  );
}
