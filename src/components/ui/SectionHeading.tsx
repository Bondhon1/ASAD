import { cn } from '@/lib/cn';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, align = 'left', className }: SectionHeadingProps) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', 'animate-rise', className)}>
      {eyebrow && (
        <p className="eyebrow text-xs font-semibold text-primary">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base text-muted leading-relaxed">{description}</p>
      )}
    </div>
  );
}
