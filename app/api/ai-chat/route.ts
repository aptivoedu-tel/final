// Next.js API Route: AI Chatbot
// Calls GitHub's AI inference API (OpenAI-compatible) directly.
// This bypasses the Supabase Edge Function entirely, which was failing due to
// a missing/broken match_chunks vector DB. The AI model answers from its own
// knowledge (which is more than sufficient for physics tutoring).

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_AI_URL = 'https://models.inference.ai.azure.com/chat/completions';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { question, stream = true } = body;

        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        const githubToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
        if (!githubToken) {
            return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
        }

        console.log(`[AI Chat] Sending to GitHub AI (stream=${stream})...`);

        const aiResponse = await fetch(GITHUB_AI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${githubToken}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are Aptivo, an expert Physics tutor specializing in the Punjab Board (Pakistan) curriculum for FSc (Grade 11 & 12) Physics.

Your style:
- Give thorough, structured answers with ## headings, **bold** key terms, and bullet points.
- Use LaTeX for ALL equations inline ($...$) and display ($$...$$).
- Include derivations step-by-step with numbered lists.
- Reference real-world applications.
- Mention relevant chapters in the Punjab Board syllabus when known.
- NEVER use ASCII box-drawing art for diagrams — use structured lists or Markdown tables instead.
- Always answer confidently from your own knowledge. NEVER say "I don't know" for standard physics topics.`,
                    },
                    {
                        role: 'user',
                        content: question,
                    },
                ],
                temperature: 0.3,
                max_tokens: 2000,
                stream,
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text().catch(() => '');
            console.error(`[AI Chat] GitHub AI error [${aiResponse.status}]:`, errText.slice(0, 300));
            return NextResponse.json(
                { error: `AI unavailable (${aiResponse.status}). Please check your GitHub token.` },
                { status: 502 }
            );
        }

        if (stream) {
            // Transform OpenAI SSE stream → our custom SSE format (type: token)
            const encoder = new TextEncoder();
            const transformedStream = new ReadableStream({
                async start(controller) {
                    const reader = aiResponse.body?.getReader();
                    if (!reader) { controller.close(); return; }

                    const decoder = new TextDecoder();
                    let buffer = '';

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                                const data = trimmed.slice(6);
                                if (data === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    const token = parsed.choices?.[0]?.delta?.content;
                                    if (token) {
                                        const sseEvent = `data: ${JSON.stringify({ type: 'token', token })}\n\n`;
                                        controller.enqueue(encoder.encode(sseEvent));
                                    }
                                } catch (_) {
                                    // skip malformed chunks
                                }
                            }
                        }
                    } finally {
                        controller.close();
                        reader.releaseLock();
                    }
                },
            });

            return new NextResponse(transformedStream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } else {
            // Non-streaming: return JSON
            const data = await aiResponse.json();
            const content = data.choices?.[0]?.message?.content || '';
            return NextResponse.json({ content });
        }

    } catch (error: any) {
        console.error('[AI Chat] Error:', error);
        return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
    }
}
