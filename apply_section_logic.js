const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Helper to find line by content
const findLine = (pattern) => lines.findIndex(l => l.includes(pattern));

// 1. Add section timer effect and handleFinishSection
const timerEffectStartLine = findLine('// Timer Logic');
if (timerEffectStartLine !== -1) {
    const sectionLogic = `
    // Section Timer Logic
    useEffect(() => {
        if (!activeSectionId || status === 'completed') return;
        const currentSection = sections.find(s => s.id === activeSectionId);
        if (!currentSection || !currentSection.section_duration) {
            setSectionTimeLeft(null);
            return;
        }

        const sTimer = setInterval(() => {
            setSectionTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(sTimer);
                    handleFinishSection(activeSectionId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(sTimer);
    }, [activeSectionId, sections, status]);

    const handleFinishSection = (sectionId: number) => {
        setCompletedSectionIds(prev => [...new Set([...prev, sectionId])]);
        const currentIdx = sections.findIndex(s => s.id === sectionId);
        if (currentIdx < sections.length - 1) {
            const nextSect = sections[currentIdx + 1];
            setActiveSectionId(nextSect.id);
            setActiveQuestionIdx(0);
            const duration = nextSect.section_duration ? nextSect.section_duration * 60 : null;
            setSectionTimeLeft(duration);
            toast.success(\`\${sections[currentIdx].name} finished and locked.\`);
        } else {
            finalizeAttempt(attemptId!);
        }
    };
`;
    lines.splice(timerEffectStartLine, 0, sectionLogic);
}

// 2. Update Save & Next button
const saveNextIdx = lines.findIndex(l => l.includes('setActiveQuestionIdx(prev => prev + 1)') && lines[lines.indexOf(l) + 1]?.includes('} else {'));
if (saveNextIdx !== -1) {
    // Find the button start
    let btnStart = -1;
    for (let i = saveNextIdx; i >= 0; i--) {
        if (lines[i].includes('<button')) { btnStart = i; break; }
    }
    // Find the button end
    let btnEnd = -1;
    for (let i = saveNextIdx; i < lines.length; i++) {
        if (lines[i].includes('</button>')) { btnEnd = i; break; }
    }

    if (btnStart !== -1 && btnEnd !== -1) {
        const newBtn = `                    <button
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
                    </button>`;
        lines.splice(btnStart, btnEnd - btnStart + 1, newBtn);
    }
}

// 3. Update Timer View
const timerViewIdx = findLine('formatTime(timeLeft)');
if (timerViewIdx !== -1) {
    let divStart = -1;
    for (let i = timerViewIdx; i >= 0; i--) { if (lines[i].includes('<div className={`flex items-center gap-3')) { divStart = i; break; } }
    let divEnd = -1;
    for (let i = timerViewIdx; i < lines.length; i++) { if (lines[i].includes('</div>')) { divEnd = i; break; } }

    if (divStart !== -1 && divEnd !== -1) {
        const newTimer = `                    <div className={\`flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all \${timeLeft < 300 ? 'bg-rose-500/20 border-rose-500 animate-pulse text-rose-400' : 'bg-slate-800 border-slate-700 text-indigo-400'}\`}>
                        <Clock className="w-5 h-5" />
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-xl font-black font-mono tracking-widest">{formatTime(timeLeft)}</span>
                            {sectionTimeLeft !== null && (
                                <span className="text-[8px] font-black uppercase tracking-tighter text-rose-400 mt-1">Section: {formatTime(sectionTimeLeft)}</span>
                            )}
                        </div>
                    </div>`;
        lines.splice(divStart, divEnd - divStart + 1, newTimer);
    }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Advanced logic applied.');
