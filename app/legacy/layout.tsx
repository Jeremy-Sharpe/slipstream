import "./legacy.css";

// Everything under /legacy is the previous (Clay-style) UI, kept for
// evidence. Its tokens, fonts and zoom are scoped by legacy.css to the body
// that contains .legacy-root, so the product UI at / is untouched. The old
// shells live one level down: app/legacy/(app)/layout.tsx (sidebar + top bar)
// and the leads/lists layouts, exactly as they were at the root.
export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return <div className="legacy-root min-h-screen">{children}</div>;
}
