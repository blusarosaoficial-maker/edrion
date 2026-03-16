import { useState, useEffect } from "react";
import { Copy, Check, Users, Gift } from "lucide-react";
import { getOrCreateReferral, getReferralLink } from "@/services/referral";

interface Props {
  userId: string;
}

export default function ReferralSection({ userId }: Props) {
  const [referral, setReferral] = useState<{
    referral_code: string;
    signups_count: number;
    rewarded: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateReferral(userId)
      .then(setReferral)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !referral) return null;

  const link = getReferralLink(referral.referral_code);
  const remaining = Math.max(0, 5 - referral.signups_count);

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    const text = `Olha essa ferramenta que analisa seu Instagram e te dá um plano de conteúdo completo! Usa meu link: ${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  }

  if (referral.rewarded) {
    return (
      <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-2">
        <div className="flex items-center gap-2 justify-center">
          <Gift className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">Análise grátis desbloqueada!</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Você indicou 5 amigos e ganhou 1 análise premium. Volte e analise seu perfil!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2 justify-center">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Sem grana agora? Convide amigos!</span>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Convide <strong className="text-foreground">5 amigos</strong> para se cadastrarem e ganhe{" "}
        <strong className="text-primary">1 análise premium grátis</strong>
      </p>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{referral.signups_count}/5 cadastros</span>
          <span>{remaining === 0 ? "Completo!" : `Faltam ${remaining}`}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (referral.signups_count / 5) * 100)}%` }}
          />
        </div>
      </div>

      {/* Link + copy */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 flex items-center overflow-hidden">
          <span className="text-xs text-muted-foreground truncate">{link}</span>
        </div>
        <button
          onClick={handleCopy}
          className="h-9 px-3 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors flex items-center gap-1.5"
          title="Copiar link"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">{copied ? "Copiado!" : "Copiar"}</span>
        </button>
      </div>

      {/* WhatsApp share */}
      <button
        onClick={handleShare}
        className="w-full h-9 rounded-lg bg-[#25D366]/10 text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/20 transition-colors flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Compartilhar no WhatsApp
      </button>
    </div>
  );
}
