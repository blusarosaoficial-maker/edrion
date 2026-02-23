import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react";

interface Props {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Listen for auth state change
  useEffect(() => {
    if (!isOpen) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        onSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [isOpen, onSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will trigger onSuccess
    } catch (err: any) {
      toast.error(err.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos"
        : err.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      // onAuthStateChange will trigger onSuccess
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setLoading(false);
      setMode("login");
      setShowPassword(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle
            className="text-xl text-gradient-brand"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "login"
              ? "Faça login para ver seu resultado de análise."
              : "Crie sua conta para ver seu resultado de análise."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4 mt-2">
          {/* Email */}
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

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-10 rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (signup only) */}
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-brand hover:glow-brand-strong transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading
              ? (mode === "login" ? "Entrando..." : "Criando conta...")
              : (mode === "login" ? "Entrar" : "Criar conta")}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-sm text-muted-foreground text-center mt-2">
          {mode === "login" ? (
            <>
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary hover:underline font-medium"
              >
                Crie agora
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline font-medium"
              >
                Entrar
              </button>
            </>
          )}
        </p>

        <p className="text-xs text-muted-foreground text-center">
          Não compartilhamos seus dados. Sem spam.
        </p>
      </DialogContent>
    </Dialog>
  );
}
