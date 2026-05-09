import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { RouteMeta } from './RouteMeta';

export function AppShell() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden selection:bg-primary/20">
      <RouteMeta />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />

    </div>
  );
}

import { cn } from '../utils/ui';
