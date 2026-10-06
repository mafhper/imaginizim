import { t } from '../../i18n';

export function RouteFallback() {
  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center justify-center py-16">
      <div className="glass-panel max-w-md p-6 text-center">
        <p className="section-label mb-3">{t('app.loading')}</p>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t('app.loading_title')}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t('app.loading_desc')}</p>
      </div>
    </div>
  );
}
