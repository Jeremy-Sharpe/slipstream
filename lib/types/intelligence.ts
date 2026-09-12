export type Outcome = "won" | "stalled" | "lost" | "no_show";
export type ObjectionHandling = "handled" | "partial" | "ignored";

export type CallRef = { id: string; company: string };

export type Tile = { label: string; value: string; delta: string };

/** One behaviour compared between winning and non-winning calls. Values are 0–1 shares of `max`. */
export type LensRow = {
  label: string;
  wins: { value: string; share: number };
  others: { value: string; share: number };
  takeaway: string;
};

export type IcpAttribute = {
  label: string;
  value: string;
  evidence: CallRef[];
};

export type Objection = {
  call: CallRef;
  outcome: Outcome;
  text: string;
  handling: ObjectionHandling;
};

export type TalkRatio = { call: CallRef; outcome: Outcome; rep: string; ratio: number };

export type NextStep = { call: CallRef; outcome: Outcome; description: string; due: string | null };

export type Trigger = { label: string; count: number; calls: CallRef[] };

export type Intelligence = {
  callsAnalysed: number;
  wonDeals: number;
  icpVersion: number;
  confidence: number;
  tiles: Tile[];
  lens: LensRow[];
  icp: { summary: string; attributes: IcpAttribute[] };
  objections: Objection[];
  talkRatios: TalkRatio[];
  nextSteps: NextStep[];
  triggers: Trigger[];
};
