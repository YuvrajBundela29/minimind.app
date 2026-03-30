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
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      arena_challenges: {
        Row: {
          active: boolean | null
          correct_answer: string
          created_at: string | null
          date: string
          difficulty: string | null
          explanation: string
          hint: string | null
          id: string
          question: string
          subject: string
          topic: string
        }
        Insert: {
          active?: boolean | null
          correct_answer: string
          created_at?: string | null
          date: string
          difficulty?: string | null
          explanation: string
          hint?: string | null
          id?: string
          question: string
          subject: string
          topic: string
        }
        Update: {
          active?: boolean | null
          correct_answer?: string
          created_at?: string | null
          date?: string
          difficulty?: string | null
          explanation?: string
          hint?: string | null
          id?: string
          question?: string
          subject?: string
          topic?: string
        }
        Relationships: []
      }
      arena_leaderboard: {
        Row: {
          challenge_id: string
          display_name: string | null
          id: string
          rank: number | null
          score: number
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          display_name?: string | null
          id?: string
          rank?: number | null
          score: number
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          display_name?: string | null
          id?: string
          rank?: number | null
          score?: number
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_leaderboard_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_submissions: {
        Row: {
          challenge_id: string
          id: string
          score: number | null
          submitted_at: string | null
          time_taken_seconds: number | null
          used_hint: boolean | null
          user_answer: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          score?: number | null
          submitted_at?: string | null
          time_taken_seconds?: number | null
          used_hint?: boolean | null
          user_answer: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          score?: number | null
          submitted_at?: string | null
          time_taken_seconds?: number | null
          used_hint?: boolean | null
          user_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_code: string
          id: string
          issued_at: string | null
          learning_path_id: string
          learning_path_name: string
          mastery_score: number
          user_id: string
        }
        Insert: {
          certificate_code: string
          id?: string
          issued_at?: string | null
          learning_path_id: string
          learning_path_name: string
          mastery_score: number
          user_id: string
        }
        Update: {
          certificate_code?: string
          id?: string
          issued_at?: string | null
          learning_path_id?: string
          learning_path_name?: string
          mastery_score?: number
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_child_links: {
        Row: {
          child_nickname: string | null
          child_user_id: string
          code_expires_at: string | null
          id: string
          link_code: string | null
          linked_at: string | null
          parent_user_id: string
        }
        Insert: {
          child_nickname?: string | null
          child_user_id: string
          code_expires_at?: string | null
          id?: string
          link_code?: string | null
          linked_at?: string | null
          parent_user_id: string
        }
        Update: {
          child_nickname?: string | null
          child_user_id?: string
          code_expires_at?: string | null
          id?: string
          link_code?: string | null
          linked_at?: string | null
          parent_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          selected_frame: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          selected_frame?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          selected_frame?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referred_rewarded: boolean
          referrer_id: string
          referrer_rewarded: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referred_rewarded?: boolean
          referrer_id: string
          referrer_rewarded?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referred_rewarded?: boolean
          referrer_id?: string
          referrer_rewarded?: boolean
        }
        Relationships: []
      }
      saved_notes: {
        Row: {
          created_at: string
          id: string
          language: string | null
          mode: string | null
          query_text: string | null
          response_text: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          mode?: string | null
          query_text?: string | null
          response_text?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          mode?: string | null
          query_text?: string | null
          response_text?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          cost_coins: number
          description: string | null
          id: string
          is_active: boolean | null
          item_type: string
          name: string
        }
        Insert: {
          cost_coins: number
          description?: string | null
          id: string
          is_active?: boolean | null
          item_type: string
          name: string
        }
        Update: {
          cost_coins?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          name?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          language: string | null
          mode: string | null
          query_text: string | null
          response_length: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          mode?: string | null
          query_text?: string | null
          response_length?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          mode?: string | null
          query_text?: string | null
          response_length?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number | null
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_history: {
        Row: {
          answers: Json
          created_at: string
          id: string
          language: string
          question: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          language?: string
          question: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          language?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          id: string
          item_id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          custom_lens_prompt: string | null
          id: string
          language: string
          notifications_enabled: boolean
          purpose_lens: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_lens_prompt?: string | null
          id?: string
          language?: string
          notifications_enabled?: boolean
          purpose_lens?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_lens_prompt?: string | null
          id?: string
          language?: string
          notifications_enabled?: boolean
          purpose_lens?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_statistics: {
        Row: {
          created_at: string
          current_streak: number
          favorite_mode: string | null
          id: string
          last_activity_date: string | null
          longest_streak: number
          questions_today: number
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          favorite_mode?: string | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          questions_today?: number
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          favorite_mode?: string | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          questions_today?: number
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          streak_shields: number
          streak_updated_at: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          streak_shields?: number
          streak_updated_at?: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          streak_shields?: number
          streak_updated_at?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          credits_daily_used: number
          credits_last_daily_reset: string | null
          credits_last_monthly_reset: string | null
          credits_monthly_used: number
          current_period_end: string | null
          current_period_start: string | null
          daily_questions_used: number | null
          grace_period_end: string | null
          id: string
          last_question_reset: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          razorpay_customer_id: string | null
          razorpay_order_id: string | null
          razorpay_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_daily_used?: number
          credits_last_daily_reset?: string | null
          credits_last_monthly_reset?: string | null
          credits_monthly_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          daily_questions_used?: number | null
          grace_period_end?: string | null
          id?: string
          last_question_reset?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          razorpay_customer_id?: string | null
          razorpay_order_id?: string | null
          razorpay_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_daily_used?: number
          credits_last_daily_reset?: string | null
          credits_last_monthly_reset?: string | null
          credits_monthly_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          daily_questions_used?: number | null
          grace_period_end?: string | null
          id?: string
          last_question_reset?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          razorpay_customer_id?: string | null
          razorpay_order_id?: string | null
          razorpay_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_subscription_view: {
        Row: {
          created_at: string | null
          credits_daily_used: number | null
          credits_last_daily_reset: string | null
          credits_last_monthly_reset: string | null
          credits_monthly_used: number | null
          current_period_end: string | null
          current_period_start: string | null
          id: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits_daily_used?: number | null
          credits_last_daily_reset?: string | null
          credits_last_monthly_reset?: string | null
          credits_monthly_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits_daily_used?: number | null
          credits_last_daily_reset?: string | null
          credits_last_monthly_reset?: string | null
          credits_monthly_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_referral_code: { Args: { p_code: string }; Returns: Json }
      deduct_user_credit: {
        Args: { p_cost: number; p_user_id: string }
        Returns: Json
      }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_user_subscription: {
        Args: never
        Returns: {
          created_at: string
          credits_daily_used: number
          credits_last_daily_reset: string
          credits_last_monthly_reset: string
          credits_monthly_used: number
          current_period_end: string
          current_period_start: string
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }[]
      }
      refund_user_credit: {
        Args: { p_cost: number; p_user_id: string }
        Returns: Json
      }
      update_user_credits: {
        Args: {
          p_daily_reset?: string
          p_daily_used: number
          p_monthly_reset?: string
          p_monthly_used: number
        }
        Returns: boolean
      }
      use_daily_question: { Args: never; Returns: boolean }
    }
    Enums: {
      plan_type: "monthly" | "yearly"
      subscription_status: "active" | "cancelled" | "expired" | "pending"
      subscription_tier: "free" | "plus" | "pro"
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
    Enums: {
      plan_type: ["monthly", "yearly"],
      subscription_status: ["active", "cancelled", "expired", "pending"],
      subscription_tier: ["free", "plus", "pro"],
    },
  },
} as const
