import { supabase } from '../supabase/client';
import { MongoContentService } from './mongoContentService';

const IS_MONGO = process.env.NEXT_PUBLIC_DATABASE_TYPE === 'MONGODB';

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
        if (IS_MONGO) return MongoContentService.getAllSubjects();
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching subjects:', error);
            return [];
        }

        return data || [];
    }

    static async getSubjectById(id: number): Promise<Subject | null> {
        if (IS_MONGO) return MongoContentService.getSubjectById(id);
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching subject:', error);
            return null;
        }

        return data;
    }

    static async createSubject(subject: Omit<Subject, 'id'>): Promise<{ success: boolean; data?: Subject; error?: string }> {
        if (IS_MONGO) return MongoContentService.createSubject(subject);
        const { data, error } = await supabase
            .from('subjects')
            .insert([subject])
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    }

    static async updateSubject(id: number, updates: Partial<Subject>): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) return MongoContentService.updateSubject(id, updates);
        const { error } = await supabase
            .from('subjects')
            .update(updates)
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    static async deleteSubject(id: number): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) return MongoContentService.deleteSubject(id);
        const { error } = await supabase
            .from('subjects')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    // ==================== TOPICS ====================

    static async getTopicsBySubject(subjectId: number): Promise<Topic[]> {
        if (IS_MONGO) return MongoContentService.getTopicsBySubject(subjectId);
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', subjectId)
            .eq('is_active', true)
            .order('sequence_order', { ascending: true });

        if (error) {
            console.error('Error fetching topics:', error);
            return [];
        }

        return data || [];
    }

    static async getTopicById(id: number): Promise<Topic | null> {
        if (IS_MONGO) return MongoContentService.getTopicById(id);
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching topic:', error);
            return null;
        }

        return data;
    }

    static async createTopic(topic: Omit<Topic, 'id'>): Promise<{ success: boolean; data?: Topic; error?: string }> {
        if (IS_MONGO) return MongoContentService.createTopic(topic);
        const { data, error } = await supabase
            .from('topics')
            .insert([topic])
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    }

    static async updateTopic(id: number, updates: Partial<Topic>): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) return MongoContentService.updateTopic(id, updates);
        const { error } = await supabase
            .from('topics')
            .update(updates)
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    static async deleteTopic(id: number): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) return MongoContentService.deleteTopic(id);
        const { error } = await supabase
            .from('topics')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    // ==================== SUBTOPICS ====================

    static async getSubtopicsByTopic(topicId: number): Promise<Subtopic[]> {
        if (IS_MONGO) return MongoContentService.getSubtopicsByTopic(topicId);
        const { data, error } = await supabase
            .from('subtopics')
            .select('*')
            .eq('topic_id', topicId)
            .eq('is_active', true)
            .order('sequence_order', { ascending: true });

        if (error) {
            console.error('Error fetching subtopics:', error);
            return [];
        }

        return data || [];
    }

    static async getSubtopicById(id: number): Promise<Subtopic | null> {
        if (IS_MONGO) return MongoContentService.getSubtopicById(id);
        const { data, error } = await supabase
            .from('subtopics')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching subtopic:', error);
            return null;
        }

        return data;
    }

    static async createSubtopic(subtopic: Omit<Subtopic, 'id'>): Promise<{ success: boolean; data?: Subtopic; error?: string }> {
        if (IS_MONGO) return MongoContentService.createSubtopic(subtopic);
        const { data, error } = await supabase
            .from('subtopics')
            .insert([subtopic])
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    }

    static async updateSubtopic(id: number, updates: Partial<Subtopic>): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) return MongoContentService.updateSubtopic(id, updates);
        const { error } = await supabase
            .from('subtopics')
            .update(updates)
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    static async deleteSubtopic(id: number): Promise<{ success: boolean; error?: string }> {
        if (IS_MONGO) return MongoContentService.deleteSubtopic(id);
        const { error } = await supabase
            .from('subtopics')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    // ==================== CONTENT WITH HIERARCHY ====================

    static async getCompleteHierarchy(): Promise<any[]> {
        if (IS_MONGO) return MongoContentService.getCompleteHierarchy();
        const subjects = await this.getAllSubjects();

        const hierarchy = await Promise.all(
            subjects.map(async (subject) => {
                const topics = await this.getTopicsBySubject(subject.id);

                const topicsWithSubtopics = await Promise.all(
                    topics.map(async (topic) => {
                        const subtopics = await this.getSubtopicsByTopic(topic.id);
                        return { ...topic, subtopics };
                    })
                );

                return { ...subject, topics: topicsWithSubtopics };
            })
        );

        return hierarchy;
    }

    static async searchContent(query: string): Promise<any[]> {
        if (IS_MONGO) return MongoContentService.searchContent(query);
        const { data, error } = await supabase
            .from('subtopics')
            .select(`
        *,
        topic:topics(
          *,
          subject:subjects(*)
        )
      `)
            .or(`name.ilike.%${query}%,content_markdown.ilike.%${query}%`)
            .eq('is_active', true)
            .limit(20);

        if (error) {
            console.error('Error searching content:', error);
            return [];
        }

        return data || [];
    }
}
