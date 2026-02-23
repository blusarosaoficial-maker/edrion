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
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
      {/* Handle */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Perfil do Instagram</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
          <input
            type="text"
            placeholder="seuperfil"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full h-12 pl-8 pr-4 rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            disabled={isLoading}
          />
          <Instagram className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
        {errors.handle && <p className="text-sm text-destructive">{errors.handle}</p>}
      </div>

      {/* Nicho */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Nicho</label>
        <div className="relative">
          <select
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            className="w-full h-12 px-4 pr-10 rounded-lg border border-border bg-secondary text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            disabled={isLoading}
          >
            <option value="" className="text-muted-foreground">Selecione o nicho</option>
            {NICHOS.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {errors.nicho && <p className="text-sm text-destructive">{errors.nicho}</p>}
      </div>

      {/* Objetivo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Objetivo principal</label>
        <div className="relative">
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="w-full h-12 px-4 pr-10 rounded-lg border border-border bg-secondary text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            disabled={isLoading}
          >
            <option value="" className="text-muted-foreground">Selecione o objetivo</option>
            {OBJETIVOS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {errors.objetivo && <p className="text-sm text-destructive">{errors.objetivo}</p>}
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 glow-brand hover:glow-brand-strong transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-5 h-5" />
        Analisar perfil
      </button>
    </form>
  );
}
