import { useLocation, useNavigate } from 'react-router-dom';

const routeByPath: Record<string, string> = {
  '/goals': '/goals',
  '/projects': '/projects',
  '/tasks': '/tasks',
  '/recurring': '/recurring',
  '/daily-logs': '/daily-logs'
};

export function Fab(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const target = routeByPath[location.pathname] ?? '/tasks';

  return (
    <button
      type="button"
      aria-label="افزودن"
      onClick={() => navigate(target)}
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '84px',
        width: '62px',
        height: '62px',
        borderRadius: 'var(--radius-full)',
        border: 'none',
        background: 'linear-gradient(145deg, var(--color-primary), var(--color-primary-dark))',
        color: '#fff',
        fontSize: '2rem',
        lineHeight: 1,
        boxShadow: 'var(--shadow-medium)',
        cursor: 'pointer',
        zIndex: 20
      }}
    >
      +
    </button>
  );
}
