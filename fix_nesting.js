const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// We identify the markers
const headerEnd = '</div>\n\n            <div className="flex-1 flex overflow-hidden">';
const startOfSidebar = '            {/* Right Sidebar - Palette */}';
const endOfSidebar = '                </div>\n            </div>';
const startOfModal = '            {isTimeUpModalOpen && (';

// We want to reconstruct the whole return block part.
// Better to just replace the broken section.

const brokenPartStart = '<div className="flex-1 flex overflow-hidden">';
const searchRegex = /<div className="flex-1 flex overflow-hidden">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

// This is too risky. Let's do it by markers.

// Find where Nav Controls ends
const navEndMarker = '                    </button>\n                </div>\n            </div>';
// Wait, the file has:
/*
621:                         <ChevronRight className="w-5 h-5" />
622:                     </button>
623:                 </div>
624:             </div>
*/

// If 624 closes Body Container...
// Let's remove 624.

content = content.replace(
    '                    </button>\n                </div>\n            </div>',
    '                    </button>\n                </div>'
);

// Now Sidebar is at 627.
// 678 closes sidebar.
// 679 is extra closing root.
// We want Sidebar to be INSIDE Body Container.
// So we keep O3 open until after Sidebar.

// Let's find line 678/679 block.
// 677: </div> (closes footer)
// 678: </div> (closes sidebar container)
// 679: </div> (CLOSES ROOT)

const sidebarBottom = '                </div>\n            </div>\n            </div>';
// I will replace the sidebar end and the extra div with:
// </div> (closes sidebar)
// </div> (closes body container)

content = content.replace(
    '                </div>\n            </div>\n            </div>',
    '                </div>\n            </div>\n        </div>'
);

// Now line 681: {isTimeUpModalOpen && ( ... )}
// 713: </div> (CLOSES ROOT)

// Let's check if we have enough divs at the end.
// Root 1 (410)
//   Header (412)
//   Body (471)
//     Main/Nav
//     Sidebar (627)
//   Modal (681)
// Root 1 End (713)

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed nesting via specific string replacements.');
