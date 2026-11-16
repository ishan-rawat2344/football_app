import type { ComponentType } from 'react';
import { Link, useLocation } from 'wouter';
import { DrillsIcon, MindIcon, PlanIcon, ProgressIcon, TodayIcon } from './Icons';

type Tab = { href: string; label: string; Icon: ComponentType<{ size?: number }> };

export const TABS: Tab[] = [
  { href: '/', label: 'Today', Icon: TodayIcon },
  { href: '/plan', label: 'Plan', Icon: PlanIcon },
  { href: '/drills', label: 'Drills', Icon: DrillsIcon },
  { href: '/progress', label: 'Progress', Icon: ProgressIcon },
  { href: '/mind', label: 'Mind', Icon: MindIcon },
];

export function isActive(location: string, href: string): boolean {
  return href === '/' ? location === '/' : location === href || location.startsWith(href + '/');
}

export function TabBar() {
  const [location] = useLocation();
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar__inner">
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="tab"
            aria-current={isActive(location, href) ? 'page' : undefined}
          >
            <Icon size={26} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
