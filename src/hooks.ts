import { useEffect, useState } from 'react';

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const result = await loader();
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'خطا در دریافت داده‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, deps);

  return { data, loading, error, reload };
}

export function useFloatingAction(pathname: string, onAction: () => void): void {
  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      if (detail?.path === pathname) {
        onAction();
      }
    };

    window.addEventListener('plm:floating-action', handler as EventListener);
    return () => window.removeEventListener('plm:floating-action', handler as EventListener);
  }, [onAction, pathname]);
}
