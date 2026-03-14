import { useState } from "react";
import { Users, TrendingUp, ArrowRight, Eye, Lock, CheckCircle2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { trackShowcaseClick } from "@/utils/showcaseTracker";

export interface ShowcaseProfile {
  handle: string;
  name: string;
  niche: string;
  nicheLabel: string;
  avatar_url: string;
  followers: number;
  engagement: number;
  healthScore: number;
  is_verified: boolean;
}

const SHOWCASE_PROFILES: ShowcaseProfile[] = [
  {
    handle: "biaborges",
    name: "Bianca Andrade",
    niche: "empreendedorismo",
    nicheLabel: "Empreendedorismo",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/biaborges.jpg",
    followers: 19_200_000,
    engagement: 2.8,
    healthScore: 82,
    is_verified: true,
  },
  {
    handle: "thiago.nigro",
    name: "Thiago Nigro",
    niche: "financas",
    nicheLabel: "Educação Financeira",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/thiago.nigro.jpg",
    followers: 9_400_000,
    engagement: 3.1,
    healthScore: 87,
    is_verified: true,
  },
  {
    handle: "francinyehlke",
    name: "Franciny Ehlke",
    niche: "beleza",
    nicheLabel: "Beleza & Lifestyle",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/francinyehlke.jpg",
    followers: 19_000_000,
    engagement: 3.2,
    healthScore: 85,
    is_verified: true,
  },
  {
    handle: "camilacoutinho",
    name: "Camila Coutinho",
    niche: "moda",
    nicheLabel: "Moda",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/camilacoutinho.jpg",
    followers: 3_000_000,
    engagement: 2.5,
    healthScore: 79,
    is_verified: true,
  },
  {
    handle: "mohindi",
    name: "Mohamad Hindi",
    niche: "gastronomia",
    nicheLabel: "Gastronomia",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/mohindi.jpg",
    followers: 1_000_000,
    engagement: 4.1,
    healthScore: 88,
    is_verified: true,
  },
  {
    handle: "nortonmello",
    name: "Norton Mello",
    niche: "fitness",
    nicheLabel: "Fitness",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/nortonmello.jpg",
    followers: 837_000,
    engagement: 3.8,
    healthScore: 84,
    is_verified: false,
  },
  {
    handle: "waborges",
    name: "Whindersson Nunes",
    niche: "entretenimento",
    nicheLabel: "Entretenimento",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/waborges.jpg",
    followers: 56_000_000,
    engagement: 3.5,
    healthScore: 91,
    is_verified: true,
  },
  {
    handle: "manualdomundo",
    name: "Manual do Mundo",
    niche: "educacao",
    nicheLabel: "Educação",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/manualdomundo.jpg",
    followers: 3_000_000,
    engagement: 4.5,
    healthScore: 90,
    is_verified: true,
  },
  {
    handle: "eduardofeldberg",
    name: "Eduardo Feldberg",
    niche: "financas",
    nicheLabel: "Finanças & Humor",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/eduardofeldberg.jpg",
    followers: 3_000_000,
    engagement: 3.9,
    healthScore: 86,
    is_verified: true,
  },
  {
    handle: "virginia",
    name: "Virginia Fonseca",
    niche: "lifestyle",
    nicheLabel: "Lifestyle",
    avatar_url: "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public/avatars/virginia.jpg",
    followers: 54_000_000,
    engagement: 2.9,
    healthScore: 89,
    is_verified: true,
  },
];

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

function scoreColor(score: number): string {
  if (score >= 85) return "#10B981";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

function ScoreRing({ score }: { score: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0">
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="3"
      />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
        className="showcase-score-ring"
        style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
      />
    </svg>
  );
}

interface Props {
  onProfileClick: (handle: string) => void;
  onAnalyzeClick: () => void;
}

export default function ShowcaseCarousel({ onProfileClick, onAnalyzeClick }: Props) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardClick = (profile: ShowcaseProfile) => {
    trackShowcaseClick(profile.handle, profile.niche);
    if (expandedCard === profile.handle) {
      onProfileClick(profile.handle);
    } else {
      setExpandedCard(profile.handle);
    }
  };

  return (
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Análises de perfis reais
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Veja como os maiores perfis do Brasil se saem
          </p>
        </div>
        <button
          onClick={onAnalyzeClick}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Analisar meu perfil
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {SHOWCASE_PROFILES.map((profile) => {
            const isExpanded = expandedCard === profile.handle;
            return (
              <CarouselItem
                key={profile.handle}
                className="pl-3 basis-[72%] sm:basis-[48%] md:basis-[32%]"
              >
                <button
                  onClick={() => handleCardClick(profile)}
                  className={`showcase-card w-full text-left rounded-xl border transition-all duration-300 p-4 space-y-3 ${
                    isExpanded
                      ? "border-primary/30 bg-primary/5 scale-[1.02]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Avatar + Score Ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 shrink-0">
                      <ScoreRing score={profile.healthScore} />
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="w-10 h-10 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-cover bg-muted"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=6A5CFF&color=fff&size=128&bold=true`;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {profile.name}
                        </p>
                        {profile.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile.handle}
                      </p>
                    </div>
                  </div>

                  {/* Niche tag */}
                  <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">
                    {profile.nicheLabel}
                  </span>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{formatFollowers(profile.followers)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>{profile.engagement}%</span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground/60">Nota geral</span>
                      <span
                        className="font-bold"
                        style={{ color: scoreColor(profile.healthScore) }}
                      >
                        {profile.healthScore}/100
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full showcase-score-bar"
                        style={{
                          width: `${profile.healthScore}%`,
                          backgroundColor: scoreColor(profile.healthScore),
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded state - CTA */}
                  {isExpanded && (
                    <div className="pt-1 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="text-[11px] text-muted-foreground">
                          Bio, posts e estratégia analisados
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary py-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Lock className="w-3 h-3" />
                          Ver análise
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Bottom CTA */}
      <div className="text-center pt-1">
        <button
          onClick={onAnalyzeClick}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Quer ver a sua análise? Comece agora — é grátis
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

export { SHOWCASE_PROFILES };
