import type { ReactNode } from 'react';

export type PlannedItem = { label: string; milestone: string };

/** A screen that isn't built yet: says what's coming and in which milestone. */
export function Placeholder({
  title,
  lede,
  items,
  children,
}: {
  title: string;
  lede: string;
  items: PlannedItem[];
  children?: ReactNode;
}) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-lede">{lede}</p>
      <div className="stack">
        {children}
        <section className="card">
          <p className="card__eyebrow">Coming here</p>
          <ul className="list">
            {items.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span className="coming">{item.milestone}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
