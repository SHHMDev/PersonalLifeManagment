import { NavLink } from 'react-router-dom';

const items = [
  { path: '/goals', label: 'اهداف', icon: '◎' },
  { path: '/projects', label: 'پروژه‌ها', icon: '◈' },
  { path: '/tasks', label: 'وظایف', icon: '◉' },
  { path: '/recurring', label: 'تکرارشونده', icon: '◍' },
  { path: '/daily-logs', label: 'گزارش روزانه', icon: '◌' }
];

export function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="ناوبری پایین"
      style={{
        position: 'fixed',
        insetInline: '12px',
        bottom: '12px',
        height: '64px',
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
            gap: '2px',
            borderRadius: '12px',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: isActive ? 700 : 500,
            fontSize: '.72rem',
            height: '100%'
          })}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
