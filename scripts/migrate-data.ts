import dotenv from 'dotenv';
import path from 'path';

// Load env vars at the very top before any other imports that might depend on them
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import connectToDatabase from '../lib/mongodb/connection';
import User from '../lib/mongodb/models/User';
import Institution from '../lib/mongodb/models/Institution';
import University from '../lib/mongodb/models/University';
import Subject from '../lib/mongodb/models/Subject';
import Topic from '../lib/mongodb/models/Topic';
import Subtopic from '../lib/mongodb/models/Subtopic';
import MCQ from '../lib/mongodb/models/MCQ';
import PracticeSession from '../lib/mongodb/models/PracticeSession';
import MCQAttempt from '../lib/mongodb/models/MCQAttempt';
import UniversityExam from '../lib/mongodb/models/UniversityExam';
import ExamSection from '../lib/mongodb/models/ExamSection';
import ExamQuestion from '../lib/mongodb/models/ExamQuestion';
import ExamAttempt from '../lib/mongodb/models/ExamAttempt';
import ExamAnswer from '../lib/mongodb/models/ExamAnswer';
import Passage from '../lib/mongodb/models/Passage';
import LearningStreak from '../lib/mongodb/models/LearningStreak';
import Notification from '../lib/mongodb/models/Notification';
import NotificationRecipient from '../lib/mongodb/models/NotificationRecipient';
import Upload from '../lib/mongodb/models/Upload';
import PracticeAttempt from '../lib/mongodb/models/PracticeAttempt';
import ActivityLog from '../lib/mongodb/models/ActivityLog';
import Feedback from '../lib/mongodb/models/Feedback';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase URL or Service Key missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    try {
        console.log('🚀 Starting Full Data Migration: Supabase -> MongoDB Atlas');
        await connectToDatabase();
        console.log('✅ Connected to MongoDB Atlas');

        const tablesToMigrate = [
            { name: 'users', model: User },
            { name: 'institutions', model: Institution },
            { name: 'universities', model: University },
            { name: 'subjects', model: Subject },
            { name: 'topics', model: Topic },
            { name: 'subtopics', model: Subtopic },
            { name: 'mcqs', model: MCQ },
            { name: 'practice_sessions', model: PracticeSession },
            { name: 'mcq_attempts', model: MCQAttempt },
            { name: 'university_exams', model: UniversityExam },
            { name: 'exam_sections', model: ExamSection },
            { name: 'exam_questions', model: ExamQuestion },
            { name: 'exam_attempts', model: ExamAttempt },
            { name: 'exam_answers', model: ExamAnswer },
            { name: 'passages', model: Passage },
            { name: 'learning_streaks', model: LearningStreak },
            { name: 'notifications', model: Notification },
            { name: 'notification_recipients', model: NotificationRecipient },
            { name: 'uploads', model: Upload },
            { name: 'practice_attempts', model: PracticeAttempt },
            { name: 'activity_logs', model: ActivityLog },
            { name: 'feedbacks', model: Feedback }
        ];

        for (const table of tablesToMigrate) {
            console.log(`\n📦 Migrating table: ${table.name}...`);

            // Fetch all from Supabase
            const { data, error } = await supabase.from(table.name).select('*');

            if (error) {
                console.error(`❌ Error fetching ${table.name}:`, error.message);
                continue;
            }

            if (!data || data.length === 0) {
                console.log(`ℹ️ Table ${table.name} is empty.`);
                continue;
            }

            console.log(`   Found ${data.length} records in Supabase.`);

            // Insert into MongoDB
            const operations = data.map(record => ({
                updateOne: {
                    filter: { id: record.id },
                    update: { $set: record },
                    upsert: true
                }
            }));

            const result = await table.model.bulkWrite(operations);

            console.log(`   ✅ Migration complete for ${table.name}`);
            console.log(`      Uploaded/Matched: ${result.upsertedCount + result.modifiedCount + result.matchedCount}`);
        }

        console.log('\n✨ ALL DATABASE TABLES MIGRATED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ FATAL MIGRATION ERROR:', err);
        process.exit(1);
    }
}

migrate();
