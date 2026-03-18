import type { WeeklyContentPlan, StoriesPlan } from "@/types/analysis";

export interface ShowcaseProfileData {
  bio: string;
  following: number;
  posts_count: number;
  // Bio analysis
  bio_score: number;
  bio_score_new: number;
  suggested_bio: string;
  rationale: string;
  cta_option: string;
  criteria: { clarity: number; authority: number; cta: number; seo: number; brand_voice: number; specificity: number };
  criteria_new: { clarity: number; authority: number; cta: number; seo: number; brand_voice: number; specificity: number };
  // Raio-X da Bio (diagnostic)
  proposta_valor: string;
  segmentacao_publico: string;
  gatilhos_autoridade: string;
  cta_conversao: string;
  seo_instagram: string;
  tom_de_voz: string;
  // Strengths & improvements
  strengths: string;
  improvements: string;
  // Top post
  top_caption: string;
  top_likes: number;
  top_comments: number;
  top_views: number;
  top_engagement: number;
  top_score: number;
  top_resumo: string;
  top_positivos: string[];
  top_negativos: string[];
  top_gancho: string;
  top_legenda: string;
  top_formato: string;
  top_hashtags: string;
  top_rubrica: { gancho: number; legenda: number; formato: number; engajamento: number; estrategia: number };
  top_recomendacoes: string[];
  // Worst post
  worst_caption: string;
  worst_likes: number;
  worst_comments: number;
  worst_views: number;
  worst_engagement: number;
  worst_score: number;
  worst_resumo: string;
  worst_positivos: string[];
  worst_negativos: string[];
  worst_gancho: string;
  worst_legenda: string;
  worst_formato: string;
  worst_hashtags: string;
  worst_rubrica: { gancho: number; legenda: number; formato: number; engajamento: number; estrategia: number };
  worst_recomendacoes: string[];
  // Next post suggestion
  next_format: string;
  next_hook: string;
  next_outline: string[];
  next_cta: string;
  next_angle: string;
  // Weekly content plan
  weekly_content_plan: WeeklyContentPlan;
  // Stories plan (source data has 30 sequences, sliced to 7 at runtime)
  stories_plan: StoriesPlan;
}
