const fs = require('fs');
const path = 'd:/New folder (2)/aptivo-portal/app/university/[uniId]/exam/[examId]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    'setActiveSectionId(sects?.[0]?.id || null);',
    `const firstSect = sects?.[0];
            setActiveSectionId(firstSect?.id || null);
            if (firstSect?.section_duration) {
                setSectionTimeLeft(firstSect.section_duration * 60);
            }`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Final initialization fixed.');
