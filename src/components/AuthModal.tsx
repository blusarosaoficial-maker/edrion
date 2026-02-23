import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Sparkles, CheckCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onSuccess, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Listen for auth state change (magic link clicked in another tab)
  useEffect(() => {
    if (!isOpen) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        onSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [isOpen, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar link");
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setSent(false);
      setLoading(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="sm:max-w-md border-border bg-card"
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl text-gradient-brand"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {sent ? "Verifique seu e-mail" : "Faça login para continuar"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {sent
              ? "Enviamos um link mágico para o seu e-mail. Clique nele para acessar."
              : "Informe seu e-mail para receber um link de acesso instantâneo."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="w-12 h-12 text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Verifique sua caixa de entrada e spam.<br />
              O link expira em 1 hora.
            </p>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-brand hover:glow-brand-strong transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Enviando..." : "Enviar link de acesso"}
            </button>
          </form>
        )}

        <p className="text-xs text-muted-foreground text-center mt-2">
          Não compartilhamos seus dados. Sem spam.
        </p>
      </DialogContent>
    </Dialog>
  );
}
