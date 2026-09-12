"use client";

import { ArrowRightLeft, ListChecks, MessageSquareWarning, Mic, Target, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultBrief } from "@/lib/data/brief";
import type { Intelligence } from "@/lib/types/intelligence";
import { IntelligenceHeader } from "./IntelligenceHeader";
import { BriefCard, DerivedIcp, NextSteps, Objections, TalkRatio, Tiles, TrainingLens, Triggers } from "./sections";

const QUICK_LINKS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "patterns", label: "Win patterns", icon: ArrowRightLeft },
  { id: "icp", label: "Derived ICP", icon: Target },
  { id: "objections", label: "Objections", icon: MessageSquareWarning },
  { id: "talk-ratio", label: "Talk ratio", icon: Mic },
  { id: "next-steps", label: "Next steps", icon: ListChecks },
  { id: "triggers", label: "Triggers", icon: Zap },
];

/** Searchable text per section, so the header search can hide the ones that don't match. */
function sectionText(data: Intelligence): Record<string, string> {
  return {
    patterns: ["won-deal patterns training lens", ...data.lens.map((l) => `${l.label} ${l.takeaway}`)].join(" "),
    icp: ["derived icp ideal customer profile", data.icp.summary, ...data.icp.attributes.map((a) => `${a.label} ${a.value} ${a.evidence.map((e) => e.company).join(" ")}`)].join(" "),
    objections: ["objections", ...data.objections.map((o) => `${o.text} ${o.call.company}`)].join(" "),
    "talk-ratio": ["talk ratio", ...data.talkRatios.map((t) => `${t.call.company} ${t.rep}`)].join(" "),
    "next-steps": ["next steps", ...data.nextSteps.map((n) => `${n.description} ${n.call.company}`)].join(" "),
    triggers: ["triggers", ...data.triggers.map((t) => t.label)].join(" "),
    brief: `origami brief find more like these ${defaultBrief}`,
  };
}

export function IntelligenceView({ data }: { data: Intelligence }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>();
  const text = useMemo(() => sectionText(data), [data]);
  const q = query.trim().toLowerCase();
  const show = (id: string) => !q || text[id]?.toLowerCase().includes(q);
  const visibleCount = Object.keys(text).filter(show).length;

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setActive(undefined), 900);
    return () => window.clearTimeout(t);
  }, [active]);

  const jump = (id: string) => {
    setQuery("");
    setActive(id);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (data.callsAnalysed === 0) {
    return (
      <div className="px-11 pt-[34px]">
        <IntelligenceHeader query={query} onQuery={setQuery} />
        <p className="mt-[120px] text-center text-[16px] text-muted-foreground">Nothing analysed yet.</p>
      </div>
    );
  }

  return (
    <div className="px-11 pt-[34px] pb-16">
      <IntelligenceHeader query={query} onQuery={setQuery} />

      <p className="mt-[42px] text-[20px] font-semibold text-foreground">Quick links</p>
      <div className="mt-4 grid grid-cols-6 gap-5">
        {QUICK_LINKS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => jump(id)}
            className="flex h-[76px] cursor-pointer items-center gap-4 rounded-xl border border-border bg-page px-6 text-left text-[20px] font-semibold text-foreground transition-colors duration-150 hover:bg-muted active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Icon className="size-6 shrink-0 text-foreground" strokeWidth={1.5} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {visibleCount === 0 ? (
        <p className="mt-[120px] text-center text-[16px] text-muted-foreground">Nothing matches.</p>
      ) : (
        <div className="mt-[42px] flex flex-col gap-6">
          {!q && <Tiles data={data} />}
          {show("patterns") && <TrainingLens data={data} active={active} />}
          {show("icp") && <DerivedIcp data={data} active={active} />}
          {show("objections") && <Objections data={data} active={active} />}
          {show("talk-ratio") && <TalkRatio data={data} active={active} />}
          {show("next-steps") && <NextSteps data={data} active={active} />}
          {show("triggers") && <Triggers data={data} active={active} />}
          {show("brief") && <BriefCard brief={defaultBrief} active={active} />}
        </div>
      )}
    </div>
  );
}
