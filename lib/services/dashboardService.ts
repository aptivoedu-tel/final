import { MongoDashboardService } from './mongoDashboardService';

export interface StudentStats {
    enrolledTopics: number;
    questionsSolved: number;
    currentStreak: number;
    overallAccuracy: number;
    totalStudyTime: number; // in seconds
}

export interface PerformanceData {
    subject: string;
    score: number;
    fullMark: number;
}

export interface ProgressData {
    name: string;
    score: number;
    subtopicId: number;
}

export interface ContinueLearningItem {
    title: string;
    progress: number;
    subtopicId: number;
    topicId: number;
    color: string;
}

export class DashboardService {
    /**
     * Get student's main statistics
     */
    static async getStudentStats(studentId: string): Promise<{ stats: StudentStats; error?: string }> {
        return MongoDashboardService.getStudentStats(studentId);
    }

    /**
     * Get performance data by subject (for radar chart)
     */
    static async getPerformanceBySubject(studentId: string): Promise<{ data: PerformanceData[]; error?: string }> {
        return MongoDashboardService.getPerformanceBySubject(studentId);
    }

    /**
     * Get progress by subtopic (for progress bars)
     */
    static async getProgressBySubtopic(studentId: string, limit: number = 5): Promise<{ data: ProgressData[]; error?: string }> {
        return MongoDashboardService.getProgressBySubtopic(studentId, limit);
    }

    /**
     * Get continue learning items (recently accessed subtopics)
     */
    static async getContinueLearningItems(studentId: string, limit: number = 3): Promise<{ data: ContinueLearningItem[]; error?: string }> {
        return MongoDashboardService.getContinueLearningItems(studentId, limit);
    }

    /**
     * Get recommended subtopic based on weaknesses
     */
    static async getRecommendedSubtopic(studentId: string): Promise<{ subtopic: any; error?: string }> {
        // Fallback or move to Mongo
        return { subtopic: null };
    }

    /**
     * Get real-time rank for the student
     */
    static async getStudentRank(studentId: string) {
        return MongoDashboardService.getStudentRank(studentId);
    }

    /**
     * Get study activity data over time
     */
    static async getStudyActivity(studentId: string, timeframe: 'week' | 'month'): Promise<{ data: any[]; error?: string }> {
        return MongoDashboardService.getStudyActivity(studentId, timeframe);
    }

    /**
     * Get dynamic milestones for the student
     */
    static async getRecentMilestones(studentId: string): Promise<any[]> {
        return MongoDashboardService.getRecentMilestones(studentId);
    }
}
