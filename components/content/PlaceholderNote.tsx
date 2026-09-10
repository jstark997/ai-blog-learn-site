/**
 * Marks scaffolding written by a coding agent so it cannot be mistaken for the
 * author's own writing (spec §3.1). Every placeholder page carries one; they
 * disappear as the real pages are built.
 */
export function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-lg border border-rule bg-surface p-4 text-sm text-muted">
      <p>
        <strong className="font-semibold text-ink">Placeholder.</strong> {children}
      </p>
    </aside>
  );
}
