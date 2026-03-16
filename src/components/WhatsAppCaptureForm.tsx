import { useState } from "react";
import { Gift, Copy, Check, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userEmail?: string;
  handle?: string;
  onCouponRevealed: (coupon: string) => void;
}

const COUPON_CODE = "EDRION10";

export default function WhatsAppCaptureForm({ userEmail, handle, onCouponRevealed }: Props) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = whatsapp.replace(/\D/g, "");
    if (!name.trim() || digits.length < 10) return;

    setLoading(true);
    try {
      await supabase.from("lead_captures").insert({
        name: name.trim(),
        whatsapp: digits,
        email: userEmail || null,
        handle: handle || null,
        coupon_code: COUPON_CODE,
      });
    } catch {
      // Silent — lead capture should never block checkout
    }
    setLoading(false);
    setSubmitted(true);
    onCouponRevealed(COUPON_CODE);
  }

  function handleCopy() {
    navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (submitted) {
    return (
      <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 justify-center">
          <Gift className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">Cupom desbloqueado!</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold font-mono text-foreground tracking-wider bg-white/[0.05] px-4 py-2 rounded-lg border border-white/[0.08]">
            {COUPON_CODE}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
            title="Copiar cupom"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Use no checkout para pagar <strong className="text-foreground">R$47,00</strong> em vez de R$57,00
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 justify-center">
        <Gift className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400">Quer R$10 de desconto?</span>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Deixe seu WhatsApp e ganhe um cupom exclusivo
      </p>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40 transition-colors"
          required
        />
        <div className="relative">
          <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="tel"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
            className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40 transition-colors"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || whatsapp.replace(/\D/g, "").length < 10}
        className="w-full h-9 rounded-lg bg-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Gift className="w-3.5 h-3.5" />
        {loading ? "Gerando cupom..." : "Revelar meu cupom"}
      </button>
    </form>
  );
}
