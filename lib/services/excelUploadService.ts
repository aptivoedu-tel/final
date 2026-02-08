import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';

export interface MCQRow {
    subject?: string;
    topic?: string;
    subtopic?: string;
    question: string;
    image_url?: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
    explanation_url?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ValidationError {
    row: number;
    field: string;
    message: string;
}

export interface UploadResult {
    success: boolean;
    totalRows: number;
    processedRows: number;
    failedRows: number;
    errors: ValidationError[];
    uploadId?: number;
}

export interface AutoAssignResult {
    success: boolean;
    subjectId?: number;
    topicId?: number;
    subtopicId?: number | null;
    message: string;
}

export class ExcelUploadService {
    private static readonly REQUIRED_COLUMNS = [
        'question',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'correct_option'
    ];

    /**
     * Validate Excel file structure
     */
    static validateFile(file: File): { valid: boolean; error?: string } {
        // Check file type
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xlsx',
            '.xls'
        ];

        const isValidType = validTypes.some(type =>
            file.type === type || file.name.endsWith(type)
        );

        if (!isValidType) {
            return { valid: false, error: 'Please upload a valid Excel file (.xlsx or .xls)' };
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: 'File size must be less than 10MB' };
        }

        return { valid: true };
    }

    /**
     * Parse Excel file and extract MCQ data
     */
    static async parseExcelFile(file: File): Promise<{ data: MCQRow[]; errors: ValidationError[] }> {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

                    const { validData, errors } = this.validateData(jsonData);
                    resolve({ data: validData, errors });
                } catch (error) {
                    resolve({
                        data: [],
                        errors: [{ row: 0, field: 'file', message: 'Failed to parse Excel file' }]
                    });
                }
            };

            reader.readAsBinaryString(file);
        });
    }

    /**
     * Validate parsed data
     */
    private static validateData(data: any[]): { validData: MCQRow[]; errors: ValidationError[] } {
        const validData: MCQRow[] = [];
        const errors: ValidationError[] = [];

        if (data.length === 0) {
            errors.push({ row: 0, field: 'file', message: 'Excel file is empty' });
            return { validData, errors };
        }

        // Check if required columns exist
        const firstRow = data[0];
        const missingColumns = this.REQUIRED_COLUMNS.filter(
            col => !(col in firstRow) && !(this.normalizeColumnName(col) in firstRow)
        );

        if (missingColumns.length > 0) {
            errors.push({
                row: 0,
                field: 'structure',
                message: `Missing required columns: ${missingColumns.join(', ')}`
            });
            return { validData, errors };
        }

        // Validate each row
        data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 because Excel rows start at 1 and we have headers
            const rowErrors: ValidationError[] = [];

            // Normalize column names
            const normalizedRow = this.normalizeRow(row);

            // Validate required fields
            if (!normalizedRow.question || normalizedRow.question.trim() === '') {
                rowErrors.push({ row: rowNumber, field: 'question', message: 'Question is required' });
            }

            if (!normalizedRow.option_a || normalizedRow.option_a.trim() === '') {
                rowErrors.push({ row: rowNumber, field: 'option_a', message: 'Option A is required' });
            }

            if (!normalizedRow.option_b || normalizedRow.option_b.trim() === '') {
                rowErrors.push({ row: rowNumber, field: 'option_b', message: 'Option B is required' });
            }

            if (!normalizedRow.option_c || normalizedRow.option_c.trim() === '') {
                rowErrors.push({ row: rowNumber, field: 'option_c', message: 'Option C is required' });
            }

            if (!normalizedRow.option_d || normalizedRow.option_d.trim() === '') {
                rowErrors.push({ row: rowNumber, field: 'option_d', message: 'Option D is required' });
            }

            // Robust correct_option extraction
            let rawOption = normalizedRow.correct_option?.toString().trim().toUpperCase() || '';

            // Extract the first letter A, B, C, or D
            let correctOption = '';
            const match = rawOption.match(/[A-D]/);
            if (match) {
                correctOption = match[0];
            }

            if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
                rowErrors.push({
                    row: rowNumber,
                    field: 'correct_option',
                    message: `Invalid correct option: "${rawOption}". Must be A, B, C, or D.`
                });
            }

            // Validate image URL if provided
            if (normalizedRow.image_url && !this.isValidUrl(normalizedRow.image_url)) {
                rowErrors.push({
                    row: rowNumber,
                    field: 'image_url',
                    message: 'Invalid image URL format'
                });
            }

            // Validate explanation URL if provided
            if (normalizedRow.explanation_url && !this.isValidUrl(normalizedRow.explanation_url)) {
                rowErrors.push({
                    row: rowNumber,
                    field: 'explanation_url',
                    message: 'Invalid explanation URL format'
                });
            }

            if (rowErrors.length === 0) {
                validData.push({
                    subject: normalizedRow.subject?.trim(),
                    topic: normalizedRow.topic?.trim(),
                    subtopic: normalizedRow.subtopic?.trim(),
                    question: normalizedRow.question.trim(),
                    image_url: normalizedRow.image_url?.trim(),
                    option_a: normalizedRow.option_a.trim(),
                    option_b: normalizedRow.option_b.trim(),
                    option_c: normalizedRow.option_c.trim(),
                    option_d: normalizedRow.option_d.trim(),
                    correct_option: correctOption as 'A' | 'B' | 'C' | 'D',
                    explanation: normalizedRow.explanation?.trim(),
                    explanation_url: normalizedRow.explanation_url?.trim(),
                    difficulty: this.validateDifficulty(normalizedRow.difficulty)
                });
            } else {
                errors.push(...rowErrors);
            }
        });

        return { validData, errors };
    }

    /**
     * Normalize column names (handle variations)
     */
    private static normalizeRow(row: any): any {
        const normalized: any = {};

        Object.keys(row).forEach(key => {
            const normalizedKey = this.normalizeColumnName(key);
            normalized[normalizedKey] = row[key];
        });

        return normalized;
    }

    private static normalizeColumnName(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '_').trim();
    }

    /**
     * Validate difficulty level
     */
    private static validateDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
        if (!difficulty) return 'medium';

        const normalized = difficulty.toString().toLowerCase();
        if (['easy', 'medium', 'hard'].includes(normalized)) {
            return normalized as 'easy' | 'medium' | 'hard';
        }

        return 'medium';
    }

    /**
     * Validate URL format
     */
    private static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Find or create subject by name
     */
    private static async findOrCreateSubject(subjectName: string): Promise<number | null> {
        try {
            const normalizedName = subjectName.trim();

            // First, try to find existing subject (case-insensitive)
            const { data: existing } = await supabase
                .from('subjects')
                .select('id')
                .ilike('name', normalizedName)
                .limit(1)
                .single();

            if (existing) {
                return existing.id;
            }

            // If not found, create new subject
            const { data: newSubject, error } = await supabase
                .from('subjects')
                .insert([{
                    name: normalizedName,
                    description: `Auto-created from bulk upload`,
                    is_active: true
                }])
                .select('id')
                .single();

            if (error || !newSubject) {
                console.error('Failed to create subject:', error);
                return null;
            }

            return newSubject.id;
        } catch (error) {
            console.error('Error in findOrCreateSubject:', error);
            return null;
        }
    }

    /**
     * Find or create topic by name under a subject
     */
    private static async findOrCreateTopic(topicName: string, subjectId: number): Promise<number | null> {
        try {
            const normalizedName = topicName.trim();

            // First, try to find existing topic (case-insensitive, under this subject)
            const { data: existing } = await supabase
                .from('topics')
                .select('id')
                .eq('subject_id', subjectId)
                .ilike('name', normalizedName)
                .limit(1)
                .single();

            if (existing) {
                return existing.id;
            }

            // If not found, create new topic
            const { data: newTopic, error } = await supabase
                .from('topics')
                .insert([{
                    name: normalizedName,
                    subject_id: subjectId,
                    description: `Auto-created from bulk upload`,
                    is_active: true
                }])
                .select('id')
                .single();

            if (error || !newTopic) {
                console.error('Failed to create topic:', error);
                return null;
            }

            return newTopic.id;
        } catch (error) {
            console.error('Error in findOrCreateTopic:', error);
            return null;
        }
    }

    /**
     * Find or create subtopic by name under a topic
     */
    private static async findOrCreateSubtopic(subtopicName: string | null | undefined, topicId: number): Promise<number | null> {
        try {
            // If no subtopic name provided, return null (will use topic directly)
            if (!subtopicName || subtopicName.trim() === '') {
                return null;
            }

            const normalizedName = subtopicName.trim();

            // First, try to find existing subtopic (case-insensitive, under this topic)
            const { data: existing } = await supabase
                .from('subtopics')
                .select('id')
                .eq('topic_id', topicId)
                .ilike('name', normalizedName)
                .limit(1)
                .single();

            if (existing) {
                return existing.id;
            }

            // If not found, create new subtopic
            const { data: newSubtopic, error } = await supabase
                .from('subtopics')
                .insert([{
                    name: normalizedName,
                    topic_id: topicId,
                    content_markdown: `Auto-created from bulk upload`,
                    is_active: true
                }])
                .select('id')
                .single();

            if (error || !newSubtopic) {
                console.error('Failed to create subtopic:', error);
                return null;
            }

            return newSubtopic.id;
        } catch (error) {
            console.error('Error in findOrCreateSubtopic:', error);
            return null;
        }
    }

    /**
     * Auto-assign question to subject/topic/subtopic based on MCQ data
     */
    static async autoAssignHierarchy(mcq: MCQRow): Promise<AutoAssignResult> {
        try {
            // Validate that we have at least subject and topic
            if (!mcq.subject || !mcq.topic) {
                return {
                    success: false,
                    message: 'Subject and Topic are required for auto-assignment'
                };
            }

            // Step 1: Find or create subject
            const subjectId = await this.findOrCreateSubject(mcq.subject);
            if (!subjectId) {
                return {
                    success: false,
                    message: `Failed to find or create subject: ${mcq.subject}`
                };
            }

            // Step 2: Find or create topic
            const topicId = await this.findOrCreateTopic(mcq.topic, subjectId);
            if (!topicId) {
                return {
                    success: false,
                    message: `Failed to find or create topic: ${mcq.topic} under subject ${mcq.subject}`
                };
            }

            // Step 3: Find or create subtopic (optional)
            const subtopicId = await this.findOrCreateSubtopic(mcq.subtopic, topicId);

            return {
                success: true,
                subjectId,
                topicId,
                subtopicId,
                message: subtopicId
                    ? `Assigned to ${mcq.subject} > ${mcq.topic} > ${mcq.subtopic}`
                    : `Assigned to ${mcq.subject} > ${mcq.topic} (no subtopic)`
            };
        } catch (error) {
            console.error('Error in autoAssignHierarchy:', error);
            return {
                success: false,
                message: `System error during auto-assignment: ${error}`
            };
        }
    }

    /**
     * Upload MCQs to database (original method - for backward compatibility)
     */
    static async uploadMCQs(
        mcqs: MCQRow[],
        subtopicId: number,
        userId: string,
        fileName: string
    ): Promise<UploadResult> {
        try {
            // Create upload record
            const { data: uploadRecord, error: uploadError } = await supabase
                .from('uploads')
                .insert([
                    {
                        upload_type: 'mcq_excel',
                        file_name: fileName,
                        subtopic_id: subtopicId, // Add subtopic_id to fix schema cache error
                        status: 'processing',
                        total_rows: mcqs.length,
                        processed_rows: 0,
                        failed_rows: 0,
                        created_by: userId
                    }
                ])
                .select()
                .single();

            if (uploadError || !uploadRecord) {
                return {
                    success: false,
                    totalRows: mcqs.length,
                    processedRows: 0,
                    failedRows: mcqs.length,
                    errors: [{ row: 0, field: 'upload', message: 'Failed to create upload record' }]
                };
            }

            let processedCount = 0;
            let failedCount = 0;
            const errors: ValidationError[] = [];

            // Insert MCQs in batches
            const batchSize = 50;
            for (let i = 0; i < mcqs.length; i += batchSize) {
                const batch = mcqs.slice(i, i + batchSize);

                const mcqInserts = batch.map(mcq => ({
                    subtopic_id: subtopicId,
                    question: mcq.question,
                    question_image_url: mcq.image_url,
                    option_a: mcq.option_a,
                    option_b: mcq.option_b,
                    option_c: mcq.option_c,
                    option_d: mcq.option_d,
                    correct_option: mcq.correct_option,
                    explanation: mcq.explanation,
                    explanation_url: mcq.explanation_url,
                    difficulty: mcq.difficulty || 'medium',
                    upload_id: uploadRecord.id,
                    is_active: true
                }));

                const { error: insertError } = await supabase
                    .from('mcqs')
                    .insert(mcqInserts);

                if (insertError) {
                    failedCount += batch.length;
                    errors.push({
                        row: i,
                        field: 'batch',
                        message: `Failed to insert batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`
                    });
                } else {
                    processedCount += batch.length;
                }
                // Update upload record
                await supabase
                    .from('uploads')
                    .update({
                        status: failedCount === 0 ? 'completed' : 'failed',
                        processed_rows: processedCount,
                        failed_rows: failedCount,
                        validation_errors: errors.length > 0 ? errors : null,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', uploadRecord.id);

                // AUTO-LINKING: Link this subtopic to all active universities
                try {
                    // 1. Get the hierarchy details
                    const { data: subtopic } = await supabase
                        .from('subtopics')
                        .select('id, topic_id, topic:topics(id, subject_id)')
                        .eq('id', subtopicId)
                        .single();

                    if (subtopic && subtopic.topic) {
                        const topicData = subtopic.topic as any;
                        const topicId = topicData.id;
                        const subjectId = topicData.subject_id;

                        // 2. Get all active universities
                        const { data: universities } = await supabase
                            .from('universities')
                            .select('id')
                            .eq('is_active', true);

                        if (universities && universities.length > 0) {
                            // 3. Create mapping records
                            const mappings = universities.map(uni => ({
                                university_id: uni.id,
                                subject_id: subjectId,
                                topic_id: topicId,
                                subtopic_id: subtopicId,
                                is_active: true
                            }));

                            // 4. Upsert mappings (ignore if already exists)
                            await supabase
                                .from('university_content_access')
                                .upsert(mappings, { onConflict: 'university_id, subject_id, topic_id, subtopic_id' });
                        }
                    }
                } catch (linkError) {
                    console.error("Auto-linking failed (non-critical):", linkError);
                }
            }

            return {
                success: failedCount === 0,
                totalRows: mcqs.length,
                processedRows: processedCount,
                failedRows: failedCount,
                errors,
                uploadId: uploadRecord.id
            };
        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                totalRows: mcqs.length,
                processedRows: 0,
                failedRows: mcqs.length,
                errors: [{ row: 0, field: 'system', message: 'System error during upload' }]
            };
        }
    }

    /**
     * Upload MCQs with auto-detection and assignment
     */
    static async uploadMCQsWithAutoDetect(
        mcqs: MCQRow[],
        userId: string,
        fileName: string
    ): Promise<UploadResult> {
        try {
            // 1. Create upload record
            const { data: uploadRecord, error: uploadError } = await supabase
                .from('uploads')
                .insert([
                    {
                        upload_type: 'mcq_excel_auto',
                        file_name: fileName,
                        status: 'processing',
                        total_rows: mcqs.length,
                        processed_rows: 0,
                        failed_rows: 0,
                        created_by: userId
                    }
                ])
                .select()
                .single();

            if (uploadError || !uploadRecord) {
                return {
                    success: false,
                    totalRows: mcqs.length,
                    processedRows: 0,
                    failedRows: mcqs.length,
                    errors: [{ row: 0, field: 'upload', message: 'Failed to create upload record' }]
                };
            }

            let processedCount = 0;
            let failedCount = 0;
            const errors: ValidationError[] = [];

            // Group MCQs by hierarchy to enable batching
            const hierarchyCache = new Map<string, { subjectId: number; topicId: number; subtopicId: number | null }>();
            const groupedMCQs = new Map<string, MCQRow[]>();

            for (let i = 0; i < mcqs.length; i++) {
                const mcq = mcqs[i];
                if (!mcq.subject || !mcq.topic) {
                    failedCount++;
                    errors.push({
                        row: i + 2,
                        field: 'hierarchy',
                        message: 'Subject and Topic are required for auto-detection'
                    });
                    continue;
                }

                const hierarchyKey = `${mcq.subject.trim().toLowerCase()}|${mcq.topic.trim().toLowerCase()}|${mcq.subtopic?.trim().toLowerCase() || 'NO_SUBTOPIC'}`;

                if (!groupedMCQs.has(hierarchyKey)) {
                    groupedMCQs.set(hierarchyKey, []);
                }
                groupedMCQs.get(hierarchyKey)!.push(mcq);
            }

            // Process each group
            for (const [hierarchyKey, group] of groupedMCQs.entries()) {
                const firstMCQ = group[0];

                // Resolve hierarchy for this group
                let hierarchy = hierarchyCache.get(hierarchyKey);
                if (!hierarchy) {
                    const assignResult = await this.autoAssignHierarchy(firstMCQ);

                    if (!assignResult.success || !assignResult.subjectId || !assignResult.topicId) {
                        failedCount += group.length;
                        errors.push({
                            row: mcqs.indexOf(firstMCQ) + 2,
                            field: 'hierarchy',
                            message: `Failed to resolve hierarchy for group: ${firstMCQ.subject} > ${firstMCQ.topic}. ${assignResult.message}`
                        });
                        continue;
                    }

                    hierarchy = {
                        subjectId: assignResult.subjectId,
                        topicId: assignResult.topicId,
                        subtopicId: assignResult.subtopicId ?? null
                    };
                    hierarchyCache.set(hierarchyKey, hierarchy);
                }

                // Batch insert the group
                const mcqInserts = group.map(mcq => ({
                    question: mcq.question,
                    question_image_url: mcq.image_url,
                    option_a: mcq.option_a,
                    option_b: mcq.option_b,
                    option_c: mcq.option_c,
                    option_d: mcq.option_d,
                    correct_option: mcq.correct_option,
                    explanation: mcq.explanation,
                    explanation_url: mcq.explanation_url,
                    difficulty: mcq.difficulty || 'medium',
                    subtopic_id: hierarchy!.subtopicId,
                    topic_id: hierarchy!.subtopicId ? null : hierarchy!.topicId, // Only set topic_id if no subtopic
                    upload_id: uploadRecord.id,
                    is_active: true
                }));

                const { error: insertError } = await supabase
                    .from('mcqs')
                    .insert(mcqInserts);

                if (insertError) {
                    failedCount += group.length;
                    errors.push({
                        row: mcqs.indexOf(firstMCQ) + 2,
                        field: 'insert',
                        message: `Failed to insert batch: ${insertError.message}`
                    });
                } else {
                    processedCount += group.length;
                }

                // Update progress
                await supabase
                    .from('uploads')
                    .update({
                        processed_rows: processedCount,
                        failed_rows: failedCount
                    })
                    .eq('id', uploadRecord.id);
            }

            // Final update
            await supabase
                .from('uploads')
                .update({
                    status: failedCount === 0 ? 'completed' : (processedCount > 0 ? 'partially_completed' : 'failed'),
                    validation_errors: errors.length > 0 ? errors : null,
                    completed_at: new Date().toISOString()
                })
                .eq('id', uploadRecord.id);

            return {
                success: failedCount === 0,
                totalRows: mcqs.length,
                processedRows: processedCount,
                failedRows: failedCount,
                errors,
                uploadId: uploadRecord.id
            };
        } catch (error) {
            console.error('Auto-detect upload error:', error);
            return {
                success: false,
                totalRows: mcqs.length,
                processedRows: 0,
                failedRows: mcqs.length,
                errors: [{ row: 0, field: 'system', message: 'System error during auto-detect upload' }]
            };
        }
    }

    /**
     * Get preview data (first 5 rows)
     */
    static getPreviewData(mcqs: MCQRow[]): MCQRow[] {
        return mcqs.slice(0, 5);
    }

    /**
     * Check for duplicate questions
     */
    static async checkDuplicates(
        questions: string[],
        subtopicId: number
    ): Promise<string[]> {
        try {
            const { data: existing } = await supabase
                .from('mcqs')
                .select('question')
                .eq('subtopic_id', subtopicId)
                .in('question', questions);

            return existing?.map(m => m.question) || [];
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return [];
        }
    }
}
