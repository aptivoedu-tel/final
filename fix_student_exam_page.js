const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the question rendering block entirely.
// Find the start: {/* Options Grid */} or nearby
const startMarker = '{/* Options Grid */}';
const endMarker = '{/* Navigation Contols */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const pre = content.substring(0, startIndex);
    const post = content.substring(endIndex);

    const newMiddle = `
                                {/* Options & Response Area */}
                                <div className="space-y-10">
                                    {(activeQuestion.question_type === 'mcq_single' || activeQuestion.question_type === 'mcq_multiple') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {activeQuestion.options.map((opt: any) => {
                                                const isSelected = activeQuestion.question_type === 'mcq_single'
                                                    ? answers[activeQuestion.id] === opt.id
                                                    : (answers[activeQuestion.id] || []).includes(opt.id);

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            if (activeQuestion.question_type === 'mcq_single') {
                                                                handleAnswer(activeQuestion.id, opt.id);
                                                            } else {
                                                                const current = answers[activeQuestion.id] || [];
                                                                const next = current.includes(opt.id)
                                                                    ? current.filter((i: any) => i !== opt.id)
                                                                    : [...current, opt.id];
                                                                handleAnswer(activeQuestion.id, next);
                                                            }
                                                        }}
                                                        className={\`p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 group \${isSelected ? 'bg-teal-600 border-teal-600 text-white shadow-2xl shadow-teal-200' : 'bg-white border-slate-100 hover:border-teal-200 hover:bg-teal-50/50'}\`}
                                                    >
                                                        <div className={\`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all \${isSelected ? 'bg-white text-teal-600 border-white' : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:bg-white group-hover:text-teal-600 group-hover:border-teal-600'}\`}>
                                                            {opt.id.toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold">{opt.text}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'true_false' && (
                                        <div className="flex gap-6">
                                            {['true', 'false'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => handleAnswer(activeQuestion.id, val)}
                                                    className={\`flex-1 py-8 rounded-[2.5rem] border-2 font-black text-sm uppercase tracking-widest transition-all \${answers[activeQuestion.id] === val ? 'bg-teal-600 border-teal-600 text-white shadow-2xl shadow-teal-200' : 'bg-white border-slate-100 hover:border-teal-200'}\`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'numerical' && (
                                        <div className="max-w-md">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Numerical Response</label>
                                            <input
                                                type="text"
                                                className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 font-black text-2xl text-slate-900 shadow-sm"
                                                placeholder="Enter value..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'essay' && (
                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Essay / Long Answer</label>
                                            <textarea
                                                className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 font-bold text-lg text-slate-700 shadow-sm min-h-[400px]"
                                                placeholder="Begin typing your response here..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                            <div className="flex justify-end px-4">
                                                <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                    Word Count: {(answers[activeQuestion.id] || '').trim() ? (answers[activeQuestion.id] || '').trim().split(/\\s+/).length : 0}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest">
                            No questions selected...
                        </div>
                    )}
                </div>
                `;
    content = pre + newMiddle + post;
}

fs.writeFileSync(path, content, 'utf8');
console.log('StudentExamPage fixed successfully.');
