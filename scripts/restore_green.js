const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const targetExtensions = ['.tsx', '.ts', '.css', '.md', '.js'];
const excludeDirs = ['node_modules', '.next', '.git', 'dist', 'build'];

const replacements = [
    // Reverse Primary: Indigo -> Teal
    { from: /bg-indigo-(\d+)/g, to: 'bg-teal-$1' },
    { from: /text-indigo-(\d+)/g, to: 'text-teal-$1' },
    { from: /border-indigo-(\d+)/g, to: 'border-teal-$1' },
    { from: /from-indigo-(\d+)/g, to: 'from-teal-$1' },
    { from: /to-indigo-(\d+)/g, to: 'to-teal-$1' },
    { from: /via-indigo-(\d+)/g, to: 'via-teal-$1' },
    { from: /ring-indigo-(\d+)/g, to: 'ring-teal-$1' },
    { from: /shadow-indigo-(\d+)/g, to: 'shadow-teal-$1' },
    { from: /selection:bg-indigo-(\d+)/g, to: 'selection:bg-teal-$1' },

    // Reverse Secondary: Blue -> Emerald (Higher impact green)
    { from: /bg-blue-(\d+)/g, to: 'bg-emerald-$1' },
    { from: /text-blue-(\d+)/g, to: 'text-emerald-$1' },
    { from: /border-blue-(\d+)/g, to: 'border-emerald-$1' },
    { from: /shadow-blue-(\d+)/g, to: 'shadow-emerald-$1' },

    // Reverse Generic: Blue fallback -> Green
    { from: /bg-emerald-50/g, to: 'bg-green-50' },
    { from: /text-emerald-600/g, to: 'text-green-600' },
    { from: /bg-emerald-600\/10/g, to: 'bg-emerald-600/10' },

    // Hex codes: Indigo -> Teal
    { from: /#0d9488/gi, to: '#0d9488' }, // indigo-600 -> teal-600
    { from: /#0f766e/gi, to: '#0f766e' }, // indigo-700 -> teal-700
    { from: /#14b8a6/gi, to: '#14b8a6' }, // indigo-500 -> teal-500
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
                processDirectory(fullPath);
            }
        } else if (targetExtensions.includes(path.extname(file))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            for (const replacement of replacements) {
                content = content.replace(replacement.from, replacement.to);
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Restored colors in: ${fullPath}`);
            }
        }
    }
}

console.log('Starting restoration of green (Teal/Emerald) colors...');
processDirectory(projectRoot);
console.log('Restoration complete! Cleaning up specific UI edge cases...');
