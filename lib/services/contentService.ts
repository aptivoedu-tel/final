import { MongoContentService } from './mongoContentService';

export interface Subject {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    is_active: boolean;
    display_order: number;
}

export interface Topic {
    id: number;
    subject_id: number;
    name: string;
    description: string | null;
    sequence_order: number;
    estimated_hours: number | null;
    prerequisites: string[] | null;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
    is_active: boolean;
}

export interface Subtopic {
    id: number;
    topic_id: number;
    name: string;
    content_markdown: string | null;
    video_url: string | null;
    estimated_minutes: number | null;
    sequence_order: number;
    is_active: boolean;
}

export class ContentService {
    // ==================== SUBJECTS ====================

    static async getAllSubjects(): Promise<Subject[]> {
        return MongoContentService.getAllSubjects();
    }

    static async getSubjectById(id: number): Promise<Subject | null> {
        return MongoContentService.getSubjectById(id);
    }

    static async createSubject(subject: Omit<Subject, 'id'>): Promise<{ success: boolean; data?: Subject; error?: string }> {
        return MongoContentService.createSubject(subject);
    }

    static async updateSubject(id: number, updates: Partial<Subject>): Promise<{ success: boolean; error?: string }> {
        return MongoContentService.updateSubject(id, updates);
    }

    static async deleteSubject(id: number): Promise<{ success: boolean; error?: string }> {
        return MongoContentService.deleteSubject(id);
    }

    // ==================== TOPICS ====================

    static async getTopicsBySubject(subjectId: number): Promise<Topic[]> {
        return MongoContentService.getTopicsBySubject(subjectId);
    }

    static async getTopicById(id: number): Promise<Topic | null> {
        return MongoContentService.getTopicById(id);
    }

    static async createTopic(topic: Omit<Topic, 'id'>): Promise<{ success: boolean; data?: Topic; error?: string }> {
        return MongoContentService.createTopic(topic);
    }

    static async updateTopic(id: number, updates: Partial<Topic>): Promise<{ success: boolean; error?: string }> {
        return MongoContentService.updateTopic(id, updates);
    }

    static async deleteTopic(id: number): Promise<{ success: boolean; error?: string }> {
        return MongoContentService.deleteTopic(id);
    }

    // ==================== SUBTOPICS ====================

    static async getSubtopicsByTopic(topicId: number): Promise<Subtopic[]> {
        return MongoContentService.getSubtopicsByTopic(topicId);
    }

    static async getSubtopicById(id: number): Promise<Subtopic | null> {
        return MongoContentService.getSubtopicById(id);
    }

    static async createSubtopic(subtopic: Omit<Subtopic, 'id'>): Promise<{ success: boolean; data?: Subtopic; error?: string }> {
        return MongoContentService.createSubtopic(subtopic);
    }

    static async updateSubtopic(id: number, updates: Partial<Subtopic>): Promise<{ success: boolean; error?: string }> {
        return MongoContentService.updateSubtopic(id, updates);
    }

    static async deleteSubtopic(id: number): Promise<{ success: boolean; error?: string }> {
        return MongoContentService.deleteSubtopic(id);
    }

    // ==================== CONTENT WITH HIERARCHY ====================

    static async getCompleteHierarchy(): Promise<any[]> {
        return MongoContentService.getCompleteHierarchy();
    }

    static async searchContent(query: string): Promise<any[]> {
        return MongoContentService.searchContent(query);
    }
}
