import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client with fallback placeholders to prevent crashing during build-time prerendering
// The actual keys MUST be provided in the runtime environment (Vercel Project Settings)
export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Database types (will be generated from Supa base later)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'super_admin' | 'institution_admin' | 'student';
          status: 'active' | 'inactive' | 'suspended' | 'pending';
          avatar_url: string | null;
          email_verified: boolean;
          is_solo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      subjects: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
      };
      topics: {
        Row: {
          id: number;
          subject_id: number;
          name: string;
          description: string | null;
          sequence_order: number;
          estimated_hours: number | null;
          prerequisites: string[] | null;
          difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      subtopics: {
        Row: {
          id: number;
          topic_id: number;
          name: string;
          content_markdown: string | null;
          video_url: string | null;
          estimated_minutes: number | null;
          sequence_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      mcqs: {
        Row: {
          id: number;
          subtopic_id: number;
          question: string;
          question_image_url: string | null;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: 'A' | 'B' | 'C' | 'D';
          explanation: string | null;
          explanation_url: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          upload_id: number | null;
          is_active: boolean;
          times_attempted: number;
          times_correct: number;
          created_at: string;
          updated_at: string;
        };
      };
      practice_sessions: {
        Row: {
          id: number;
          student_id: string;
          subtopic_id: number | null;
          university_id: number | null;
          session_type: string;
          started_at: string;
          completed_at: string | null;
          total_questions: number;
          correct_answers: number;
          wrong_answers: number;
          skipped_questions: number;
          score_percentage: number | null;
          time_spent_seconds: number;
          is_completed: boolean;
        };
      };
    };
  };
};
