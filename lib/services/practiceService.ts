import { supabase } from '../supabase/client';
import { shuffleArray, shuffleGrouped } from '../utils';

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
        const { data, error } = await supabase
            .from('university_practice_rules')
            .select('*')
            .eq('university_id', universityId)
            .eq('subject_id', subjectId)
            .single();

        if (error || !data) {
            // Return default rules
            return {
                mcq_count_per_session: 10,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        }

        return {
            mcq_count_per_session: data.mcq_count_per_session,
            easy_percentage: data.easy_percentage,
            medium_percentage: data.medium_percentage,
            hard_percentage: data.hard_percentage,
            time_limit_minutes: data.time_limit_minutes
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
        // 1. Get student profile for institution_id
        let institutionId: number | null = null;
        if (studentId) {
            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', studentId)
                .single();
            institutionId = profile?.institution_id || null;
        }

        // 2. Try to get granular session limit for this mapping
        let sessionLimit = 20; // Increased default to handle typical topic sizes
        if (universityId && institutionId) {
            let mappingQuery = supabase
                .from('university_content_access')
                .select('session_limit')
                .eq('university_id', universityId)
                .eq('institution_id', institutionId)
                .eq('is_active', true);

            if (subtopicId) {
                mappingQuery = mappingQuery.eq('subtopic_id', subtopicId);
            } else if (topicId) {
                mappingQuery = mappingQuery.eq('topic_id', topicId).is('subtopic_id', null);
            }

            const { data: mapping } = await mappingQuery.maybeSingle();

            if (mapping?.session_limit) {
                sessionLimit = mapping.session_limit;
            }
        }

        // 3. Fetch ALL Candidate Questions (ignoring strict difficulty quotas to avoid fragmentation)
        let query = supabase.from('mcqs').select('*').eq('is_active', true);

        if (subtopicId) {
            query = query.eq('subtopic_id', subtopicId);
        } else if (topicId) {
            // Robust query for Topic (including subtopics)
            const { data: subtopics } = await supabase.from('subtopics').select('id').eq('topic_id', topicId);
            const subtopicIds = subtopics?.map(st => st.id) || [];

            if (subtopicIds.length > 0) {
                query = query.or(`topic_id.eq.${topicId},subtopic_id.in.(${subtopicIds.join(',')})`);
            } else {
                query = query.eq('topic_id', topicId);
            }
        }

        const { data: allQuestions } = await query;
        let candidates = allQuestions || [];

        // 4. Filter out correctly answered questions (if studentId provided)
        if (studentId && candidates.length > 0) {
            const { data: attempts } = await supabase
                .from('mcq_attempts')
                .select('mcq_id')
                .eq('student_id', studentId)
                .eq('is_correct', true);

            const correctIds = new Set(attempts?.map(a => a.mcq_id));
            // User requested not to show practiced questions again
            candidates = candidates.filter(q => !correctIds.has(q.id));
        }

        // 5. Fallback: Review Mode (if all completed)
        if (candidates.length === 0 && (allQuestions?.length || 0) > 0) {
            // If all questions answered correctly, user might want to review them
            // Or if pool was empty to begin with, this stays empty
            candidates = allQuestions || [];
        }

        // 6. Shuffle and Limit
        // Preservation of passage groups is handled by shuffleGrouped
        const shuffled = shuffleGrouped(candidates, q => q.passage_id);

        return shuffled.slice(0, sessionLimit);
    }

    /**
     * Get MCQs by difficulty level
     */
    private static async getMCQsByDifficulty(
        subtopicId: number | null,
        difficulty: 'easy' | 'medium' | 'hard',
        count: number,
        studentId?: string,
        topicId?: number | null
    ): Promise<MCQ[]> {
        let query = supabase
            .from('mcqs')
            .select('*')
            .eq('difficulty', difficulty)
            .eq('is_active', true);

        if (subtopicId) {
            query = query.eq('subtopic_id', subtopicId);
        } else if (topicId) {
            // Get all subtopics under this topic to include their questions
            const { data: subtopics } = await supabase
                .from('subtopics')
                .select('id')
                .eq('topic_id', topicId);

            const subtopicIds = subtopics?.map(st => st.id) || [];

            if (subtopicIds.length > 0) {
                // Query questions in this topic OR in any of its subtopics
                query = query.or(`topic_id.eq.${topicId},subtopic_id.in.(${subtopicIds.join(',')})`);
            } else {
                query = query.eq('topic_id', topicId);
            }
        }

        if (studentId) {
            // Get correctly answered question IDs
            const { data: pastCorrect } = await supabase
                .from('mcq_attempts')
                .select('mcq_id')
                .eq('student_id', studentId)
                .eq('is_correct', true);

            if (pastCorrect && pastCorrect.length > 0) {
                const excludedIds = pastCorrect.map(p => p.mcq_id);
                query = query.not('id', 'in', `(${excludedIds.join(',')})`);
            }
        }

        const { data, error } = await query; // Remove limit(count) to allow for randomization

        if (error) {
            console.error(`Error fetching ${difficulty} MCQs:`, error);
            return [];
        }

        return shuffleArray(data).slice(0, count);
    }

    /**
     * Create a new practice session
     */
    static async createSession(
        studentId: string,
        subtopicId: number | null,
        universityId: number | null,
        sessionType: string = 'practice',
        topicId: number | null = null
    ): Promise<{ session: PracticeSession | null; error: string | null }> {
        const { data, error } = await supabase
            .from('practice_sessions')
            .insert([
                {
                    student_id: studentId,
                    subtopic_id: subtopicId,
                    topic_id: topicId,
                    university_id: universityId,
                    session_type: sessionType,
                    started_at: new Date().toISOString(),
                    is_completed: false,
                    total_questions: 0,
                    correct_answers: 0,
                    wrong_answers: 0,
                    skipped_questions: 0,
                    time_spent_seconds: 0
                }
            ])
            .select()
            .single();

        if (error) {
            return { session: null, error: error.message };
        }

        return { session: data, error: null };
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
        // Get the MCQ to check the correct answer
        const { data: mcq } = await supabase
            .from('mcqs')
            .select('correct_option')
            .eq('id', mcqId)
            .single();

        const isCorrect = selectedOption !== 'SKIPPED' && selectedOption === mcq?.correct_option;

        // Save the attempt
        await supabase
            .from('mcq_attempts')
            .insert([
                {
                    practice_session_id: sessionId,
                    mcq_id: mcqId,
                    student_id: studentId,
                    selected_option: selectedOption,
                    is_correct: isCorrect,
                    time_spent_seconds: timeSpentSeconds
                }
            ]);

        // Update MCQ statistics
        await supabase.rpc('increment', {
            table_name: 'mcqs',
            row_id: mcqId,
            column_name: 'times_attempted'
        });

        if (isCorrect) {
            await supabase.rpc('increment', {
                table_name: 'mcqs',
                row_id: mcqId,
                column_name: 'times_correct'
            });
        }

        return {
            isCorrect,
            correctOption: mcq?.correct_option || 'A'
        };
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
        const scorePercentage = totalQuestions > 0
            ? (correctAnswers / totalQuestions) * 100
            : 0;

        const { error } = await supabase
            .from('practice_sessions')
            .update({
                is_completed: true,
                completed_at: new Date().toISOString(),
                total_questions: totalQuestions,
                correct_answers: correctAnswers,
                wrong_answers: wrongAnswers,
                skipped_questions: skippedQuestions,
                score_percentage: scorePercentage,
                time_spent_seconds: totalTimeSeconds
            })
            .eq('id', sessionId);

        if (error) {
            return { success: false, error: error.message };
        }

        // Update subtopic progress if it's a subtopic practice
        if (studentId) {
            const { data: sessionData } = await supabase
                .from('practice_sessions')
                .select('subtopic_id, topic_id')
                .eq('id', sessionId)
                .single();

            if (sessionData?.subtopic_id) {
                await supabase
                    .from('subtopic_progress')
                    .upsert({
                        student_id: studentId,
                        subtopic_id: sessionData.subtopic_id,
                        is_completed: true,
                        reading_percentage: 100,
                        last_accessed_at: new Date().toISOString()
                    }, { onConflict: 'student_id,subtopic_id' });
            } else if (sessionData?.topic_id) {
                await supabase
                    .from('topic_progress')
                    .upsert({
                        student_id: studentId,
                        topic_id: sessionData.topic_id,
                        is_completed: true,
                        reading_percentage: 100, // Mark reading as done too if they finished practice
                        last_accessed_at: new Date().toISOString()
                    }, { onConflict: 'student_id,topic_id' });
            }
        }

        // Update streak
        await this.updateStreak(studentId);

        return { success: true };
    }

    /**
     * Update learning streak (record current date)
     */
    static async updateStreak(studentId: string): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            await supabase
                .from('learning_streaks')
                .upsert({
                    student_id: studentId,
                    streak_date: today
                }, { onConflict: 'student_id,streak_date' });
        } catch (e) {
            console.error('Error updating streak:', e);
        }
    }

    /**
     * Get student's practice history
     */
    static async getStudentPracticeHistory(
        studentId: string,
        limit: number = 10
    ): Promise<PracticeSession[]> {
        const { data, error } = await supabase
            .from('practice_sessions')
            .select('*')
            .eq('student_id', studentId)
            .eq('is_completed', true)
            .order('completed_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching practice history:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get student's performance analytics
     */
    static async getStudentAnalytics(studentId: string): Promise<{
        totalSessions: number;
        averageScore: number;
        totalTimeSpent: number;
        totalQuestionsAttempted: number;
        accuracyTrend: number[];
    }> {
        const sessions = await this.getStudentPracticeHistory(studentId, 100);

        const totalSessions = sessions.length;
        const averageScore = sessions.length > 0
            ? sessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / sessions.length
            : 0;
        const totalTimeSpent = sessions.reduce((sum, s) => sum + s.time_spent_seconds, 0);
        const totalQuestionsAttempted = sessions.reduce((sum, s) => sum + s.total_questions, 0);

        // Get last 7 sessions for trend
        const recentSessions = sessions.slice(0, 7).reverse();
        const accuracyTrend = recentSessions.map(s => s.score_percentage || 0);

        return {
            totalSessions,
            averageScore,
            totalTimeSpent,
            totalQuestionsAttempted,
            accuracyTrend
        };
    }

    /**
     * Detect weak subtopics
     */
    static async detectWeaknesses(studentId: string): Promise<any[]> {
        const { data, error } = await supabase
            .rpc('detect_student_weaknesses', { student_uuid: studentId });

        if (error) {
            console.error('Error detecting weaknesses:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get learning streak
     */
    static async getLearningStreak(studentId: string): Promise<number> {
        const { data, error } = await supabase
            .from('learning_streaks')
            .select('streak_date')
            .eq('student_id', studentId)
            .order('streak_date', { ascending: false })
            .limit(30);

        if (error || !data || data.length === 0) {
            return 0;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const mostRecentDate = new Date(data[0].streak_date);
        mostRecentDate.setHours(0, 0, 0, 0);

        if (mostRecentDate.getTime() < yesterday.getTime()) {
            return 0;
        }

        let streak = 0;
        for (let i = 0; i < data.length; i++) {
            const streakDate = new Date(data[i].streak_date);
            streakDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(mostRecentDate);
            expectedDate.setDate(mostRecentDate.getDate() - i);
            expectedDate.setHours(0, 0, 0, 0);

            if (streakDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }
}
