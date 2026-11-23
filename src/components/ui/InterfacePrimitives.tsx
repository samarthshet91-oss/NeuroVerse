import type { ReactNode } from 'react';

export function PanelHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="nv-panel-heading">
      {eyebrow && <div className="nv-eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function StatusBadge({
  tone = 'cyan',
  children,
}: {
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'slate';
  children: ReactNode;
}) {
  return <span className={`nv-status nv-status-${tone}`}>{children}</span>;
}
