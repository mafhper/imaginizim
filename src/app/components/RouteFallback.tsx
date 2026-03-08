export function RouteFallback() {
  return (
    <div className="container flex min-h-[calc(100vh-10rem)] items-center justify-center py-16">
      <div className="glass-panel max-w-md p-6 text-center">
        <p className="section-label mb-3">Carregando</p>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Preparando a próxima área
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          A interface está carregando o próximo bloco do produto para manter a home mais leve.
        </p>
      </div>
    </div>
  );
}
