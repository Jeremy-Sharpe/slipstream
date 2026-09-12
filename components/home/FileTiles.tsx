/* Three portrait file cards fanned above the drop zone: video (ink), audio
   (tangerine), music (warm grey). Each card is one SVG path with the
   top-right corner cut off; the fold is a lighter triangle on that diagonal.
   No strokes: overlap reads from the colour difference. `lifted` opens the
   fan by 3° on drag-over. */

const W = 44, H = 54, R = 8, CUT = 14;

// Pentagon with three rounded corners and a diagonal cut at the top right.
const FILE = `M ${R} 0 H ${W - CUT} L ${W} ${CUT} V ${H - R} Q ${W} ${H} ${W - R} ${H} H ${R} Q 0 ${H} 0 ${H - R} V ${R} Q 0 0 ${R} 0 Z`;
// The fold: right triangle on the cut, with a small rounded outer corner.
const FOLD = `M ${W - CUT} 0 V ${CUT - 3} Q ${W - CUT} ${CUT} ${W - CUT + 3} ${CUT} H ${W} Z`;

function Card({ fill, fold, rot, lift, z, raise = 0, children }: { fill: string; fold: string; rot: number; lift: boolean; z: number; raise?: number; children: React.ReactNode }) {
  const r = rot + Math.sign(rot) * (lift ? 3 : 0);
  return (
    <span
      className="relative flex shrink-0 items-center justify-center text-white"
      style={{ width: W, height: H, zIndex: z, marginBottom: raise, transform: `rotate(${r}deg)`, transformOrigin: "50% 100%", transition: "transform 200ms cubic-bezier(0.23,1,0.32,1)" }}
    >
      <svg aria-hidden className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={FILE} fill={fill} />
        <path d={FOLD} fill={fold} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

export function FileTiles({ lifted = false }: { lifted?: boolean }) {
  return (
    <div aria-hidden className="flex h-16 items-end justify-center" style={{ animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" }}>
      <Card fill="#181925" fold="#3a3b4a" rot={-12} lift={lifted} z={1}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10-6.5z" /></svg>
      </Card>
      <span className="-mx-3 flex" style={{ zIndex: 3 }}>
        <Card fill="#FF6847" fold="#FF8D74" rot={0} lift={lifted} z={3} raise={6}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 10v4" /><path d="M8 7v10" /><path d="M12 4v16" /><path d="M16 7v10" /><path d="M20 10v4" /></svg>
        </Card>
      </span>
      <Card fill="#5B5B66" fold="#75757f" rot={12} lift={lifted} z={2}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>
      </Card>
    </div>
  );
}
