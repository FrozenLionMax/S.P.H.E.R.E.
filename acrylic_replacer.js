const fs = require('fs');
const file = 'app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/bg-black\/45 border border-white\/5 rounded-sm/g, 'backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl');
code = code.replace(/bg-slate-950\/40 border border-slate-900\/60 rounded-sm/g, 'bg-black/40 border border-white/[0.04] rounded-xl shadow-inner');
code = code.replace(/bg-slate-950\/20 rounded-sm/g, 'bg-black/20 rounded-xl shadow-inner');
code = code.replace(/border-slate-900\/60/g, 'border-white/[0.04]');
code = code.replace(/rounded-xs/g, 'rounded-md');

// specific to panels in track visualizers:
code = code.replace(/bg-slate-900\/40 rounded-t-xs/g, 'bg-black/30 rounded-t-md');
code = code.replace(/bg-slate-950\/40 border border-slate-900\/60/g, 'bg-black/40 border border-white/[0.04] rounded-xl');
code = code.replace(/border border-white\/5 rounded-sm/g, 'border border-white/[0.08] rounded-2xl');
code = code.replace(/bg-black\/45/g, 'backdrop-blur-xl bg-white/[0.03] shadow-[0_8px_32px_rgba(0,0,0,0.3)]');

// Also enhance the main dashboard wrapper containers
// Find the right sidebar container:
code = code.replace(/w-80 flex flex-col gap-2 shrink-0/g, 'w-80 flex flex-col gap-3 shrink-0');
code = code.replace(/p-4 flex flex-col gap-2/g, 'p-4 flex flex-col gap-3');

// Give the bottom charts some acrylic love
code = code.replace(/p-4 shrink-0/g, 'p-4 shrink-0 backdrop-blur-xl bg-white/[0.02] border-t border-white/[0.05]');

// And the timeline items
code = code.replace(/bg-black\/40 border border-white\/5 rounded-sm/g, 'backdrop-blur-md bg-white/[0.02] border border-white/[0.06] shadow-lg rounded-xl');

// Save it
fs.writeFileSync(file, code);
console.log('Acrylic styles applied successfully.');
