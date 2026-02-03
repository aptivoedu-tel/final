const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the sequence at the bottom
// 678: </div> (Closes SideBar)
// 679: </div> (Closes Flex container)
// 680: </div> (Extra??)
// 681:
// 682: {isTimeUpModalOpen && (

let extraDivIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('isTimeUpModalOpen && (')) {
        // Look back for consecutive </div> tags
        let foundCount = 0;
        for (let j = i - 1; j >= 0; j--) {
            if (lines[j].includes('</div>')) {
                foundCount++;
                if (foundCount === 3) {
                    // This 3rd one might be the extra one or the one we need.
                    // Let's check the indentation.
                    // 678: </div> (Closes 6)
                    // 679: </div> (Closes 3)
                    // 680: </div> (Extra)
                }
            }
            if (lines[j].includes('Overall Progress')) break;
        }
    }
}

// I'll just do a string replacement on the whole block to be safe.
let content = fs.readFileSync(path, 'utf8');
const searchBlock = `                </div>
            </div>

            {isTimeUpModalOpen && (`;

const replaceBlock = `            </div>

            {isTimeUpModalOpen && (`;

if (content.includes(searchBlock)) {
    content = content.replace(searchBlock, replaceBlock);
    console.log('Extra div removed.');
}

fs.writeFileSync(path, content, 'utf8');
