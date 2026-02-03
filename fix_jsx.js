const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/admin/universities/[uniId]/exams/page.tsx';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

// We want to replace lines from index 469 (Line 470) to index 478 (Line 479)
// Original lines:
// 470:                                                     </div>
// 471:                                             ))}
// 472:                                         </div>
// 473:                                     )}
// 474:                                 </div>
// 475:                             </div>
// 476:                         )}
// 477:                             </div>
// 478:                 </main>

const newLines = [
    '                                                    </div>',
    '                                                </div>',
    '                                            ))}',
    '                                        </div>',
    '                                    )}',
    '                                </div>',
    '                            </div>',
    '                        )}',
    '                    </div>',
    '                </main>'
];

// Splice them in
lines.splice(469, 10, ...newLines);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('File structure fixed successfully via script.');
