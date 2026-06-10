const fs = require('fs');
const file = 'app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Convert MetricCard brutalist styles to acrylic glassmorphism
code = code.replace(/background: 'var\(--panel\)'/g, "background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)'");
code = code.replace(/borderRadius: 3/g, "borderRadius: 16");
code = code.replace(/borderRadius: 4/g, "borderRadius: 16");
code = code.replace(/borderRadius: '4px'/g, "borderRadius: '16px'");
code = code.replace(/borderRadius: '2px'/g, "borderRadius: '8px'");

// Replace remaining inline border colors
code = code.replace(/'var\(--border\)'/g, "'rgba(255, 255, 255, 0.08)'");

// Replace remaining generic tailwind rounded classes
code = code.replace(/rounded-sm/g, "rounded-xl");
code = code.replace(/rounded-xs/g, "rounded-lg");

// For MetricCard specifically, ensure the backdrop filter class is added instead of inline if needed,
// but inline `backdropFilter: 'blur(16px)'` works perfectly in React.

// Update the main container background from 'var(--background)' to be the same animated background as Landing page
// Or maybe they want the dashboard to also have the awesome mesh?
// Actually, 'var(--background)' is pure dark, which is fine, but the acrylic panels need something behind them to look good.
// Let's add a subtle radial gradient to the main dashboard background.
code = code.replace(
  /<div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden" style=\{\{ background: 'var\(--background\)' \}\}>/g,
  '<div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: `radial-gradient(circle at center, ${trackConf.themeColor}15 0%, #000000 100%)` }}>'
);

fs.writeFileSync(file, code);
console.log('Advanced acrylic styles applied.');
