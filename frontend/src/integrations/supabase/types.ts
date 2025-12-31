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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_active_at: string | null
          last_name: string
          logout_time: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_active_at?: string | null
          last_name: string
          logout_time?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_active_at?: string | null
          last_name?: string
          logout_time?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      ai_notes: {
        Row: {
          created_at: string | null
          id: string
          incorrect_count: number
          level: string
          result_id: string
          student_id: string
          subject: string | null
          topic_notes: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          incorrect_count?: number
          level: string
          result_id: string
          student_id: string
          subject?: string | null
          topic_notes?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          incorrect_count?: number
          level?: string
          result_id?: string
          student_id?: string
          subject?: string | null
          topic_notes?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_notes_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: true
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reviews: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          result_id: string
          review_content: string
          student_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          result_id: string
          review_content: string
          student_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          result_id?: string
          review_content?: string
          student_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "question_analytics"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "ai_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reviews_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          target_audience: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_audience: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_audience?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string | null
          id: string
          student_id: string
          thread_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          student_id: string
          thread_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          student_id?: string
          thread_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      exam_locks: {
        Row: {
          created_at: string | null
          id: string
          level: string
          question_ids: Json
          status: string | null
          student_id: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          question_ids: Json
          status?: string | null
          student_id?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          question_ids?: Json
          status?: string | null
          student_id?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_locks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_admins: {
        Row: {
          activated_at: string | null
          created_at: string | null
          designation: string | null
          email: string
          id: string
          institution_id: string | null
          magic_link_expires: string | null
          magic_link_token: string | null
          name: string | null
          phone: string | null
          rejection_reason: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          designation?: string | null
          email: string
          id?: string
          institution_id?: string | null
          magic_link_expires?: string | null
          magic_link_token?: string | null
          name?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          designation?: string | null
          email?: string
          id?: string
          institution_id?: string | null
          magic_link_expires?: string | null
          magic_link_token?: string | null
          name?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_admins_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          affiliation_number: string | null
          approved_at: string | null
          approved_by: string | null
          country: string | null
          created_at: string | null
          documents_url: string | null
          id: string
          name: string
          rejection_reason: string | null
          state: string | null
          status: string
          type: string | null
          website: string | null
        }
        Insert: {
          affiliation_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          country?: string | null
          created_at?: string | null
          documents_url?: string | null
          id?: string
          name: string
          rejection_reason?: string | null
          state?: string | null
          status?: string
          type?: string | null
          website?: string | null
        }
        Update: {
          affiliation_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          country?: string | null
          created_at?: string | null
          documents_url?: string | null
          id?: string
          name?: string
          rejection_reason?: string | null
          state?: string | null
          status?: string
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          receiver_type: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          receiver_type: string
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          receiver_type?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          assigned_result_id: string | null
          created_at: string | null
          id: string
          is_used: boolean | null
          level: string
          question_content: Json
          status: string | null
          subject: string
          used_at: string | null
        }
        Insert: {
          assigned_result_id?: string | null
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          level: string
          question_content: Json
          status?: string | null
          subject: string
          used_at?: string | null
        }
        Update: {
          assigned_result_id?: string | null
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          level?: string
          question_content?: Json
          status?: string | null
          subject?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_assigned_result_id_fkey"
            columns: ["assigned_result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reviews: {
        Row: {
          created_at: string | null
          explanation: string | null
          id: string
          is_correct: boolean
          question_id: string
          result_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          explanation?: string | null
          id?: string
          is_correct: boolean
          question_id: string
          result_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          explanation?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string
          result_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "question_analytics"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "question_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reviews_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          bank_id: string | null
          bank_source_id: string | null
          correct_answer: string
          created_at: string | null
          id: string
          question_text: string
          result_id: string
        }
        Insert: {
          bank_id?: string | null
          bank_source_id?: string | null
          correct_answer: string
          created_at?: string | null
          id?: string
          question_text: string
          result_id: string
        }
        Update: {
          bank_id?: string | null
          bank_source_id?: string | null
          correct_answer?: string
          created_at?: string | null
          id?: string
          question_text?: string
          result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          attempts_easy: number | null
          attempts_hard: number | null
          attempts_medium: number | null
          concession: number | null
          created_at: string | null
          end_time: string | null
          id: string
          level: string
          result: string | null
          score: number | null
          start_time: string | null
          student_id: string
          subject: string | null
          time_taken: number | null
          updated_at: string | null
        }
        Insert: {
          attempts_easy?: number | null
          attempts_hard?: number | null
          attempts_medium?: number | null
          concession?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          level: string
          result?: string | null
          score?: number | null
          start_time?: string | null
          student_id: string
          subject?: string | null
          time_taken?: number | null
          updated_at?: string | null
        }
        Update: {
          attempts_easy?: number | null
          attempts_hard?: number | null
          attempts_medium?: number | null
          concession?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          level?: string
          result?: string | null
          score?: number | null
          start_time?: string | null
          student_id?: string
          subject?: string | null
          time_taken?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_access_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          institution_id: string | null
          last_document_upload_at: string | null
          magic_link_expires: string | null
          magic_link_token: string | null
          name: string
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scorecard_url: string
          status: string
          stream_applied: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          institution_id?: string | null
          last_document_upload_at?: string | null
          magic_link_expires?: string | null
          magic_link_token?: string | null
          name: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scorecard_url: string
          status?: string
          stream_applied?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          institution_id?: string | null
          last_document_upload_at?: string | null
          magic_link_expires?: string | null
          magic_link_token?: string | null
          name?: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scorecard_url?: string
          status?: string
          stream_applied?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_access_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "institution_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          student_answer: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          student_answer: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          student_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_analytics"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_final_scores: {
        Row: {
          composite_score: number | null
          concession: number | null
          created_at: string | null
          highest_level: string | null
          id: string
          is_passed: boolean | null
          last_updated: string | null
          levels_passed: number | null
          score_breakdown: Json | null
          student_id: string
          total_time_seconds: number | null
        }
        Insert: {
          composite_score?: number | null
          concession?: number | null
          created_at?: string | null
          highest_level?: string | null
          id?: string
          is_passed?: boolean | null
          last_updated?: string | null
          levels_passed?: number | null
          score_breakdown?: Json | null
          student_id: string
          total_time_seconds?: number | null
        }
        Update: {
          composite_score?: number | null
          concession?: number | null
          created_at?: string | null
          highest_level?: string | null
          id?: string
          is_passed?: boolean | null
          last_updated?: string | null
          levels_passed?: number | null
          score_breakdown?: Json | null
          student_id?: string
          total_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_final_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          access_request_id: string | null
          age: number
          created_at: string | null
          dob: string
          email: string
          first_name: string
          id: string
          institution_id: string | null
          last_active_at: string | null
          last_name: string
          logout_time: string | null
          phone: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          access_request_id?: string | null
          age: number
          created_at?: string | null
          dob: string
          email: string
          first_name: string
          id?: string
          institution_id?: string | null
          last_active_at?: string | null
          last_name: string
          logout_time?: string | null
          phone: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          access_request_id?: string | null
          age?: number
          created_at?: string | null
          dob?: string
          email?: string
          first_name?: string
          id?: string
          institution_id?: string | null
          last_active_at?: string | null
          last_name?: string
          logout_time?: string | null
          phone?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_active_at: string | null
          last_name: string | null
          logout_time: string | null
          name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          logout_time?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          logout_time?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string | null
          difficulty_hint: Json | null
          id: string
          pdf_hash: string
          subject: string
          topic_name: string
        }
        Insert: {
          created_at?: string | null
          difficulty_hint?: Json | null
          id?: string
          pdf_hash: string
          subject: string
          topic_name: string
        }
        Update: {
          created_at?: string | null
          difficulty_hint?: Json | null
          id?: string
          pdf_hash?: string
          subject?: string
          topic_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      question_analytics: {
        Row: {
          attempt_count: number | null
          correct_count: number | null
          correct_percentage: number | null
          question_id: string | null
          question_text: string | null
          result_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_difficult_questions: {
        Args: { min_attempts?: number; threshold?: number }
        Returns: {
          attempts: number
          correct_rate: number
          question_text: string
        }[]
      }
      get_engagement_stats: { Args: never; Returns: Json }
      get_performance_trends: {
        Args: never
        Returns: {
          average_score: number
          date: string
        }[]
      }
      get_stuck_students: {
        Args: { threshold?: number }
        Returns: {
          fail_count: number
          id: string
          level: string
          name: string
        }[]
      }
      match_documents: {
        Args: {
          filter?: Json
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
