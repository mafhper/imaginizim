interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <div className="mb-12 max-w-[760px]">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">{description}</p>
    </div>
  );
}
