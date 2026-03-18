export interface ProfileData {
  handle: string;
  full_name: string;
  avatar_url: string;
  bio_text: string;
  followers: number;
  following: number;
  posts_count: number;
  is_verified: boolean;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  views: number;
  engagement_score: number;
  engagement_rate?: number;
}

export interface PostRubric {
  gancho: number;
  legenda: number;
  formato: number;
  engajamento: number;
  estrategia: number;
}

export interface PostAnalysis {
  resumo_desempenho: string;
  fatores_positivos: string[];
  fatores_negativos: string[];
  analise_gancho: string;
  analise_legenda: string;
  analise_formato: string;
  analise_hashtags: string;
  analise_audio?: string;
  rubrica: PostRubric;
  nota_geral: number;
  recomendacoes: string[];
  classificacao: "gold" | "silver" | "bronze";
}

export interface PostData {
  post_id: string;
  permalink: string;
  thumb_url: string;
  caption_preview: string;
  full_caption?: string;
  post_type?: string;
  hashtags?: string[];
  timestamp?: string;
  is_pinned?: boolean;
  has_location?: boolean;
  music_info?: string | null;
  metrics: PostMetrics;
  tier?: "gold" | "silver" | "bronze";
  analysis?: PostAnalysis | null;
  transcription?: string | null;
  transcription_skipped?: string | null;
}

export interface BioCriteria {
  clarity: number;       // 1-5
  authority: number;     // 1-5
  cta: number;           // 1-5
  seo: number;           // 1-5
  brand_voice: number;   // 1-5
  specificity: number;   // 1-5
}

export interface BioDiagnostic {
  proposta_valor: string;
  segmentacao_publico: string;
  gatilhos_autoridade: string;
  cta_conversao: string;
  seo_instagram: string;
  tom_de_voz: string;
}

export interface BioVariation {
  label: string;
  bio: string;
  rationale: string;
}

export interface BioSuggestion {
  current_bio: string;
  suggested_bio: string;
  rationale_short: string;
  cta_option: string;
  score?: number;
  score_new?: number;
  criteria?: BioCriteria;
  criteria_new?: BioCriteria;
  diagnostic?: BioDiagnostic;
  strengths?: string;
  improvements?: string;
  name_keyword?: string;
  detected_tone?: string;
  variations?: BioVariation[];
}

export interface ScriptScene {
  numero: number;
  titulo_cena?: string;
  instrucao: string;
  duracao_estimada: string;
}

export interface ContentScript {
  dia: number;
  dia_semana: string;
  titulo: string;
  tema: string;
  framework: string;
  formato: string;
  hook: string;
  cenas: ScriptScene[];
  cta: string;
  legenda_sugerida: string;
  hashtags_sugeridas: string[];
}

export interface WeeklyContentPlan {
  scripts: ContentScript[];
  estrategia_semanal: string;
}

export interface StorySequence {
  dia: number;
  tema: string;
  objetivo: string;
  slides: StorySlide[];
}

export interface StorySlide {
  numero: number;
  tipo: "texto" | "enquete" | "quiz" | "caixa_perguntas" | "video_selfie" | "foto" | "countdown" | "link";
  conteudo: string;
  instrucao_visual?: string;
}

export interface StoriesPlan {
  sequences: StorySequence[];
  estrategia_stories: string;
}

export interface HashtagStrategy {
  high_competition: string[];
  medium_competition: string[];
  low_competition: string[];
  usage_tip: string;
}

export interface AnalysisResult {
  profile: ProfileData;
  deliverables: {
    bio_suggestion: BioSuggestion;
    hashtag_strategy?: HashtagStrategy;
    latest_post: PostData;
    top_post: PostData;
    worst_post: PostData;
    weekly_content_plan?: WeeklyContentPlan;
    stories_plan?: StoriesPlan;
    posts_analysis?: PostData[];
    competitors_analysis?: unknown[];
    strategic_score?: unknown;
    improvement_plan?: unknown;
    pdf_available?: boolean;
  };
  limits?: {
    posts_analyzed: number;
    note: string;
  };
  plan: "free" | "premium";
  /** Set to true when result is partial — enrichment (weekly/stories/hashtags) still loading */
  _deferred?: boolean;
}

export type AnalysisError =
  | "auth_required"
  | "private"
  | "not_found"
  | "timeout"
  | "free_limit";

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: AnalysisError;
  pendingResult?: AnalysisResult;
}
