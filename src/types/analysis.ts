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

export interface BioSuggestion {
  current_bio: string;
  suggested_bio: string;
  rationale_short: string;
  cta_option: string;
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
    next_post_suggestion: NextPostSuggestion;
  };
  limits: {
    posts_analyzed: number;
    note: string;
  };
}

export type AnalysisError = "private" | "not_found" | "timeout";

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: AnalysisError;
}
