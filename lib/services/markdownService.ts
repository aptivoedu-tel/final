import { supabase } from '../supabase/client';

export interface MarkdownUploadResult {
    success: boolean;
    subtopicId?: number;
    error?: string;
}

export class MarkdownService {
    /**
     * Validate markdown file
     */
    static validateFile(file: File): { valid: boolean; error?: string } {
        const validExtensions = ['.md', '.mdx', '.markdown'];
        const hasValidExtension = validExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
            return {
                valid: false,
                error: 'Please upload a valid Markdown file (.md, .mdx, or .markdown)'
            };
        }

        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: 'File size must be less than 5MB' };
        }

        return { valid: true };
    }

    /**
     * Read markdown file content
     */
    static async readMarkdownFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target?.result as string;
                resolve(content);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Extract image URLs from markdown content
     */
    static extractImageUrls(markdown: string): string[] {
        const imageRegex = /!\[.*?\]\((.*?)\)/g;
        const urls: string[] = [];
        let match;

        while ((match = imageRegex.exec(markdown)) !== null) {
            urls.push(match[1]);
        }

        return urls;
    }

    /**
     * Process markdown content (can add custom processing here)
     */
    static processMarkdown(content: string): {
        processedContent: string;
        metadata: {
            headingCount: number;
            wordCount: number;
            imageCount: number;
            estimatedReadingMinutes: number;
        };
    } {
        const headings = content.match(/^#+\s/gm);
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const images = this.extractImageUrls(content);

        // Estimate reading time (average 200 words per minute)
        const estimatedMinutes = Math.ceil(words.length / 200);

        return {
            processedContent: content,
            metadata: {
                headingCount: headings?.length || 0,
                wordCount: words.length,
                imageCount: images.length,
                estimatedReadingMinutes: estimatedMinutes
            }
        };
    }

    /**
     * Upload markdown content to a subtopic
     */
    static async uploadMarkdown(
        topicId: number,
        subtopicName: string,
        markdownContent: string,
        sequenceOrder: number = 0
    ): Promise<MarkdownUploadResult> {
        try {
            const { processedContent, metadata } = this.processMarkdown(markdownContent);

            const { data, error } = await supabase
                .from('subtopics')
                .insert([
                    {
                        topic_id: topicId,
                        name: subtopicName,
                        content_markdown: processedContent,
                        estimated_minutes: metadata.estimatedReadingMinutes,
                        sequence_order: sequenceOrder,
                        is_active: true
                    }
                ])
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, subtopicId: data.id };
        } catch (error) {
            console.error('Error uploading markdown:', error);
            return { success: false, error: 'Failed to upload markdown content' };
        }
    }

    /**
     * Update existing subtopic with markdown content
     */
    static async updateMarkdown(
        subtopicId: number,
        markdownContent: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { processedContent, metadata } = this.processMarkdown(markdownContent);

            const { error } = await supabase
                .from('subtopics')
                .update({
                    content_markdown: processedContent,
                    estimated_minutes: metadata.estimatedReadingMinutes
                })
                .eq('id', subtopicId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating markdown:', error);
            return { success: false, error: 'Failed to update markdown content' };
        }
    }

    /**
     * Validate markdown syntax and links
     */
    static validateMarkdown(content: string): {
        valid: boolean;
        warnings: string[];
    } {
        const warnings: string[] = [];

        // Check for broken image links (relative paths)
        const imageUrls = this.extractImageUrls(content);
        imageUrls.forEach(url => {
            if (!url.startsWith('http') && !url.startsWith('/')) {
                warnings.push(`Relative image path found: ${url}. Consider using absolute URLs.`);
            }
        });

        // Check for broken hyperlinks
        const linkRegex = /\[.*?\]\((.*?)\)/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
            const url = match[1];
            if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#')) {
                warnings.push(`Relative link found: ${url}. Consider using absolute URLs.`);
            }
        }

        // Check for empty headings
        const emptyHeadings = content.match(/^#+\s*$/gm);
        if (emptyHeadings && emptyHeadings.length > 0) {
            warnings.push(`Found ${emptyHeadings.length} empty heading(s)`);
        }

        return {
            valid: warnings.length === 0,
            warnings
        };
    }

    /**
     * Generate table of contents from markdown
     */
    static generateTableOfContents(markdown: string): {
        title: string;
        level: number;
        slug: string;
    }[] {
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const toc: { title: string; level: number; slug: string }[] = [];
        let match;

        while ((match = headingRegex.exec(markdown)) !== null) {
            const level = match[1].length;
            const title = match[2].trim();
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            toc.push({ title, level, slug });
        }

        return toc;
    }
}
