import { shuffleArray, shuffleGrouped } from '../utils';
import { MongoPracticeService } from './mongoPracticeService';

const IS_MONGO = process.env.NEXT_PUBLIC_DATABASE_TYPE === 'MONGODB';

export interface MCQ {
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
    passage_id?: number | null;
}

export interface PracticeSession {
    id: number;
    student_id: string;
    subtopic_id: number | null;
    topic_id: number | null;
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
}

export interface MCQAttempt {
    mcq_id: number;
    selected_option: 'A' | 'B' | 'C' | 'D' | 'SKIPPED';
    is_correct: boolean;
    time_spent_seconds: number;
}

export interface PracticeRules {
    mcq_count_per_session: number;
    easy_percentage: number;
    medium_percentage: number;
    hard_percentage: number;
    time_limit_minutes: number | null;
}

export class PracticeService {
    /**
     * Get practice rules for a university and subject
     */
    static async getPracticeRules(universityId: number, subjectId: number): Promise<PracticeRules> {
        if (IS_MONGO) return MongoPracticeService.getPracticeRules(universityId, subjectId);

        // Fallback default rules
        return {
            mcq_count_per_session: 10,
            easy_percentage: 40,
            medium_percentage: 40,
            hard_percentage: 20,
            time_limit_minutes: null
        };
    }

    /**
     * Generate practice session based on rules
     */
    static async generatePracticeSession(
        subtopicId: number | null,
        universityId: number | null,
        subjectId: number,
        studentId?: string,
        topicId?: number | null
    ): Promise<MCQ[]> {
        if (IS_MONGO) return MongoPracticeService.generatePracticeSession(subtopicId, universityId, subjectId, studentId, topicId);
        return [];
    }

    static async createSession(
        studentId: string,
        subtopicId: number | null,
        universityId: number | null,
        sessionType: string = 'practice',
        topicId: number | null = null,
        mcqIds: number[] = []
    ): Promise<{ session: PracticeSession | null; error: string | null }> {
        if (IS_MONGO) return MongoPracticeService.createSession(studentId, subtopicId, universityId, sessionType, topicId, mcqIds);
        return { session: null, error: 'Database mismatch' };
    }

    /**
     * Get active session (if user left mid-way)
     */
    static async getActiveSession(
        studentId: string,
        context: { topicId?: number | null, subtopicId?: number | null, universityId?: number | null }
    ): Promise<{ session: PracticeSession | null, mcqs: MCQ[], attempts: MCQAttempt[] }> {
        if (IS_MONGO) return MongoPracticeService.getActiveSession(studentId, context);
        return { session: null, mcqs: [], attempts: [] };
    }

    /**
     * Submit MCQ attempt
     */
    static async submitAttempt(
        sessionId: number,
        mcqId: number,
        studentId: string,
        selectedOption: 'A' | 'B' | 'C' | 'D' | 'SKIPPED',
        timeSpentSeconds: number
    ): Promise<{ isCorrect: boolean; correctOption: string }> {
        if (IS_MONGO) return MongoPracticeService.submitAttempt(sessionId, mcqId, studentId, selectedOption, timeSpentSeconds);
        return { isCorrect: false, correctOption: 'A' };
    }

    /**
     * Complete practice session
     */
    static async completeSession(
        sessionId: number,
        studentId: string,
        totalQuestions: number,
        correctAnswers: number,
        wrongAnswers: number,
        skippedQuestions: number,
        totalTimeSeconds: number
    ): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) {
            return MongoPracticeService.completeSession(sessionId, studentId, totalQuestions, correctAnswers, wrongAnswers, skippedQuestions, totalTimeSeconds, []);
        }
        return { success: false, error: 'Database mismatch' };
    }

    /**
     * Get student's practice history
     */
    static async getStudentPracticeHistory(
        studentId: string,
        limit: number = 10
    ): Promise<PracticeSession[]> {
        if (IS_MONGO) return MongoPracticeService.getStudentPracticeHistory(studentId, limit);
        return [];
    }

    /**
     * Get learning streak
     */
    static async getLearningStreak(studentId: string): Promise<number> {
        if (IS_MONGO) return MongoPracticeService.getLearningStreak(studentId);
        return 0;
    }

    /**
     * Detect weak subtopics
     */
    static async detectWeaknesses(studentId: string): Promise<any[]> {
        // To be implemented in Mongo if needed, or route via AnalyticsService
        return [];
    }
}
