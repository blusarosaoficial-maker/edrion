import { Users, TrendingUp, ArrowRight, Eye, CheckCircle2 } from "lucide-react";
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
    handle: "bianca",
    name: "Bianca Andrade",
    niche: "empreendedorismo",
    nicheLabel: "Empreendedorismo",
    avatar_url: "https://unavatar.io/instagram/bianca",
    followers: 19_200_000,
    engagement: 0.86,
    healthScore: 72,
    is_verified: true,
  },
  {
    handle: "thiago.nigro",
    name: "Thiago Nigro",
    niche: "financas",
    nicheLabel: "Educação Financeira",
    avatar_url: "https://unavatar.io/instagram/thiago.nigro",
    followers: 10_200_000,
    engagement: 0.69,
    healthScore: 78,
    is_verified: true,
  },
  {
    handle: "francinyehlke",
    name: "Franciny Ehlke",
    niche: "beleza",
    nicheLabel: "Beleza & Lifestyle",
    avatar_url: "https://unavatar.io/instagram/francinyehlke",
    followers: 18_700_000,
    engagement: 1.52,
    healthScore: 81,
    is_verified: true,
  },
  {
    handle: "camilacoutinho",
    name: "Camila Coutinho",
    niche: "moda",
    nicheLabel: "Moda",
    avatar_url: "https://unavatar.io/instagram/camilacoutinho",
    followers: 2_450_000,
    engagement: 0.79,
    healthScore: 68,
    is_verified: true,
  },
  {
    handle: "mohindi",
    name: "Mohamad Hindi",
    niche: "gastronomia",
    nicheLabel: "Gastronomia",
    avatar_url: "https://unavatar.io/instagram/mohindi",
    followers: 822_000,
    engagement: 1.30,
    healthScore: 83,
    is_verified: true,
  },
  {
    handle: "nortonmello",
    name: "Norton Mello",
    niche: "fitness",
    nicheLabel: "Fitness",
    avatar_url: "https://unavatar.io/instagram/nortonmello",
    followers: 837_000,
    engagement: 2.10,
    healthScore: 80,
    is_verified: false,
  },
  {
    handle: "whinderssonnunes",
    name: "Whindersson Nunes",
    niche: "entretenimento",
    nicheLabel: "Entretenimento",
    avatar_url: "https://unavatar.io/instagram/whinderssonnunes",
    followers: 56_500_000,
    engagement: 3.52,
    healthScore: 89,
    is_verified: true,
  },
  {
    handle: "manualdomundo",
    name: "Manual do Mundo",
    niche: "educacao",
    nicheLabel: "Educação",
    avatar_url: "https://unavatar.io/instagram/manualdomundo",
    followers: 3_000_000,
    engagement: 0.80,
    healthScore: 76,
    is_verified: true,
  },
  {
    handle: "eduardofeldberg",
    name: "Eduardo Feldberg",
    niche: "financas",
    nicheLabel: "Finanças & Humor",
    avatar_url: "https://unavatar.io/instagram/eduardofeldberg",
    followers: 3_200_000,
    engagement: 1.50,
    healthScore: 82,
    is_verified: true,
  },
  {
    handle: "virginia",
    name: "Virginia Fonseca",
    niche: "lifestyle",
    nicheLabel: "Lifestyle",
    avatar_url: "https://unavatar.io/instagram/virginia",
    followers: 54_000_000,
    engagement: 3.50,
    healthScore: 87,
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
  const handleCardClick = (profile: ShowcaseProfile) => {
    trackShowcaseClick(profile.handle, profile.niche);
    onProfileClick(profile.handle);
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
          {SHOWCASE_PROFILES.map((profile) => (
              <CarouselItem
                key={profile.handle}
                className="pl-3 basis-[72%] sm:basis-[48%] md:basis-[32%]"
              >
                <button
                  onClick={() => handleCardClick(profile)}
                  className="showcase-card w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.02] transition-all duration-300 p-4 space-y-3"
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

                  {/* CTA */}
                  <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Eye className="w-3 h-3" />
                    Ver análise
                  </div>
                </button>
              </CarouselItem>
            ))}
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
