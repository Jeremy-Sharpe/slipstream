/* "[00:12] Sam: ..." / "Sam (0:12): ..." / "Sam (Eleno): ..." / "Sam: ..." are the
   lines the paste box accepts. A parenthetical that is not a timestamp is the
   speaker's company or role, which call-recording exports add to every label. */
const LINE = /^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?([A-Z][\w .'-]{1,40}?)(?:\s*\((?:(\d{1,2}:\d{2}(?::\d{2})?)|[^()]{1,60})\))?:\s*(.+)$/;

export type ParsedTurn = { speaker: string; text: string };

export function parseTranscript(text: string): { turns: ParsedTurn[]; speakers: string[] } {
  const matches = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(LINE))
    .filter((match): match is RegExpMatchArray => !!match);
  if (matches.length < 2) {
    return { turns: [{ speaker: "Prospect", text: text.trim() }], speakers: ["Prospect"] };
  }
  const turns = matches.map((match) => ({ speaker: match[2], text: match[4] }));
  return { turns, speakers: [...new Set(turns.map((turn) => turn.speaker))] };
}
