import { PropsWithChildren } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Fab } from '@/components/Fab';

export function MainLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <div className="app-shell">
      {children}
      <Fab />
      <BottomNav />
    </div>
  );
}
