export class MongoContentService {
    static async getAllSubjects(): Promise<any[]> {
        try {
            const response = await fetch('/api/mongo/content?type=subjects');
            const data = await response.json();
            return data.subjects || [];
        } catch (e) {
            return [];
        }
    }

    static async getSubjectById(id: number): Promise<any | null> {
        try {
            const response = await fetch(`/api/mongo/content?type=subjects&id=${id}`);
            const data = await response.json();
            return data.subjects?.[0] || null;
        } catch (e) {
            return null;
        }
    }

    static async createSubject(subject: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const response = await fetch('/api/mongo/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...subject, type: 'subject' })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            return { success: true, data: data.item };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async updateSubject(id: number, updates: any): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type: 'subject', ...updates })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async deleteSubject(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/content?id=${id}&type=subject`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async getTopicById(id: number): Promise<any | null> {
        try {
            const response = await fetch(`/api/mongo/content?type=topics&id=${id}`);
            const data = await response.json();
            return data.topics?.[0] || null;
        } catch (e) {
            return null;
        }
    }

    static async createTopic(topic: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const response = await fetch('/api/mongo/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...topic, type: 'topic' })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            return { success: true, data: data.item };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async updateTopic(id: number, updates: any): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type: 'topic', ...updates })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async deleteTopic(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/content?id=${id}&type=topic`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async getSubtopicById(id: number): Promise<any | null> {
        try {
            const response = await fetch(`/api/mongo/content?type=subtopics&id=${id}`);
            const data = await response.json();
            return data.subtopics?.[0] || null;
        } catch (e) {
            return null;
        }
    }

    static async createSubtopic(subtopic: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const response = await fetch('/api/mongo/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...subtopic, type: 'subtopic' })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            return { success: true, data: data.item };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async updateSubtopic(id: number, updates: any): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type: 'subtopic', ...updates })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async deleteSubtopic(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/content?id=${id}&type=subtopic`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static async getTopicsBySubject(subjectId: number): Promise<any[]> {
        try {
            const response = await fetch(`/api/mongo/content?type=topics&subject_id=${subjectId}`);
            const data = await response.json();
            return data.topics || [];
        } catch (e) {
            return [];
        }
    }

    static async getSubtopicsByTopic(topicId: number): Promise<any[]> {
        try {
            const response = await fetch(`/api/mongo/content?type=subtopics&topic_id=${topicId}`);
            const data = await response.json();
            return data.subtopics || [];
        } catch (e) {
            return [];
        }
    }

    static async getCompleteHierarchy(): Promise<any[]> {
        try {
            const response = await fetch('/api/mongo/content');
            const data = await response.json();
            // Combine into hierarchy
            const { subjects, topics, subtopics } = data;

            return (subjects || []).map((s: any) => ({
                ...s,
                topics: (topics || [])
                    .filter((t: any) => t.subject_id === s.id)
                    .map((t: any) => ({
                        ...t,
                        subtopics: (subtopics || []).filter((st: any) => st.topic_id === t.id)
                    }))
            }));
        } catch (e) {
            return [];
        }
    }

    static async searchContent(query: string): Promise<any[]> {
        try {
            const response = await fetch(`/api/mongo/content?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            return data.subtopics || [];
        } catch (e) {
            return [];
        }
    }
}
