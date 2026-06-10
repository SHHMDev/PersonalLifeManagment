import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

type NavItem = {
  path: string;
  label: string;
  icon: ReactNode;
};

const iconProps = {
  fill: 'none',
  height: 25,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.9,
  viewBox: '0 0 24 24',
  width: 22
};

const items: NavItem[] = [
  {
    path: '/goals',
    label: 'اهداف',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v9" />
        <path d="M7.5 12h9" />
        <path d="M15.8 8.2l-7.6 7.6" />
      </svg>
    )
  },
  {
    path: '/projects',
    label: 'پروژه‌ها',
    icon: (
      <svg {...iconProps}>
        <path d="M4 8.5h16" />
        <path d="M8.5 4v16" />
        <rect x="4" y="4" width="16" height="16" rx="4" />
      </svg>
    )
  },
  {
    path: '/tasks',
    label: 'وظایف',
    icon: (
      <svg {...iconProps}>
        <rect x="5" y="4.5" width="14" height="15" rx="3" />
        <path d="M9 4.5h6" />
        <path d="M8.5 10.5l1.8 1.8 4.2-4.2" />
        <path d="M8.5 15.5h7" />
      </svg>
    )
  },
  {
    path: '/recurring',
    label: 'تکرارشونده',
    icon: (
      <svg {...iconProps}>
        <path d="M18.5 8.5A7.5 7.5 0 006 7" />
        <path d="M5.5 4.5V8H9" />
        <path d="M5.5 15.5A7.5 7.5 0 0018 17" />
        <path d="M18.5 19.5V16H15" />
      </svg>
    )
  },
  {
    path: '/daily-logs',
    label: 'گزارش روزانه',
    icon: (
      <svg {...iconProps}>
        <path d="M7.5 4.5v3" />
        <path d="M16.5 4.5v3" />
        <rect x="4" y="6.5" width="16" height="13" rx="3" />
        <path d="M4 10.5h16" />
        <path d="M8 14h8" />
        <path d="M8 17h5" />
      </svg>
    )
  }
];

export function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="ناوبری پایین"
      style={{
        position: 'fixed',
        insetInline: '12px',
        bottom: '12px',
        minHeight: '68px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-soft)',
        border: '1px solid var(--color-divider)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        alignItems: 'center',
        paddingInline: '6px',
        zIndex: 15
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: 'grid',
            placeItems: 'center',
            gap: '4px',
            borderRadius: '12px',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: isActive ? 700 : 500,
            fontSize: '.7rem',
            textAlign: 'center',
            minHeight: '56px',
            padding: '4px 2px'
          })}
        >
          <span style={{ display: 'inline-flex', lineHeight: 1 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
