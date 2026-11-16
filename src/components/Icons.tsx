import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const TodayIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <circle cx="12" cy="15.2" r="1.7" fill="currentColor" stroke="none" />
  </Svg>
);

export const PlanIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10" />
    <circle cx="5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

/** A training cone. */
export const DrillsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 6.2 19.5h11.6L12 3.5Z" />
    <path d="M9 11.5h6M7.8 15.5h8.4M3.5 20h17" />
  </Svg>
);

export const ProgressIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4.5v15h16" />
    <path d="m7.5 15 3.5-4 3 2.5 5-6" />
  </Svg>
);

/** Focus target, used for the mentality coach. */
export const MindIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h9M18 7h2M4 17h3M12 17h8" />
    <circle cx="15.5" cy="7" r="2.3" />
    <circle cx="9.5" cy="17" r="2.3" />
  </Svg>
);

/**
 * App mark: the ball at a winger's feet on the left touchline, a run up the
 * line, then the cut inside. Kept in sync with public/favicon.svg and the
 * PNG icons (scripts/make_icons.py).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0A1F44" />
      <path d="M12 8v48" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" />
      <path
        d="M22 46V36c0-9 6-14 15-14h4"
        fill="none"
        stroke="#E6393E"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="m37 14 9 8-9 8"
        fill="none"
        stroke="#E6393E"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="53" r="5.5" fill="#FFFFFF" />
    </svg>
  );
}
