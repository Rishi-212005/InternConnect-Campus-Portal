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
      applications: {
        Row: {
          created_at: string
          faculty_approved_at: string | null
          faculty_id: string | null
          faculty_notes: string | null
          id: string
          job_id: string
          match_score: number | null
          recruiter_notes: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faculty_approved_at?: string | null
          faculty_id?: string | null
          faculty_notes?: string | null
          id?: string
          job_id: string
          match_score?: number | null
          recruiter_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          faculty_approved_at?: string | null
          faculty_id?: string | null
          faculty_notes?: string | null
          id?: string
          job_id?: string
          match_score?: number | null
          recruiter_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_time: string | null
          id: string
          job_id: string
          max_attempts: number | null
          min_questions: number | null
          passing_score: number
          start_time: string | null
          status: string | null
          title: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          job_id: string
          max_attempts?: number | null
          min_questions?: number | null
          passing_score?: number
          start_time?: string | null
          status?: string | null
          title: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          job_id?: string
          max_attempts?: number | null
          min_questions?: number | null
          passing_score?: number
          start_time?: string | null
          status?: string | null
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      code_submissions: {
        Row: {
          attempt_id: string
          code: string
          error: string | null
          execution_time_ms: number | null
          id: string
          language: string | null
          output: string | null
          question_id: string
          score: number | null
          submitted_at: string
          test_cases_passed: number | null
          total_test_cases: number | null
        }
        Insert: {
          attempt_id: string
          code: string
          error?: string | null
          execution_time_ms?: number | null
          id?: string
          language?: string | null
          output?: string | null
          question_id: string
          score?: number | null
          submitted_at?: string
          test_cases_passed?: number | null
          total_test_cases?: number | null
        }
        Update: {
          attempt_id?: string
          code?: string
          error?: string | null
          execution_time_ms?: number | null
          id?: string
          language?: string | null
          output?: string | null
          question_id?: string
          score?: number | null
          submitted_at?: string
          test_cases_passed?: number | null
          total_test_cases?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "code_submissions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "coding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_questions: {
        Row: {
          assessment_id: string
          constraints: string | null
          created_at: string
          description: string
          difficulty: string | null
          examples: string | null
          expected_output: string | null
          id: string
          points: number | null
          starter_code: string | null
          test_cases: Json
          time_limit_seconds: number | null
          title: string
        }
        Insert: {
          assessment_id: string
          constraints?: string | null
          created_at?: string
          description: string
          difficulty?: string | null
          examples?: string | null
          expected_output?: string | null
          id?: string
          points?: number | null
          starter_code?: string | null
          test_cases?: Json
          time_limit_seconds?: number | null
          title: string
        }
        Update: {
          assessment_id?: string
          constraints?: string | null
          created_at?: string
          description?: string
          difficulty?: string | null
          examples?: string | null
          expected_output?: string | null
          id?: string
          points?: number | null
          starter_code?: string | null
          test_cases?: Json
          time_limit_seconds?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          application_id: string | null
          assessment_id: string
          created_at: string
          id: string
          next_round_info: string | null
          percentage_score: number | null
          result_confirmed: boolean | null
          result_confirmed_at: string | null
          result_confirmed_by: string | null
          started_at: string
          status: string | null
          student_id: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          application_id?: string | null
          assessment_id: string
          created_at?: string
          id?: string
          next_round_info?: string | null
          percentage_score?: number | null
          result_confirmed?: boolean | null
          result_confirmed_at?: string | null
          result_confirmed_by?: string | null
          started_at?: string
          status?: string | null
          student_id: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          application_id?: string | null
          assessment_id?: string
          created_at?: string
          id?: string
          next_round_info?: string | null
          percentage_score?: number | null
          result_confirmed?: boolean | null
          result_confirmed_at?: string | null
          result_confirmed_by?: string | null
          started_at?: string
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "student_applications_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_profiles: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          employee_id: string | null
          id: string
          is_approved: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_schedules: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          interview_status: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          scheduled_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_status?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          scheduled_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_status?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          scheduled_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "student_applications_view"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_name: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          job_type: string | null
          location: string | null
          min_cgpa: number | null
          recruiter_id: string
          required_skills: string[] | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          min_cgpa?: number | null
          recruiter_id: string
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          min_cgpa?: number | null
          recruiter_id?: string
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      mentor_requests: {
        Row: {
          created_at: string
          department: string
          id: string
          mentor_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          mentor_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          mentor_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          assessment_id: string
          correct_answer: string
          created_at: string
          id: string
          marks: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
        }
        Insert: {
          assessment_id: string
          correct_answer: string
          created_at?: string
          id?: string
          marks?: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
        }
        Update: {
          assessment_id?: string
          correct_answer?: string
          created_at?: string
          id?: string
          marks?: number
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          marks_obtained: number | null
          question_id: string
          selected_answer: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_obtained?: number | null
          question_id: string
          selected_answer?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_obtained?: number | null
          question_id?: string
          selected_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_profiles: {
        Row: {
          company_logo_url: string | null
          company_name: string
          company_website: string | null
          created_at: string
          designation: string | null
          id: string
          is_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_logo_url?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          cgpa: number | null
          created_at: string
          department: string | null
          github_url: string | null
          id: string
          is_verified: boolean | null
          linkedin_url: string | null
          resume_url: string | null
          roll_number: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
          year_of_study: number | null
        }
        Insert: {
          cgpa?: number | null
          created_at?: string
          department?: string | null
          github_url?: string | null
          id?: string
          is_verified?: boolean | null
          linkedin_url?: string | null
          resume_url?: string | null
          roll_number?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
          year_of_study?: number | null
        }
        Update: {
          cgpa?: number | null
          created_at?: string
          department?: string | null
          github_url?: string | null
          id?: string
          is_verified?: boolean | null
          linkedin_url?: string | null
          resume_url?: string | null
          roll_number?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          year_of_study?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      student_applications_view: {
        Row: {
          created_at: string | null
          faculty_approved_at: string | null
          faculty_id: string | null
          id: string | null
          job_id: string | null
          match_score: number | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          faculty_approved_at?: string | null
          faculty_id?: string | null
          id?: string | null
          job_id?: string | null
          match_score?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          faculty_approved_at?: string | null
          faculty_id?: string | null
          id?: string | null
          job_id?: string | null
          match_score?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "recruiter" | "placement" | "faculty" | "admin"
      application_status:
        | "pending"
        | "faculty_approved"
        | "faculty_rejected"
        | "applied"
        | "shortlisted"
        | "interview"
        | "selected"
        | "rejected"
      job_status: "draft" | "pending_verification" | "active" | "closed"
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
      app_role: ["student", "recruiter", "placement", "faculty", "admin"],
      application_status: [
        "pending",
        "faculty_approved",
        "faculty_rejected",
        "applied",
        "shortlisted",
        "interview",
        "selected",
        "rejected",
      ],
      job_status: ["draft", "pending_verification", "active", "closed"],
    },
  },
} as const
