import { useState, useCallback } from "react";
import { Instagram, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";

const NICHOS = [
  { value: "fitness", label: "Fitness & Saúde" },
  { value: "marketing", label: "Marketing Digital" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "moda", label: "Moda & Estilo" },
  { value: "educacao", label: "Educação" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "beleza", label: "Beleza & Estética" },
  { value: "financas", label: "Finanças" },
  { value: "entretenimento", label: "Entretenimento" },
  { value: "outro", label: "Outro" },
];

const OBJETIVOS = [
  { value: "crescer", label: "Crescer seguidores" },
  { value: "engajar", label: "Aumentar engajamento" },
  { value: "vender", label: "Vender mais" },
  { value: "autoridade", label: "Construir autoridade" },
  { value: "consistencia", label: "Ser mais consistente" },
];

const HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

interface Props {
  onSubmit: (handle: string, nicho: string, objetivo: string) => void;
  isLoading: boolean;
}

export default function AnalyzeForm({ onSubmit, isLoading }: Props) {
  const [handle, setHandle] = useState("");
  const [nicho, setNicho] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    const clean = handle.replace(/^@/, "").trim();
    if (!clean) e.handle = "Informe o @ do perfil";
    else if (!HANDLE_REGEX.test(clean)) e.handle = "Handle inválido. Use letras, números, . ou _";
    if (!nicho) e.nicho = "Selecione o nicho";
    if (!objetivo) e.objetivo = "Selecione o objetivo";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [handle, nicho, objetivo]);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    const clean = handle.replace(/^@/, "").trim();
    onSubmit(clean, nicho, objetivo);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {/* Handle */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Perfil do Instagram</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm select-none">@</span>
          <input
            type="text"
            placeholder="seuperfil"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full h-12 pl-8 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.04] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            disabled={isLoading}
          />
          <Instagram className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
        </div>
        {errors.handle && <p className="text-sm text-destructive">{errors.handle}</p>}
      </div>

      {/* Nicho */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Nicho</label>
        <div className="relative">
          <select
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            className="w-full h-12 px-4 pr-10 rounded-xl border border-white/[0.08] bg-white/[0.04] text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            disabled={isLoading}
          >
            <option value="" style={{ background: "#11151C", color: "#9ca3af" }}>Selecione o nicho</option>
            {NICHOS.map((n) => (
              <option key={n.value} value={n.value} style={{ background: "#11151C", color: "#e0e4eb" }}>{n.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
        </div>
        {errors.nicho && <p className="text-sm text-destructive">{errors.nicho}</p>}
      </div>

      {/* Objetivo */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Objetivo principal</label>
        <div className="relative">
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="w-full h-12 px-4 pr-10 rounded-xl border border-white/[0.08] bg-white/[0.04] text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            disabled={isLoading}
          >
            <option value="" style={{ background: "#11151C", color: "#9ca3af" }}>Selecione o objetivo</option>
            {OBJETIVOS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "#11151C", color: "#e0e4eb" }}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
        </div>
        {errors.objetivo && <p className="text-sm text-destructive">{errors.objetivo}</p>}
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-full bg-gradient-brand text-primary-foreground font-semibold text-sm tracking-wide flex items-center justify-center gap-2 glow-brand hover:glow-brand-strong transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" />
        Analisar perfil
      </button>
    </form>
  );
}
