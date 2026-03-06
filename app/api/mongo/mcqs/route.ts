// MongoDB API - MCQs (Question Bank)
// Full CRUD — mirrors the Supabase mcqs table exactly
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import MCQ from '@/lib/mongodb/models/MCQ';
import Subject from '@/lib/mongodb/models/Subject';
import Topic from '@/lib/mongodb/models/Topic';
import Subtopic from '@/lib/mongodb/models/Subtopic';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const subtopic_id = searchParams.get('subtopic_id');
        const topic_id = searchParams.get('topic_id');
        const subject_id = searchParams.get('subject_id');
        const counts_only = searchParams.get('counts_only') === 'true';

        // Return counts summary (for hierarchy tree MCQ counts)
        if (counts_only) {
            const [subjects, topics, subtopics, allMcqs] = await Promise.all([
                Subject.find({ is_active: true }).sort({ display_order: 1 }),
                Topic.find({ is_active: true }).sort({ sequence_order: 1 }),
                Subtopic.find({ is_active: true }).sort({ sequence_order: 1 }),
                MCQ.find({ is_active: true }).select('id subtopic_id topic_id'),
            ]);
            return NextResponse.json({ subjects, topics, subtopics, allMcqs });
        }

        const filter: any = { is_active: true };
        if (subtopic_id) {
            filter.subtopic_id = parseInt(subtopic_id);
        } else if (topic_id) {
            // Include MCQs directly on topic AND MCQs on its subtopics
            const childSubtopics = await Subtopic.find({ topic_id: parseInt(topic_id) }).select('id');
            const childSubtopicIds = childSubtopics.map(st => st.id);
            if (childSubtopicIds.length > 0) {
                filter.$or = [
                    { topic_id: parseInt(topic_id) },
                    { subtopic_id: { $in: childSubtopicIds } },
                ];
            } else {
                filter.topic_id = parseInt(topic_id);
            }
        } else if (subject_id) {
            // Find all subtopics under this subject
            const subjectTopics = await Topic.find({ subject_id: parseInt(subject_id) }).select('id');
            const topicIds = subjectTopics.map(t => t.id);
            const subSubtopics = await Subtopic.find({ topic_id: { $in: topicIds } }).select('id');
            const subtopicIds = subSubtopics.map(st => st.id);
            filter.$or = [
                { topic_id: { $in: topicIds } },
                { subtopic_id: { $in: subtopicIds } },
            ];
        }

        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null;
        const shuffle = searchParams.get('shuffle') === 'true';

        let rawMcqs = await MCQ.find(filter).sort({ created_at: -1 });

        // Group by passage_id to keep passage questions strictly together
        const groupedMcqs: any[] = [];
        const passageMap = new Map<number, any[]>();

        rawMcqs.forEach(mcq => {
            if (mcq.passage_id) {
                if (!passageMap.has(mcq.passage_id)) {
                    passageMap.set(mcq.passage_id, []);
                }
                passageMap.get(mcq.passage_id)!.push(mcq);
            }
        });

        const seenPassages = new Set<number>();
        rawMcqs.forEach(mcq => {
            if (mcq.passage_id) {
                if (!seenPassages.has(mcq.passage_id)) {
                    seenPassages.add(mcq.passage_id);
                    // Instead of raw items, keep the grouped blocks for shuffling
                    groupedMcqs.push({ type: 'passage', id: mcq.passage_id, items: passageMap.get(mcq.passage_id)! });
                }
            } else {
                groupedMcqs.push({ type: 'single', items: [mcq] });
            }
        });

        let finalSet: any[] = [];
        if (shuffle) {
            // Function to shuffle array in place
            const shuffleArray = (array: any[]) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            };

            // Shuffle the grouped blocks
            let pool = shuffleArray([...groupedMcqs]);

            // If we have a limit and not enough questions, we need to loop/repeat
            if (limit && limit > 0) {
                let count = 0;
                while (count < limit) {
                    // Flatten the next block in the pool
                    const nextBlock = pool[count % pool.length];
                    if (!nextBlock) break; // Safety if pool is empty

                    // For passages, we usually add the whole block
                    // But for simple repeats to reach 'limit' exactly, we flatten
                    nextBlock.items.forEach((item: any) => {
                        if (count < limit) {
                            finalSet.push(item);
                            count++;
                        }
                    });

                    // If we finished a full pass of the pool, reshuffle for next pass
                    if ((count % pool.length) === 0 && count < limit) {
                        pool = shuffleArray([...groupedMcqs]);
                    }
                }
            } else {
                // Just flatten the shuffled pool
                finalSet = pool.flatMap(g => g.items);
            }
        } else {
            // Just flatten the original grouped blocks
            finalSet = groupedMcqs.flatMap(g => g.items);
            if (limit) finalSet = finalSet.slice(0, limit);
        }

        return NextResponse.json({ mcqs: finalSet });
    } catch (error: any) {
        console.error('MCQs GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        // Support for single or multiple creation
        if (Array.isArray(body)) {
            // Bulk Create
            const last = await MCQ.findOne().sort({ id: -1 });
            let nextId = (last?.id || 0) + 1;
            const questionsWithIds = body.map(q => ({ ...q, id: nextId++ }));
            const mcqs = await MCQ.insertMany(questionsWithIds);
            return NextResponse.json({ success: true, count: mcqs.length }, { status: 201 });
        } else {
            // Single Create
            const last = await MCQ.findOne().sort({ id: -1 });
            const newId = (last?.id || 0) + 1;
            const mcq = await MCQ.create({ id: newId, ...body });
            return NextResponse.json({ mcq }, { status: 201 });
        }
    } catch (error: any) {
        console.error('MCQ POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { id, ids, ...update } = body;

        // Bulk Update Support
        if (ids && Array.isArray(ids)) {
            const result = await MCQ.updateMany(
                { id: { $in: ids } },
                { $set: update }
            );
            return NextResponse.json({ success: true, count: result.modifiedCount });
        }

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const mcq = await MCQ.findOneAndUpdate({ id: parseInt(id) }, update, { new: true });
        if (!mcq) return NextResponse.json({ error: 'MCQ not found' }, { status: 404 });

        return NextResponse.json({ mcq });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const ids = searchParams.get('ids'); // comma-separated for bulk delete

        if (ids) {
            const idArray = ids.split(',').map(Number);
            await MCQ.deleteMany({ id: { $in: idArray } });
            return NextResponse.json({ success: true, count: idArray.length });
        } else if (id) {
            await MCQ.deleteOne({ id: parseInt(id) });
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

