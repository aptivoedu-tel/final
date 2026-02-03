const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add toggleFullScreen function
const stateStart = 'const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);';
if (content.includes(stateStart)) {
    content = content.replace(stateStart, stateStart + `

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };`);
}

// 2. Make the Maximize icon functional
const maximizeIcon = '            <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-2xl z-40">';
const oldButton = `<div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Maximize2 className="w-5 h-5" />
                        </div>`;
const newButton = `<button
                            onClick={toggleFullScreen}
                            className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            title="Toggle Fullscreen"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>`;

if (content.includes('Maximize2')) {
    // Replace the specific block containing Maximize2
    content = content.replace(/<div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">\s*<Maximize2 className="w-5 h-5" \/>\s*<\/div>/, newButton);
}

// 3. Fix the broken JSX at the bottom
// We want to find the sequence of divs and fix the modal logic.
// The broken part looks like:
/*
        </div>

            {/* Time Up Modal * }
    {
        isTimeUpModalOpen && (
            ...
        )
    }
        </div >
*/

const brokenPattern = /<\/div>\s*{\/\* Time Up Modal \*\/ }\s*{\s*isTimeUpModalOpen && \([\s\S]*?\)\s*}\s*<\/div\s*>/;

const correctModal = `        </div>
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

if (brokenPattern.test(content)) {
    content = content.replace(brokenPattern, correctModal);
    console.log('Broken pattern fixed.');
} else {
    console.log('Broken pattern not found via Regex, trying string replacement.');
    // Try a more manual approach
    const lines = content.split('\n');
    let sidebarCloseIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('Overall Progress')) {
            // Find the following </div></div>
            for (let j = i; j < lines.length; j++) {
                if (lines[j].trim() === '</div>' && lines[j + 1]?.trim() === '</div>') {
                    // sidebarCloseIdx = j; // Actually j+1 is the one closing the sidebar area
                }
            }
        }
    }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Script execution finished.');
