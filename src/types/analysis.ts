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
}

export interface PostData {
  post_id: string;
  permalink: string;
  thumb_url: string;
  caption_preview: string;
  metrics: PostMetrics;
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
}

export interface NextPostSuggestion {
  format: string;
  hook: string;
  outline: string[];
  cta: string;
  angle: string;
}

export interface AnalysisResult {
  profile: ProfileData;
  deliverables: {
    bio_suggestion: BioSuggestion;
    top_post: PostData;
    worst_post: PostData;
    next_post_suggestion?: NextPostSuggestion;
    bio_variations?: string[];
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
