const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// The write_to_file tool inserted literal backslashes before backticks and dollar signs.
// We need to unescape them.
// Replace \` with `
content = content.split('\\`').join('`');

// Replace \$ with $
content = content.split('\\$').join('$');

// Fix the \s in the regex
content = content.split('\\\\s').join('\\s');

fs.writeFileSync(pagePath, content);
console.log('Fixed escaped characters');
