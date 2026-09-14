import Link from "next/link";

/* The front door at "/": one screen, no scroll. Headline, one line, one
   button into the product. The shell (sidebar, frame) is not rendered here. */

const APP = "/home";

export function Landing() {
  return (
    <div className="landing relative grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden bg-white px-5 text-ink sm:px-12">
      <style>{`
        .landing::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .55;
          background-image: radial-gradient(#d9d9dc 1px, transparent 1px); background-size: 24px 24px;
          -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 50%, #000 20%, transparent 100%);
          mask-image: radial-gradient(ellipse 60% 55% at 50% 50%, #000 20%, transparent 100%);
        }
        .landing .rise { opacity: 0; transform: translateY(12px); animation: landing-rise 700ms cubic-bezier(0.23,1,0.32,1) forwards; }
        .landing .d1 { animation-delay: 60ms; } .landing .d2 { animation-delay: 160ms; } .landing .d3 { animation-delay: 280ms; } .landing .d4 { animation-delay: 400ms; } .landing .d5 { animation-delay: 520ms; }
        @keyframes landing-rise { to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .landing .rise { animation: none; opacity: 1; transform: none; } }
      `}</style>

      <nav className="rise d1 relative flex h-16 items-center justify-between">
        <span className="inline-flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/slipstream-mark.svg" alt="" className="size-[26px] rounded-[7px]" />
          Slipstream
        </span>
        <Link href={APP} className="text-[13.5px] font-medium text-soft transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-full px-1">
          Open Slipstream
        </Link>
      </nav>

      <main className="relative flex flex-col items-center justify-center pb-[6vh] text-center">
        <span className="rise d2 mb-7 inline-flex h-7 items-center gap-2 rounded-full bg-surface px-3 text-[12.5px] font-medium text-soft">
          <i aria-hidden className="size-1.5 rounded-full bg-accent" />
          Your CRM, written by the call
        </span>
        <h1 className="rise d3 m-0 max-w-[24ch] text-[clamp(38px,6.2vw,76px)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink [text-wrap:balance]">
          Your best customers already told you who&rsquo;s next.
        </h1>
        <p className="rise d4 mt-6 max-w-[54ch] text-[clamp(16px,1.45vw,19px)] leading-[1.5] text-text [text-wrap:balance]">
          Slipstream turns every sales call into the leads that look like the deals you closed, with the first email already written.
        </p>
        <Link
          href={APP}
          className="rise d5 group mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-[22px] text-[15px] font-medium text-accent-ink transition-colors duration-150 hover:bg-[#ff7d61] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/35"
        >
          Open Slipstream
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
        <p className="rise d5 mt-4 text-[13px] text-faint">Nothing is ever sent without a human.</p>
      </main>

      <footer className="rise d5 relative flex h-14 items-center justify-between text-[12.5px] text-faint">
        <span>Slipstream</span>
        <span className="hidden sm:inline">Forward: AI in Business · Melbourne 2026</span>
      </footer>
    </div>
  );
}
