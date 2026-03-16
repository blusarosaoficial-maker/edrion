export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analysis_request: {
        Row: {
          created_at: string
          handle: string
          id: string
          nicho: string
          objetivo: string
          plan_at_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          nicho: string
          objetivo: string
          plan_at_time?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          nicho?: string
          objetivo?: string
          plan_at_time?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_result: {
        Row: {
          created_at: string
          handle: string
          id: string
          request_id: string
          result_json: Json
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          request_id: string
          result_json: Json
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          request_id?: string
          result_json?: Json
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_result_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "analysis_request"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_at: string | null
          email: string
          id: string
          notes: string | null
          reason: string
          user_id: string | null
        }
        Insert: {
          blocked_at?: string | null
          email: string
          id?: string
          notes?: string | null
          reason?: string
          user_id?: string | null
        }
        Update: {
          blocked_at?: string | null
          email?: string
          id?: string
          notes?: string | null
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hotmart_transactions: {
        Row: {
          analysis_result_id: string | null
          buyer_email: string
          buyer_name: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          offer_code: string | null
          payment_type: string | null
          price_currency: string | null
          price_value: number | null
          processed: boolean
          processed_at: string | null
          product_id: number | null
          product_name: string | null
          raw_payload: Json | null
          transaction_code: string
          user_id: string | null
          webhook_event_id: string
        }
        Insert: {
          analysis_result_id?: string | null
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          offer_code?: string | null
          payment_type?: string | null
          price_currency?: string | null
          price_value?: number | null
          processed?: boolean
          processed_at?: string | null
          product_id?: number | null
          product_name?: string | null
          raw_payload?: Json | null
          transaction_code?: string
          user_id?: string | null
          webhook_event_id: string
        }
        Update: {
          analysis_result_id?: string | null
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          offer_code?: string | null
          payment_type?: string | null
          price_currency?: string | null
          price_value?: number | null
          processed?: boolean
          processed_at?: string | null
          product_id?: number | null
          product_name?: string | null
          raw_payload?: Json | null
          transaction_code?: string
          user_id?: string | null
          webhook_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_transactions_analysis_result_id_fkey"
            columns: ["analysis_result_id"]
            isOneToOne: false
            referencedRelation: "analysis_result"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_captures: {
        Row: {
          converted: boolean
          coupon_code: string | null
          created_at: string
          email: string | null
          handle: string | null
          id: string
          name: string
          whatsapp: string
        }
        Insert: {
          converted?: boolean
          coupon_code?: string | null
          created_at?: string
          email?: string | null
          handle?: string | null
          id?: string
          name: string
          whatsapp: string
        }
        Update: {
          converted?: boolean
          coupon_code?: string | null
          created_at?: string
          email?: string | null
          handle?: string | null
          id?: string
          name?: string
          whatsapp?: string
        }
        Relationships: []
      }
      referral_signups: {
        Row: {
          created_at: string
          id: string
          referral_id: string
          referred_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_id: string
          referred_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_id?: string
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_signups_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          rewarded: boolean
          signups_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          rewarded?: boolean
          signups_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          rewarded?: boolean
          signups_count?: number
          user_id?: string
        }
        Relationships: []
      }
      users_profiles: {
        Row: {
          analysis_credits: number
          created_at: string
          email: string
          free_analysis_used: boolean
          id: string
          plan: string
        }
        Insert: {
          analysis_credits?: number
          created_at?: string
          email: string
          free_analysis_used?: boolean
          id: string
          plan?: string
        }
        Update: {
          analysis_credits?: number
          created_at?: string
          email?: string
          free_analysis_used?: boolean
          id?: string
          plan?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_analysis_credits: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_email_blocked: { Args: { p_email: string }; Returns: boolean }
      process_referral_signup: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
