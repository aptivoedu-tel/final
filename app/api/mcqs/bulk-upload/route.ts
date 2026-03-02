import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, Subject, Topic, Subtopic, Upload, University } from '@/lib/mongodb/models';
import UniversityContentAccess from '@/lib/mongodb/models/UniversityContentAccess';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { mcqs, subtopicId, fileName, uploadType } = body; // uploadType: 'mcq_excel' or 'mcq_excel_auto'

        await connectToDatabase();

        // 1. Create Upload record
        const uploadId = Math.floor(Date.now() / 1000);
        const uploadRecord = await Upload.create({
            id: uploadId,
            upload_type: uploadType || 'mcq_excel',
            file_name: fileName,
            status: 'processing',
            total_rows: mcqs.length,
            processed_rows: 0,
            failed_rows: 0,
            created_by: session.user.id,
            created_at: new Date()
        });

        let insertedCount = 0;
        let skippedInFile = 0;
        let skippedExact = 0;
        const errors: any[] = [];

        // 2. Process MCQs
        const seenNormalized = new Set<string>();
        const toInsert: any[] = [];

        for (const mcq of mcqs) {
            const normalized = mcq.question.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();

            if (seenNormalized.has(normalized)) {
                skippedInFile++;
                continue;
            }
            seenNormalized.add(normalized);

            const hash = crypto.createHash('sha256').update(normalized).digest('hex');

            // Check if exists in DB
            const existing = await MCQ.findOne({ question_hash: hash });
            if (existing) {
                skippedExact++;
                continue;
            }

            toInsert.push({
                subtopic_id: subtopicId || mcq.subtopicId,
                topic_id: mcq.topicId,
                question: mcq.question,
                question_hash: hash,
                question_image_url: mcq.image_url,
                option_a: mcq.option_a,
                option_b: mcq.option_b,
                option_c: mcq.option_c,
                option_d: mcq.option_d,
                correct_option: mcq.correct_option,
                explanation: mcq.explanation,
                explanation_url: mcq.explanation_url,
                difficulty: mcq.difficulty || 'medium',
                upload_id: uploadId,
                is_active: true,
                created_at: new Date()
            });
        }

        if (toInsert.length > 0) {
            // Find the highest existing ID to increment from
            const lastMCQ = await MCQ.findOne({}, { id: 1 }).sort({ id: -1 });
            let currentId = (lastMCQ?.id || 0) + 1;

            for (const item of toInsert) {
                item.id = currentId++;
            }

            await MCQ.insertMany(toInsert);
            insertedCount = toInsert.length;
        }

        // 3. Update Upload record
        uploadRecord.status = 'completed';
        uploadRecord.processed_rows = insertedCount;
        uploadRecord.completed_at = new Date();
        await uploadRecord.save();

        // 4. Auto-linking logic
        const universities = await University.find({ is_active: true });

        // Use either provided subtopicId or a set of unique subtopicIds/topicIds from MCQs that need linking
        const mappingsToCreate: any[] = [];

        if (subtopicId) {
            const subtopic = await Subtopic.findOne({ id: subtopicId });
            if (subtopic) {
                const topic = await Topic.findOne({ id: subtopic.topic_id });
                if (topic) {
                    universities.forEach(uni => {
                        mappingsToCreate.push({
                            university_id: uni.id,
                            subject_id: topic.subject_id,
                            topic_id: topic.id,
                            subtopic_id: subtopicId,
                            is_active: true
                        });
                    });
                }
            }
        } else if (uploadType === 'mcq_excel_auto') {
            // Find unique topic/subtopic combinations in uploaded MCQs
            const uniqueCombos = new Set<string>();
            mcqs.forEach((mcq: any) => {
                if (mcq.topicId) {
                    uniqueCombos.add(JSON.stringify({
                        topicId: mcq.topicId,
                        subtopicId: mcq.subtopicId || null
                    }));
                }
            });

            for (const comboStr of uniqueCombos) {
                const { topicId, subtopicId } = JSON.parse(comboStr);
                const topic = await Topic.findOne({ id: topicId });
                if (topic) {
                    universities.forEach(uni => {
                        mappingsToCreate.push({
                            university_id: uni.id,
                            subject_id: topic.subject_id,
                            topic_id: topic.id,
                            subtopic_id: subtopicId || null,
                            is_active: true
                        });
                    });
                }
            }
        }

        // Apply any collected mappings
        for (const mapping of mappingsToCreate) {
            // Upsert rule: match university_id, subject_id, topic_id (and subtopic_id or null)
            const matchCondition: any = {
                university_id: mapping.university_id,
                subject_id: mapping.subject_id,
                topic_id: mapping.topic_id
            };
            if (mapping.subtopic_id) {
                matchCondition.subtopic_id = mapping.subtopic_id;
            } else {
                matchCondition.subtopic_id = null;
            }

            // We need an ID for insertion if it doesn't exist
            const existingMapping = await UniversityContentAccess.findOne(matchCondition);
            if (!existingMapping) {
                const lastMapping = await UniversityContentAccess.findOne().sort({ id: -1 });
                mapping.id = (lastMapping?.id || 0) + 1;
                await UniversityContentAccess.create(mapping);
            } else {
                await UniversityContentAccess.updateOne(matchCondition, { $set: { is_active: true } });
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: mcqs.length,
            inserted: insertedCount,
            skipped_in_file: skippedInFile,
            skipped_exact: skippedExact,
            uploadId
        });

    } catch (error: any) {
        console.error('MCQ Bulk Upload Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
