// Deterministic two-stop gradient disc per person, no initials.
const GRADIENTS: [string, string][] = [
  ["#3b82f6", "#ec4899"], ["#f59e0b", "#8b5cf6"], ["#06b6d4", "#d946ef"], ["#14b8a6", "#6366f1"],
  ["#facc15", "#ef4444"], ["#22c55e", "#3b82f6"], ["#fb923c", "#ec4899"], ["#a855f7", "#84cc16"],
  ["#ec4899", "#7c3aed"], ["#fbbf24", "#fb7185"], ["#8b5cf6", "#06b6d4"], ["#f97316", "#22c55e"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = 28, className = "" }: { name: string; size?: number; className?: string }) {
  const [a, b] = GRADIENTS[hash(name) % GRADIENTS.length];
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 25%, ${a}, transparent 72%), linear-gradient(140deg, ${a}, ${b})` }}
    />
  );
}

// Tinted initial tile per company: eight fixed pastel pairs.
const TILES = [
  { bg: "#eef2ff", text: "#4f46e5" }, { bg: "#f0fdf4", text: "#16a34a" }, { bg: "#fef3c7", text: "#b45309" }, { bg: "#fce7f3", text: "#be185d" },
  { bg: "#f1f5f9", text: "#475569" }, { bg: "#ecfeff", text: "#0e7490" }, { bg: "#faf5ff", text: "#7c3aed" }, { bg: "#fff1f2", text: "#be123c" },
];

export function CompanyTile({ name, size = 28, className = "" }: { name: string; size?: number; className?: string }) {
  const c = TILES[hash(name) % TILES.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundColor: c.bg, color: c.text }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
