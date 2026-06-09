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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload };
}
