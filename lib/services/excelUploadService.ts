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
    subjectId?: number;
    topicId?: number;
    subtopicId?: number | null;
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
    inserted?: number;
    skipped_in_file_duplicates?: number;
    skipped_exact_duplicates?: number;
    skipped_similar_questions?: number;
    duplicateDetails?: {
        inFile: number;
        exact: number;
        similar: number;
        items: Array<{
            index: number;
            question: string;
            type: 'in-file' | 'exact' | 'similar';
            match?: string;
            score?: number;
        }>;
    };
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

            // LaTeX/Markdown Syntax Validation
            const fieldsToValidate = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'];
            fieldsToValidate.forEach(field => {
                const content = normalizedRow[field]?.toString() || '';
                if (content && !this.validateLatex(content)) {
                    rowErrors.push({
                        row: rowNumber,
                        field: field,
                        message: `Potential LaTeX syntax error (unbalanced $ or $$) in ${field}`
                    });
                }
            });

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
     * Public validation for a single row (used by UI for preview)
     */
    static validateMCQRow(row: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const normalized = this.normalizeRow(row);

        if (!normalized.question) errors.push('Question is missing');

        // LaTeX check
        const fields = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'];
        fields.forEach(f => {
            if (normalized[f] && !this.validateLatex(normalized[f])) {
                errors.push(`LaTeX syntax error in ${f}`);
            }
        });

        const hasOptions = normalized.option_a && normalized.option_b && normalized.option_c && normalized.option_d;
        if (!hasOptions) errors.push('Options are incomplete');

        const correct = normalized.correct_option?.toString().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) errors.push('Invalid correct option');

        return { isValid: errors.length === 0, errors };
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
     * Normalize question text for comparison
     */
    private static normalizeQuestion(text: string): string {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[^\w\s]|_/g, "") // Remove punctuation
            .replace(/\s+/g, " ")      // Remove extra whitespace
            .trim();
    }

    /**
     * Generate SHA256 hash of text
     */
    private static async generateHash(text: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
     * Validate LaTeX syntax (basic check for balanced delimiters)
     */
    private static validateLatex(content: string): boolean {
        // Check for balanced $$
        const blockCount = (content.match(/\$\$/g) || []).length;
        if (blockCount % 2 !== 0) return false;

        // Check for balanced $ (ignoring escaped \$)
        const inlineCount = (content.replace(/\\\$/g, '').match(/\$/g) || []).length;
        // Subtract block delimiters from inline count if they are processed as single $ twice
        const actualInlineCount = inlineCount - (blockCount * 2);
        if (actualInlineCount % 2 !== 0) return false;

        return true;
    }

    /**
     * Find subject by name
     */
    private static async findSubject(subjectName: string): Promise<number | null> {
        try {
            const normalizedName = subjectName.trim();

            const { data: existing } = await supabase
                .from('subjects')
                .select('id')
                .ilike('name', normalizedName)
                .limit(1)
                .single();

            return existing?.id || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find topic by name under a subject
     */
    private static async findTopic(topicName: string, subjectId: number): Promise<number | null> {
        try {
            const normalizedName = topicName.trim();

            const { data: existing } = await supabase
                .from('topics')
                .select('id')
                .eq('subject_id', subjectId)
                .ilike('name', normalizedName)
                .limit(1)
                .single();

            return existing?.id || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find subtopic by name under a topic
     */
    private static async findSubtopic(subtopicName: string | null | undefined, topicId: number): Promise<number | null> {
        try {
            if (!subtopicName || subtopicName.trim() === '') {
                return null;
            }

            const normalizedName = subtopicName.trim();

            const { data: existing } = await supabase
                .from('subtopics')
                .select('id')
                .eq('topic_id', topicId)
                .ilike('name', normalizedName)
                .limit(1)
                .single();

            return existing?.id || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Auto-assign question to subject/topic/subtopic based on MCQ data
     */
    static async autoAssignHierarchy(mcq: MCQRow): Promise<AutoAssignResult> {
        try {
            // Use pre-resolved IDs if provided
            if (mcq.subjectId && mcq.topicId) {
                return {
                    success: true,
                    subjectId: mcq.subjectId,
                    topicId: mcq.topicId,
                    subtopicId: mcq.subtopicId,
                    message: 'Using manually mapped hierarchy'
                };
            }

            if (!mcq.subject || !mcq.topic) {
                return {
                    success: false,
                    message: 'Subject and Topic are required for auto-assignment'
                };
            }

            // Step 1: Find subject
            const subjectId = await this.findSubject(mcq.subject);
            if (!subjectId) {
                return {
                    success: false,
                    message: `Subject Not Found: "${mcq.subject}". Please create it in Hierarchy Manager first.`
                };
            }

            // Step 2: Find topic
            const topicId = await this.findTopic(mcq.topic, subjectId);
            if (!topicId) {
                return {
                    success: false,
                    message: `Topic Not Found: "${mcq.topic}" under subject "${mcq.subject}". Please create it first.`
                };
            }

            // Step 3: Find subtopic (optional in file, but if name given must exist)
            let subtopicId: number | null = null;
            if (mcq.subtopic && mcq.subtopic.trim() !== '') {
                subtopicId = await this.findSubtopic(mcq.subtopic, topicId);
                if (!subtopicId) {
                    return {
                        success: false,
                        message: `Subtopic Not Found: "${mcq.subtopic}" under topic "${mcq.topic}". Please create it first.`
                    };
                }
            }

            return {
                success: true,
                subjectId,
                topicId,
                subtopicId,
                message: subtopicId
                    ? `Linked to ${mcq.subject} > ${mcq.topic} > ${mcq.subtopic}`
                    : `Linked to ${mcq.subject} > ${mcq.topic} (No subtopic)`
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
            // Summary counters
            let skipped_in_file_duplicates = 0;
            let skipped_exact_duplicates = 0;
            let skipped_similar_questions = 0;
            let insertedCount = 0;
            let failedCount = 0;
            const errors: ValidationError[] = [];

            // 1. Get the hierarchy details for metadata
            const { data: hierarchyInfo } = await supabase
                .from('subtopics')
                .select('id, topic_id, topic:topics(id, subject_id)')
                .eq('id', subtopicId)
                .single();

            const topicId = hierarchyInfo?.topic_id || (hierarchyInfo?.topic as any)?.id;
            const subjectId = (hierarchyInfo?.topic as any)?.subject_id;

            const { data: uploadRecord, error: uploadError } = await supabase
                .from('uploads')
                .insert([
                    {
                        upload_type: 'mcq_excel',
                        file_name: fileName,
                        subject_id: subjectId,
                        topic_id: topicId,
                        subtopic_id: subtopicId,
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
                    errors: [{ row: 0, field: 'upload', message: `Failed to create upload record: ${uploadError?.message || 'Unknown error'}` }]
                };
            }

            // 2. Normalization & In-file Duplicate Check (Step 1 & 2)
            const uniqueMCQs: MCQRow[] = [];
            const seenNormalized = new Set<string>();

            for (const mcq of mcqs) {
                const normalized = this.normalizeQuestion(mcq.question);
                if (seenNormalized.has(normalized)) {
                    skipped_in_file_duplicates++;
                    continue;
                }
                seenNormalized.add(normalized);
                uniqueMCQs.push(mcq);
            }

            // 3. Exact Duplicate Check (Database Level) - Batch Process (Step 3)
            const mcqsWithHashes = await Promise.all(uniqueMCQs.map(async (mcq) => {
                const normalized = this.normalizeQuestion(mcq.question);
                const hash = await this.generateHash(normalized);
                return { ...mcq, hash };
            }));

            const allHashes = mcqsWithHashes.map(m => m.hash);

            const dbExistingHashSet = new Set<string>();
            const hashBatchSize = 100;
            for (let i = 0; i < allHashes.length; i += hashBatchSize) {
                const batch = allHashes.slice(i, i + hashBatchSize);
                const { data: existing } = await supabase
                    .from('mcqs')
                    .select('question_hash')
                    .in('question_hash', batch);

                existing?.forEach(h => dbExistingHashSet.add(h.question_hash));
            }

            const questionsToProcess = mcqsWithHashes.filter(m => {
                if (dbExistingHashSet.has(m.hash)) {
                    skipped_exact_duplicates++;
                    return false;
                }
                return true;
            });

            // 4. Similarity Check & Batch Insert
            const batchSize = 50;
            for (let i = 0; i < questionsToProcess.length; i += batchSize) {
                const batch = questionsToProcess.slice(i, i + batchSize);
                const safeToInsertBatch: any[] = [];

                // Process similarity checks in small parallel batches
                const similarityBatchSize = 5;
                for (let j = 0; j < batch.length; j += similarityBatchSize) {
                    const subBatch = batch.slice(j, j + similarityBatchSize);

                    const similarityResults = await Promise.all(subBatch.map(async (mcq) => {
                        const { data: similar } = await supabase.rpc('check_similar_question', {
                            p_topic_id: topicId,
                            p_question_text: mcq.question,
                            p_threshold: 0.85
                        });
                        const result = Array.isArray(similar) ? similar[0] : similar;
                        return { mcq, similar: result };
                    }));

                    for (const { mcq, similar } of similarityResults) {
                        if (similar && (similar as any).exists) {
                            skipped_similar_questions++;
                            continue;
                        }

                        safeToInsertBatch.push({
                            subtopic_id: subtopicId,
                            question: mcq.question,
                            question_hash: mcq.hash,
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
                        });
                    }
                }

                if (safeToInsertBatch.length > 0) {
                    const { error: insertError } = await supabase
                        .from('mcqs')
                        .insert(safeToInsertBatch);

                    if (insertError) {
                        failedCount += batch.length;
                        errors.push({
                            row: i,
                            field: 'batch',
                            message: `Failed to insert batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`
                        });
                    } else {
                        insertedCount += safeToInsertBatch.length;
                    }
                }

                // Update progress
                await supabase
                    .from('uploads')
                    .update({
                        status: failedCount === 0 ? 'completed' : (insertedCount > 0 ? 'partially_completed' : 'failed'),
                        processed_rows: insertedCount,
                        failed_rows: failedCount,
                        validation_errors: errors.length > 0 ? errors : null,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', uploadRecord.id);

                // AUTO-LINKING: Link this subtopic to all active universities
                try {
                    const { data: universities } = await supabase
                        .from('universities')
                        .select('id')
                        .eq('is_active', true);

                    if (universities && universities.length > 0) {
                        const mappings = universities.map(uni => ({
                            university_id: uni.id,
                            subject_id: subjectId,
                            topic_id: topicId,
                            subtopic_id: subtopicId,
                            is_active: true
                        }));

                        await supabase
                            .from('university_content_access')
                            .upsert(mappings, { onConflict: 'university_id, subject_id, topic_id, subtopic_id' });
                    }
                } catch (linkError) {
                    console.error("Auto-linking failed (non-critical):", linkError);
                }
            }

            return {
                success: failedCount === 0,
                totalRows: mcqs.length,
                processedRows: insertedCount,
                inserted: insertedCount,
                failedRows: failedCount,
                skipped_in_file_duplicates,
                skipped_exact_duplicates,
                skipped_similar_questions,
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
            // Summary counters
            let skipped_in_file_duplicates = 0;
            let skipped_exact_duplicates = 0;
            let skipped_similar_questions = 0;
            let insertedCount = 0;
            let failedCount = 0;
            const errors: ValidationError[] = [];

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
                    errors: [{ row: 0, field: 'upload', message: `Failed to create upload record: ${uploadError?.message || 'Unknown error'}` }]
                };
            }

            // 2. Normalization & In-file Duplicate Check (Step 1 & 2)
            const uniqueMCQs: MCQRow[] = [];
            const seenNormalized = new Set<string>();

            for (const mcq of mcqs) {
                const normalized = this.normalizeQuestion(mcq.question);
                if (seenNormalized.has(normalized)) {
                    skipped_in_file_duplicates++;
                    continue;
                }
                seenNormalized.add(normalized);
                uniqueMCQs.push(mcq);
            }

            // 3. Exact Duplicate Check (Database Level) - Batch Process (Step 3)
            const mcqsWithHashes = await Promise.all(uniqueMCQs.map(async (mcq) => {
                const normalized = this.normalizeQuestion(mcq.question);
                const hash = await this.generateHash(normalized);
                return { ...mcq, hash };
            }));

            const allHashes = mcqsWithHashes.map(m => m.hash);

            const dbExistingHashSet = new Set<string>();
            const hashBatchSize = 100;
            for (let i = 0; i < allHashes.length; i += hashBatchSize) {
                const batch = allHashes.slice(i, i + hashBatchSize);
                const { data: existing } = await supabase
                    .from('mcqs')
                    .select('question_hash')
                    .in('question_hash', batch);

                existing?.forEach(h => dbExistingHashSet.add(h.question_hash));
            }

            const questionsToProcess = mcqsWithHashes.filter(m => {
                if (dbExistingHashSet.has(m.hash)) {
                    skipped_exact_duplicates++;
                    return false;
                }
                return true;
            });

            // Group MCQs by hierarchy to enable batching
            const hierarchyCache = new Map<string, { subjectId: number; topicId: number; subtopicId: number | null }>();
            const groupedMCQs = new Map<string, (MCQRow & { hash: string })[]>();

            for (let i = 0; i < questionsToProcess.length; i++) {
                const mcq = questionsToProcess[i];
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

                // Step 4: Similar Question Detection (within same topic)
                const safeToInsertBatch: any[] = [];

                // Process similarity checks in small parallel batches
                const similarityBatchSize = 5; // Conservative parallel limit
                for (let i = 0; i < group.length; i += similarityBatchSize) {
                    const subBatch = group.slice(i, i + similarityBatchSize);

                    const similarityResults = await Promise.all(subBatch.map(async (mcq) => {
                        const { data: similar } = await supabase.rpc('check_similar_question', {
                            p_topic_id: hierarchy!.topicId,
                            p_question_text: mcq.question,
                            p_threshold: 0.85
                        });
                        // rpc might return an object directly or wrap it
                        const result = Array.isArray(similar) ? similar[0] : similar;
                        return { mcq, similar: result };
                    }));

                    for (const { mcq, similar } of similarityResults) {
                        if (similar && (similar as any).exists) {
                            skipped_similar_questions++;
                            continue;
                        }

                        safeToInsertBatch.push({
                            question: mcq.question,
                            question_hash: mcq.hash,
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
                            topic_id: hierarchy!.subtopicId ? null : hierarchy!.topicId,
                            upload_id: uploadRecord.id,
                            is_active: true
                        });
                    }
                }

                if (safeToInsertBatch.length > 0) {
                    const { error: insertError } = await supabase
                        .from('mcqs')
                        .insert(safeToInsertBatch);

                    if (insertError) {
                        failedCount += safeToInsertBatch.length;
                        errors.push({
                            row: mcqs.indexOf(firstMCQ) + 2,
                            field: 'insert',
                            message: `Failed to insert batch: ${insertError.message}`
                        });
                    } else {
                        insertedCount += safeToInsertBatch.length;
                    }
                }

                // Update progress in DB
                await supabase
                    .from('uploads')
                    .update({
                        processed_rows: insertedCount,
                        failed_rows: failedCount
                    })
                    .eq('id', uploadRecord.id);

                // AUTO-LINKING: Link this subtopic/topic to all active universities
                if (hierarchy && (hierarchy.subtopicId || hierarchy.topicId)) {
                    try {
                        const { data: universities } = await supabase
                            .from('universities')
                            .select('id')
                            .eq('is_active', true);

                        if (universities && universities.length > 0) {
                            const mappings = universities.map(uni => ({
                                university_id: uni.id,
                                subject_id: hierarchy!.subjectId,
                                topic_id: hierarchy!.topicId,
                                subtopic_id: hierarchy!.subtopicId,
                                is_active: true
                            }));

                            await supabase
                                .from('university_content_access')
                                .upsert(mappings, { onConflict: 'university_id, subject_id, topic_id, subtopic_id' });
                        }
                    } catch (linkError) {
                        console.error("Auto-linking failed for group (non-critical):", linkError);
                    }
                }
            }

            // Final update
            await supabase
                .from('uploads')
                .update({
                    status: failedCount === 0 ? 'completed' : (insertedCount > 0 ? 'partially_completed' : 'failed'),
                    validation_errors: errors.length > 0 ? errors : null,
                    completed_at: new Date().toISOString()
                })
                .eq('id', uploadRecord.id);

            return {
                success: failedCount === 0,
                totalRows: mcqs.length,
                processedRows: insertedCount,
                inserted: insertedCount,
                failedRows: failedCount,
                skipped_in_file_duplicates,
                skipped_exact_duplicates,
                skipped_similar_questions,
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
     * Comprehensive duplicate validation before upload
     */
    static async validateDuplicates(
        mcqs: MCQRow[]
    ): Promise<UploadResult['duplicateDetails']> {
        const details: any = {
            inFile: 0,
            exact: 0,
            similar: 0,
            items: []
        };

        const seenNormalized = new Map<string, number>(); // text -> index
        const uniqueIndices: number[] = [];

        // 1. In-file check
        mcqs.forEach((mcq, idx) => {
            const normalized = this.normalizeQuestion(mcq.question);
            if (seenNormalized.has(normalized)) {
                details.inFile++;
                details.items.push({
                    index: idx,
                    question: mcq.question,
                    type: 'in-file'
                });
            } else {
                seenNormalized.set(normalized, idx);
                uniqueIndices.push(idx);
            }
        });

        if (uniqueIndices.length === 0) return details;

        // 2. Exact DB check (using hashes)
        const candidates = uniqueIndices.map(idx => ({ idx, mcq: mcqs[idx] }));
        const candidatesWithHashes = await Promise.all(candidates.map(async (c) => ({
            ...c,
            hash: await this.generateHash(this.normalizeQuestion(c.mcq.question))
        })));

        const hashes = candidatesWithHashes.map(c => c.hash);
        const dbHashes = new Set<string>();

        for (let i = 0; i < hashes.length; i += 100) {
            const batch = hashes.slice(i, i + 100);
            const { data } = await supabase
                .from('mcqs')
                .select('question_hash')
                .in('question_hash', batch);
            data?.forEach(row => dbHashes.add(row.question_hash));
        }

        const filteredForSimilarityIndices: number[] = [];
        candidatesWithHashes.forEach(c => {
            if (dbHashes.has(c.hash)) {
                details.exact++;
                details.items.push({
                    index: c.idx,
                    question: c.mcq.question,
                    type: 'exact'
                });
            } else {
                filteredForSimilarityIndices.push(c.idx);
            }
        });

        // 3. Similarity check (only if topicId is resolved)
        // Rate limited for performance
        if (filteredForSimilarityIndices.length > 0) {
            const limit = Math.min(filteredForSimilarityIndices.length, 50); // Scan first 50 unique items for similarity
            for (let i = 0; i < limit; i++) {
                const idx = filteredForSimilarityIndices[i];
                const mcq = mcqs[idx];

                if (mcq.topicId) {
                    const { data: similar } = await supabase.rpc('check_similar_question', {
                        p_topic_id: mcq.topicId,
                        p_question_text: mcq.question,
                        p_threshold: 0.85
                    });
                    const result = Array.isArray(similar) ? similar[0] : similar;
                    if (result?.exists) {
                        details.similar++;
                        details.items.push({
                            index: idx,
                            question: mcq.question,
                            type: 'similar',
                            match: result.question,
                            score: result.score
                        });
                    }
                }
            }
        }

        return details;
    }
}
