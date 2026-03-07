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
            // First get rules to find the session limit
            const rules = await this.getPracticeRules(universityId || 0, subjectId);
            const limit = rules?.mcq_count_per_session || 20;

            const params = new URLSearchParams();
            if (subtopicId) params.append('subtopic_id', subtopicId.toString());
            if (topicId) params.append('topic_id', topicId.toString());
            params.append('limit', limit.toString());
            params.append('shuffle', 'true');
            params.append('t', Date.now().toString());

            const response = await fetch(`/api/mongo/mcqs?${params.toString()}`, {
                cache: 'no-store'
            });
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
            // First check for university specific rules
            const res = await fetch(`/api/mongo/admin/universities/rules?university_id=${universityId}&subject_id=${subjectId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.rules) return data.rules;
            }

            // Fallback to global setting from system settings
            const settingsRes = await fetch('/api/mongo/admin/settings?t=' + Date.now(), {
                cache: 'no-store'
            });
            let globalLimit = 20;
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                globalLimit = settingsData.settings?.practice_mcqs_limit ?? 20;
            }

            return {
                mcq_count_per_session: globalLimit,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        } catch (error) {
            return {
                mcq_count_per_session: 20,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        }
    }

    static async createSession(
        studentId: string,
        subtopicId: number | null,
        universityId: number | null,
        sessionType: string = 'practice',
        topicId: number | null = null,
        mcqIds: number[] = []
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
                    session_type: sessionType,
                    mcq_ids: mcqIds
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
     * Get active session (if user left mid-way)
     */
    static async getActiveSession(
        studentId: string,
        context: { topicId?: number | null, subtopicId?: number | null, universityId?: number | null }
    ): Promise<{ session: any | null, mcqs: any[], attempts: any[] }> {
        try {
            const params = new URLSearchParams();
            params.append('student_id', studentId);
            if (context.topicId) params.append('topic_id', context.topicId.toString());
            if (context.subtopicId) params.append('subtopic_id', context.subtopicId.toString());
            if (context.universityId) params.append('university_id', context.universityId.toString());

            const response = await fetch(`/api/mongo/practice/active?${params.toString()}`);
            if (!response.ok) return { session: null, mcqs: [], attempts: [] };

            const data = await response.json();
            return { session: data.session, mcqs: data.mcqs || [], attempts: data.attempts || [] };
        } catch (error) {
            return { session: null, mcqs: [], attempts: [] };
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
