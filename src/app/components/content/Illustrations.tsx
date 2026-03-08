import { IllustrationFrame } from './SectionTemplates';

function FormatsProfileGlyph({ type }: { type: 'photo' | 'graphic' | 'auto' }) {
  if (type === 'photo') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="4" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="1.8" fill="currentColor" opacity="0.72" />
        <path
          d="m7.5 16 3.6-3.6 2.3 2.2 2.8-2.8 1.3 1.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'graphic') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M7 12h10M12 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PipelineVisual() {
  const stages = [
    {
      title: 'Entrada',
      body: 'Você solta o lote'
    },
    {
      title: 'Decisão',
      body: 'A melhor saída é escolhida'
    },
    {
      title: 'Entrega',
      body: 'O download volta pronto'
    }
  ];

  return (
    <IllustrationFrame className="illustration-pipeline">
      <div className="pipeline-visual px-3 py-4 md:px-5">
        <div className="pipeline-rail" />
        <div className="pipeline-stage-grid md:grid-cols-3">
          {stages.map((stage, index) => (
            <article key={stage.title} className="pipeline-stage">
              <div className="pipeline-node">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  {index === 0 ? (
                    <>
                      <rect
                        x="4.5"
                        y="5"
                        width="15"
                        height="12"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M7.5 14.5 11 11l2.3 2.2 3.2-3.2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : index === 1 ? (
                    <>
                      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M12 8.5v3.5l2.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M6.5 12h9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="m12 7 5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                </svg>
              </div>
              <div>
                <p className="pipeline-stage-title">{stage.title}</p>
                <p className="pipeline-stage-description">{stage.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </IllustrationFrame>
  );
}

function RoadmapStage({ title, body }: { title: string; body: string }) {
  return (
    <div className="illustration-card p-4">
      <p className="section-label mb-2">Fase</p>
      <p className="font-display text-xl font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

export function RoadmapVisual() {
  return (
    <IllustrationFrame className="illustration-roadmap">
      <div className="grid min-h-full content-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <RoadmapStage title="Web hoje" body="Roda no navegador e já resolve o uso atual." />
        <div className="hidden items-center justify-center md:flex">
          <svg
            viewBox="0 0 64 12"
            className="h-3 w-16 text-primary/55"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6h50m0 0-6-4m6 4-6 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <RoadmapStage
          title="Mesmo core"
          body="Worker, formatos e comparação continuam na mesma base."
        />
        <div className="hidden items-center justify-center md:flex">
          <svg
            viewBox="0 0 64 12"
            className="h-3 w-16 text-primary/55"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6h50m0 0-6-4m6 4-6 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <RoadmapStage
          title="Desktop depois"
          body="A mesma base sobe para a casca desktop sem recomeço."
        />
      </div>
    </IllustrationFrame>
  );
}

export function FormatsVisual() {
  const files = [
    { ext: 'JPG', title: 'Foto', body: 'Compatível e direto para publicação.' },
    { ext: 'PNG', title: 'Transparência', body: 'Ideal para UI, logo e borda limpa.' },
    { ext: 'WEBP', title: 'Peso menor', body: 'Bom para entrega web moderna.' }
  ];

  return (
    <IllustrationFrame className="illustration-formats">
      <div className="grid h-full gap-4">
        <div className="illustration-header-visual illustration-header-visual-lg p-5">
          <div className="illustration-grid-lines" />
          <div className="relative z-[1] grid h-full content-center gap-4 md:grid-cols-3">
            {files.map((file, index) => (
              <article key={file.ext} className="illustration-card-strong p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                  <FormatsProfileGlyph
                    type={index === 0 ? 'photo' : index === 1 ? 'graphic' : 'auto'}
                  />
                </div>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {file.ext}
                </p>
                <p className="mt-2 font-display text-xl font-semibold text-foreground">
                  {file.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{file.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function TrustVisual() {
  return (
    <IllustrationFrame className="illustration-trust">
      <div className="trust-visual px-3 py-4 md:px-5">
        <div className="trust-core">
          <div className="trust-core-badge">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3.8 6.4 6.3v4.3c0 4 2.5 7.8 5.6 9.1 3.1-1.3 5.6-5.1 5.6-9.1V6.3L12 3.8Z" />
              <path d="m9.5 12 1.7 1.7 3.4-3.6" />
            </svg>
          </div>
          <div className="trust-core-copy">
            <p className="font-display text-2xl font-semibold text-foreground">
              O arquivo continua com você
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A compressão acontece na sessão do navegador. Sem conta, sem fila remota e sem envio
              escondido no meio do caminho.
            </p>
          </div>
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function FaqVisual() {
  return null;
}
