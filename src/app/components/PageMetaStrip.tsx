interface MetaItem {
  label?: string;
  value: string;
  description?: string;
}

interface PageMetaStripProps {
  items: MetaItem[];
  columnsClassName?: string;
  variant?: 'standard' | 'simple';
}

export function PageMetaStrip({
  items,
  columnsClassName = 'sm:grid-cols-2 xl:grid-cols-3',
  variant = 'standard'
}: PageMetaStripProps) {
  return (
    <div className={`meta-strip meta-strip-${variant} mt-6 grid gap-3 ${columnsClassName}`}>
      {items.map((item) => (
        <article key={`${item.label}-${item.value}`} className="meta-strip-card">
          {variant === 'standard' ? <p className="meta-strip-label">{item.label}</p> : null}
          <p className="meta-strip-value">{item.value}</p>
          {item.description ? <p className="meta-strip-description">{item.description}</p> : null}
        </article>
      ))}
    </div>
  );
}
