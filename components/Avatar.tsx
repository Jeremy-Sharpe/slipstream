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
