import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RouteFallback } from './components/RouteFallback';
import { FaqPage } from './pages/FaqPage';
import { AboutPage } from './pages/AboutPage';

const HomeRoute = lazy(() =>
  import('./pages/HomeRoute').then((module) => ({ default: module.HomeRoute }))
);

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/como-funciona" element={<Navigate to="/sobre?section=fluxo" replace />} />
          <Route path="/formatos" element={<Navigate to="/sobre?section=formatos" replace />} />
          <Route path="/privacidade" element={<Navigate to="/faq?section=privacidade" replace />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="*" element={<HomeRoute />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
