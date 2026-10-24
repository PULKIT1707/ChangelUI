/** Decorative four-point sparkle used by Developer's Pick (sidebar link, featured badge, headings). */
export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0.75c.3 2.9 1.4 5 4.95 5.4l.3.05-.3.05C9.4 6.65 8.3 8.75 8 11.65 7.7 8.75 6.6 6.65 3.05 6.25L2.75 6.2l.3-.05C6.6 5.75 7.7 3.65 8 .75Zm4.5 9.5c.15 1.35.65 2.3 2.25 2.5-1.6.2-2.1 1.15-2.25 2.5-.15-1.35-.65-2.3-2.25-2.5 1.6-.2 2.1-1.15 2.25-2.5Z" />
    </svg>
  );
}
