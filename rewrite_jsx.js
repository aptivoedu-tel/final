const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 1. Remove the Body Container closing tag at line 624
// 622:                     </button>
// 623:                 </div>
// 624:             </div>
const line624 = lines[623].trim(); // Index 623 is Line 624
if (line624 === '</div>') {
    console.log('Removing line 624...');
    lines.splice(623, 1);
} else {
    // If indices shifted, search for it
    console.log('Finding line by content...');
    // Look for the one after the previous button block
}

// Actually, let's just trace the whole return block and re-write it based on logic.
// Finding markers:
const bodyStartIdx = lines.findIndex(l => l.includes('className="flex-1 flex overflow-hidden">'));
const sidebarStartIdx = lines.findIndex(l => l.includes('{/* Right Sidebar - Palette */}'));
const modalStartIdx = lines.findIndex(l => l.includes('{isTimeUpModalOpen && ('));

if (bodyStartIdx !== -1 && sidebarStartIdx !== -1 && modalStartIdx !== -1) {
    // We want Sidebar inside Body.
    // Currently Body ends at 624.
    // Sidebar starts at 627.
    // Modal starts at 681.

    // Find where Body ends: search after bodyStartIdx but before sidebarStartIdx
    let bodyEndIdx = -1;
    for (let i = sidebarStartIdx - 1; i > bodyStartIdx; i--) {
        if (lines[i].trim() === '</div>' && lines[i - 1].trim() === '</div>') {
            bodyEndIdx = i;
            break;
        }
    }

    if (bodyEndIdx !== -1) {
        console.log('Moving Body closing tag to after Sidebar...');
        lines.splice(bodyEndIdx, 1);
        // Correcting the shift
    }

    // Now find where Sidebar ends: search after sidebarStartIdx but before modalStartIdx
    let sidebarEndIdx = -1;
    for (let i = modalStartIdx - 1; i > sidebarStartIdx; i--) {
        // Find the last </div> before modal
        if (lines[i].trim() === '</div>') {
            sidebarEndIdx = i;
            // Scan upwards to see if there are multiple
        }
    }

    // Actually, let's just find the sequence of </div> before modal and fix them.
}

// Let's just use a fixed clean version of the return block to be absolutely sure.
const startReturnIdx = lines.findIndex(l => l.includes('return ('));
const endReturnIdx = lines.length - 1; // Assuming it ends with ');' etc.

if (startReturnIdx !== -1) {
    const pre = lines.slice(0, startReturnIdx + 1);
    const post = lines.slice(-2); // last two lines usually } and empty

    const cleanJSX = `        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden select-none">
            {/* Top Navigation / Status Bar */}
            <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-2xl z-40">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
                        <button
                            onClick={toggleFullScreen}
                            className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            title="Toggle Fullscreen"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest">{exam?.name}</h1>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Official Examination Environment</p>
                        </div>
                    </div>

                    {/* Section Switcher */}
                    <div className="flex items-center gap-1">
                        {sections.map(s => {
                            const isLocked = completedSectionIds.includes(s.id);
                            return (
                                <button
                                    key={s.id}
                                    disabled={isLocked}
                                    onClick={() => {
                                        setActiveSectionId(s.id);
                                        setActiveQuestionIdx(0);
                                    }}
                                    className={\`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all \${activeSectionId === s.id ? 'bg-white text-slate-900 shadow-xl scale-105' : isLocked ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}\`}
                                >
                                    {s.name}
                                    {isLocked && <span className="ml-2">🔒</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className={\`flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all \${timeLeft < 300 ? 'bg-rose-500/20 border-rose-500 animate-pulse text-rose-400' : 'bg-slate-800 border-slate-700 text-indigo-400'}\`}>
                        <Clock className="w-5 h-5" />
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-xl font-black font-mono tracking-widest">{formatTime(timeLeft)}</span>
                            {sectionTimeLeft !== null && (
                                <span className="text-[8px] font-black uppercase tracking-tighter text-rose-400 mt-1">Section: {formatTime(sectionTimeLeft)}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (confirm('Finish and submit your exam? This cannot be undone.')) finalizeAttempt(attemptId!);
                        }}
                        className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl active:scale-95"
                    >
                        Finish Test
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
                    {activeQuestion ? (
                        <div className="max-w-4xl mx-auto pb-40">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                                    {activeQuestionIdx + 1}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Question Workspace</h4>
                                    <p className="text-xs font-bold text-slate-400">{activeQuestion.marks} Mark(s) Assigned</p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div className="prose prose-slate max-w-none">
                                    <p className="text-2xl font-black text-slate-800 leading-relaxed">
                                        {activeQuestion.question_text}
                                    </p>
                                </div>

                                {activeQuestion.image_url && (
                                    <div className={\`relative rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 \${isZoomed ? 'scale-150 z-50 fixed inset-10 bg-white/20 backdrop-blur-md' : 'w-full max-w-lg'}\`}>
                                        <img
                                            src={activeQuestion.image_url}
                                            alt="Figure"
                                            className={\`w-full h-auto cursor-zoom-in rounded-[2.5rem] \${isZoomed ? 'h-full object-contain' : ''}\`}
                                            onClick={() => setIsZoomed(!isZoomed)}
                                        />
                                        <button
                                            onClick={() => setIsZoomed(!isZoomed)}
                                            className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl text-slate-900"
                                        >
                                            <ZoomIn className="w-6 h-6" />
                                        </button>
                                    </div>
                                )}

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
                                                        className={\`p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 group \${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50'}\`}
                                                    >
                                                        <div className={\`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all \${isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:bg-white group-hover:text-indigo-600 group-hover:border-indigo-600'}\`}>
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
                                                    className={\`flex-1 py-8 rounded-[2.5rem] border-2 font-black text-sm uppercase tracking-widest transition-all \${answers[activeQuestion.id] === val ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200'}\`}
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
                                                className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 font-black text-2xl text-slate-900 shadow-sm"
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
                                                className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 font-bold text-lg text-slate-700 shadow-sm min-h-[400px]"
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

                            {/* Navigation Controls */}
                            <div className="mt-20 flex justify-between items-center border-t border-slate-200 pt-10">
                                <button
                                    disabled={activeQuestionIdx === 0}
                                    onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                                    className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:grayscale transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Previous
                                </button>
                                <button
                                    onClick={() => {
                                        if (activeQuestionIdx < currentSectionQuestions.length - 1) {
                                            setActiveQuestionIdx(prev => prev + 1);
                                        } else {
                                            if (confirm(\`Do you want to finish \${sections.find(s => s.id === activeSectionId)?.name} and proceed? You won't be able to return to this section.\`)) {
                                                handleFinishSection(activeSectionId!);
                                            }
                                        }
                                    }}
                                    className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                                >
                                    {activeQuestionIdx < currentSectionQuestions.length - 1 ? 'Save & Next' : 'Finish Section'}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest">
                            No questions selected...
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Palette */}
                <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-inner">
                    <div className="p-8 border-b border-slate-50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Question Navigator</h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-600 rounded-sm" />
                                <span className="text-[9px] font-black text-slate-500 uppercase">Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-sm" />
                                <span className="text-[9px] font-black text-slate-500 uppercase">Pending</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-4 gap-4">
                            {currentSectionQuestions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setActiveQuestionIdx(idx)}
                                        className={\`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all \${activeQuestionIdx === idx ? 'scale-110 shadow-lg border-slate-900 bg-slate-900 text-white' :
                                            isAnswered ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                                                'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                            }\`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Overall Progress</span>
                                <span className="text-xs font-black text-slate-900">
                                    {Math.round((Object.keys(answers).length / questions.length) * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-1000"
                                    style={{ width: \`\${(Object.keys(answers).length / questions.length) * 100}%\` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isTimeUpModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                <Clock className="w-12 h-12" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Time Exhausted</h2>
                            <p className="text-slate-500 font-medium leading-relaxed mb-10 px-4">
                                The allocated duration for this session has reached zero. {exam?.allow_continue_after_time_up ? 'You may continue your effort, but a late submission flag will be appended.' : 'The system will now securely transmit your current responses.'}
                            </p>

                            <div className="flex flex-col gap-4">
                                {exam?.allow_continue_after_time_up && (
                                    <button
                                        onClick={() => setIsTimeUpModalOpen(false)}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                                    >
                                        Continue Effort (Mark Lated)
                                    </button>
                                )}
                                <button
                                    onClick={() => finalizeAttempt(attemptId!)}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                                >
                                    Finish & Submit Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>`;

    const finalContent = pre.join('\n') + '\n' + cleanJSX + '\n' + post.join('\n');
    fs.writeFileSync(path, finalContent, 'utf8');
    console.log('JSX block replaced with clean, properly nested version.');
}
