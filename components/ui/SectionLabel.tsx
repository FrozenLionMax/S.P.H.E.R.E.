'use client';

interface SectionLabelProps {
  children: React.ReactNode;
  color?: string;
}

export function SectionLabel({ children, color = '#00d4ff' }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-bold tracking-widest font-mono uppercase text-slate-300">
        {children}
      </span>
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-slate-800/50 w-full my-4" />;
}
