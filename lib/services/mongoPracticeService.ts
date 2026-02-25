export class MongoPracticeService {
    /**
     * Fetch MCQs from MongoDB via our new proxy API
     */
    static async generatePracticeSession(
        subtopicId: number | null,
        universityId: number | null,
        subjectId: number,
        studentId?: string,
        topicId?: number | null
    ): Promise<any[]> {
        try {
            const params = new URLSearchParams();
            if (subtopicId) params.append('subtopic_id', subtopicId.toString());
            if (topicId) params.append('topic_id', topicId.toString());
            params.append('limit', '20');
            params.append('shuffle', 'true');

            const response = await fetch(`/api/mongo/mcqs?${params.toString()}`);
            const data = await response.json();

            return data.mcqs || [];
        } catch (error) {
            console.error('Mongo generatePracticeSession error:', error);
            return [];
        }
    }

    /**
     * Get practice rules for a university and subject
     */
    static async getPracticeRules(universityId: number, subjectId: number): Promise<any> {
        try {
            const res = await fetch(`/api/mongo/admin/universities/rules?university_id=${universityId}&subject_id=${subjectId}`);
            if (!res.ok) throw new Error('Failed to fetch rules');
            const data = await res.json();
            return data.rules || {
                mcq_count_per_session: 10,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        } catch (error) {
            return {
                mcq_count_per_session: 10,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        }
    }

    /**
     * Create a new practice session in MongoDB
     */
    static async createSession(
        studentId: string,
        subtopicId: number | null,
        universityId: number | null,
        sessionType: string = 'practice',
        topicId: number | null = null
    ): Promise<{ session: any | null; error: string | null }> {
        try {
            const response = await fetch('/api/mongo/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    subtopic_id: subtopicId,
                    topic_id: topicId,
                    university_id: universityId,
                    session_type: sessionType
                }),
            });

            const data = await response.json();
            if (!response.ok) return { session: null, error: data.error };

            return { session: data.session, error: null };
        } catch (error: any) {
            return { session: null, error: error.message };
        }
    }

    /**
     * Submit MCQ attempt to MongoDB
     */
    static async submitAttempt(
        sessionId: number,
        mcqId: number,
        studentId: string,
        selectedOption: 'A' | 'B' | 'C' | 'D' | 'SKIPPED',
        timeSpentSeconds: number
    ): Promise<{ isCorrect: boolean; correctOption: string }> {
        try {
            const response = await fetch('/api/mongo/practice/attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    practice_session_id: sessionId,
                    mcq_id: mcqId,
                    student_id: studentId,
                    selected_option: selectedOption,
                    time_spent_seconds: timeSpentSeconds
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            return {
                isCorrect: data.isCorrect,
                correctOption: data.correctOption || 'A'
            };
        } catch (error: any) {
            console.error('Mongo submitAttempt error:', error);
            return { isCorrect: false, correctOption: 'A' };
        }
    }

    /**
     * Complete session and save attempts in MongoDB
     */
    static async completeSession(
        sessionId: number,
        studentId: string,
        totalQuestions: number,
        correctAnswers: number,
        wrongAnswers: number,
        skippedQuestions: number,
        totalTimeSeconds: number,
        attempts: any[] = []
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/practice', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    attempts,
                    time_spent_seconds: totalTimeSeconds,
                    total_questions: totalQuestions,
                    correct_answers: correctAnswers,
                    wrong_answers: wrongAnswers,
                    skipped_questions: skippedQuestions
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get learning streak from MongoDB analytics API
     */
    static async getLearningStreak(studentId: string): Promise<number> {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}`);
            const data = await response.json();
            return data.analytics?.current_streak || 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get student practice history
     */
    static async getStudentPracticeHistory(studentId: string, limit: number = 10): Promise<any[]> {
        try {
            const response = await fetch(`/api/mongo/practice?student_id=${studentId}&limit=${limit}`);
            const data = await response.json();
            return data.sessions || [];
        } catch (e) {
            return [];
        }
    }
}
