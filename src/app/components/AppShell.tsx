import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { RouteMeta } from './RouteMeta';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <RouteMeta />
      <Header />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
