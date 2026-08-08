import type { LucideIcon } from "lucide-react";

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

interface LegalPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}

export function LegalPage({
  icon: Icon,
  title,
  description,
  updatedAt,
  sections,
}: LegalPageProps) {
  return (
    <section className="mx-auto max-w-3xl animate-fade-in space-y-6 pb-8">
      <header className="overflow-hidden rounded-3xl border border-primary/10 bg-card p-6 shadow-card md:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary/70">
          XingTone Legal
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/60 md:text-base">
          {description}
        </p>
        <p className="mt-5 text-xs text-foreground/40">最后更新：{updatedAt}</p>
      </header>

      <div className="space-y-4">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
          >
            <h2 className="mb-3 text-base font-semibold md:text-lg">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="mb-3 text-sm leading-7 text-foreground/65 last:mb-0"
              >
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="space-y-2 text-sm leading-7 text-foreground/65">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
