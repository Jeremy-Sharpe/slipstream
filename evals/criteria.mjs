// Every scored criterion from docs/hackathon.md, as data. One LLM-judge
// scenario per entry (evals/judge-*.eval.mjs); docs/judging-evals.md is the
// human table and the criteria-doc-sync eval keeps the two from drifting.
//
// target: the score the team is building for. The judge passes a criterion
// only when its score is at or above target.
// judgedFrom: which submission artefacts the real judges score this from.
// inspect: what the LLM judge is told to read. Finals criteria are judged from
// the written pitch and demo script because a live pitch cannot be replayed.

export const CRITERIA = [
  {
    id: "T1",
    area: "Technical Excellence",
    name: "Functionality & Execution",
    points: 10,
    target: 8,
    judgedFrom: "Production URL, demo video, codebase",
    inspect:
      "Read _judge/production-url.md (the fetched live deployment) and the app code. Decide whether the product works end-to-end on the live URL over its data, whether any step is faked, hardcoded or only succeeds on one demo path, whether loading, empty and error states exist, and whether the README is upfront about known limitations.",
    bands: [
      "0-4: Mostly non-functional, static mockup, or breaks during the demo video.",
      "5-6: Partially working. Some steps are faked, hardcoded, or need a specific demo path to succeed.",
      "7-8: Works end-to-end with minor rough edges or known limitations the team is upfront about.",
      "9-10: Fully working, polished, handles edge cases gracefully, no visible bugs in the demo video.",
    ],
  },
  {
    id: "T2",
    area: "Technical Excellence",
    name: "Technical Difficulty",
    points: 8,
    target: 6,
    judgedFrom: "Codebase, README",
    inspect:
      "Read the AI pipeline code (transcript to draft, call scoring, ICP derivation, lookalike search) and the README architecture section. Look for multi-step reasoning, structured outputs, model chaining, embeddings or similarity search, and custom evaluation. A single prompt wrapped in a UI is band 3-4 at most.",
    bands: [
      "0-2: Little to no meaningful technical work.",
      "3-4: Mostly a wrapper on an existing tool/API with minimal custom logic.",
      "5-6: Reasonable technical effort beyond a basic API call, some original engineering.",
      '7-8: Sophisticated technical approach. The team clearly understands the "why" behind their architecture choices.',
    ],
  },
  {
    id: "T3",
    area: "Technical Excellence",
    name: "Code Quality & Architecture",
    points: 6,
    target: 5,
    judgedFrom: "Codebase, README",
    inspect:
      "Survey the repository layout, module boundaries, file sizes, duplication and naming. Check the README documents what the app does, how to run it, the architecture and why the framework and tooling were chosen. Comments should exist only where code is not self-explanatory.",
    bands: [
      "0-2: Disorganised, undocumented, or a single monolithic file with no structure.",
      "3-4: Reasonably organised but with some clutter, duplication, or missing documentation.",
      "5-6: Clean, modular, well-documented.",
    ],
  },
  {
    id: "T4",
    area: "Technical Excellence",
    name: "Use of Data / Models",
    points: 6,
    target: 5,
    judgedFrom: "Codebase, README",
    inspect:
      "Find every model call and the README model-choices section. Check each model choice is justified on size, cost and latency versus accuracy, that the fixture data is handled thoughtfully (variety of outcomes, quality), and that some evaluation of output quality exists, even informal spot checks recorded in the repo.",
    bands: [
      "0-2: Model/data used without consideration of fit, quality, or limitations.",
      "3-4: Reasonable choices but limited justification or evaluation.",
      "5-6: Deliberate model/data choices with clear reasoning and some form of evaluation.",
    ],
  },
  {
    id: "I1",
    area: "Innovation",
    name: "Originality of Idea",
    points: 10,
    target: 7,
    judgedFrom: "README, demo video, production URL",
    inspect:
      "Read the README problem and solution sections and the live app. Judge whether this is a known problem approached from a genuinely new angle, or a clone of an existing call recorder or CRM AI add-on with a minor twist.",
    bands: [
      "0-4: Direct clone of an existing well-known product/tool with no meaningful change.",
      "5-6: Familiar idea, minor twist.",
      "7-8: Solid original spin on an existing concept.",
      "9-10: Genuinely fresh idea or a well-known problem reframed in a surprising way.",
    ],
  },
  {
    id: "I2",
    area: "Innovation",
    name: "Creativity in Solution Design",
    points: 8,
    target: 6,
    judgedFrom: "Production URL, codebase, README",
    inspect:
      "Look at how AI is used across the product surfaces. Does the AI feel genuinely useful and woven into the workflow, or bolted on as a chat box? Look for distinctive design choices and creative use of the 48-hour constraint (for example synthesised call fixtures).",
    bands: [
      "0-4: Generic, template-like solution design with no distinctive choices.",
      "5-6: Some creative elements, but largely conventional design.",
      "7-8: Creative, well-considered design decisions throughout the solution.",
    ],
  },
  {
    id: "I3",
    area: "Innovation",
    name: "Differentiation",
    points: 7,
    target: 6,
    judgedFrom: "README, demo video",
    inspect:
      "Find where the README names existing alternatives (call recorders, conversation intelligence tools, CRM AI features, sales coaching tools) and states specifically why Slipstream is different or better. Vague or absent comparison scores in the low bands.",
    bands: [
      "0-2: No apparent awareness of existing solutions, or no real differentiation.",
      "3-5: Some awareness of alternatives, differentiation is vague or partial.",
      "6-7: Sharp, well-researched articulation of what sets them apart.",
    ],
  },
  {
    id: "B1",
    area: "Business Value & Application",
    name: "Problem Significance",
    points: 8,
    target: 7,
    judgedFrom: "README, demo video",
    inspect:
      "Check the README names a specific target user or customer segment, defines the problem clearly and shows evidence the team understands the pain point (what it costs them today, how they cope now). A generic audience scores 5-6 at most.",
    bands: [
      "0-4: Vague or unconvincing problem, unclear who actually has this problem.",
      "5-6: Reasonable problem statement, audience is somewhat generic.",
      "7-8: Sharp, well-evidenced problem statement with a clearly identified audience.",
    ],
  },
  {
    id: "B2",
    area: "Business Value & Application",
    name: "Feasibility & Viability",
    points: 8,
    target: 6,
    judgedFrom: "README",
    inspect:
      "Check the README gives a realistic path from demo to product: cost per call or per user, which CRM and phone integrations come first and how, data access and privacy of call recordings, and an adoption path. Unaddressed practical concerns cap the score at 5-6.",
    bands: [
      "0-4: No real consideration of how this would work outside the hackathon bubble.",
      "5-6: Some feasibility thinking, but with gaps or unaddressed practical concerns.",
      "7-8: Credible, well-thought-out path to real-world deployment; costs and constraints acknowledged.",
    ],
  },
  {
    id: "B3",
    area: "Business Value & Application",
    name: "Impact & Value Proposition",
    points: 9,
    target: 7,
    judgedFrom: "README, demo video, production URL",
    inspect:
      "Check the README states the specific value delivered (time saved per call, follow-ups sent, deals influenced, cost reduced) with at least a rough estimate and says who benefits and by how much. Generic or unquantified value scores 0-4.",
    bands: [
      "0-4: Value proposition is generic, hand-wavy, or missing.",
      "5-7: Clear value proposition but lacking specificity or evidence.",
      "8-9: Compelling, specific, at least semi-quantified value proposition.",
    ],
  },
  {
    id: "F1",
    area: "Finals: Presentation & Communication",
    name: "Clarity of Pitch",
    points: 6,
    target: 5,
    judgedFrom: "Live pitch (judged here from docs/pitch.md)",
    inspect:
      "Read docs/pitch.md, the written pitch script. Check it follows problem, solution, how it works, why it matters, fits 3 to 5 minutes spoken (roughly 400 to 700 words), and has no unexplained jargon. If the file is missing, score 0 and say so.",
    bands: [
      "0-2: Confusing, unstructured, or the core idea never becomes clear.",
      "3-4: Understandable but disorganised, rushed, or overly technical in places.",
      "5-6: Crisp, well-structured, and accessible pitch that lands within time.",
    ],
  },
  {
    id: "F2",
    area: "Finals: Presentation & Communication",
    name: "Live Demo Quality",
    points: 8,
    target: 7,
    judgedFrom: "Live demo (judged here from docs/demo-script.md and the production URL)",
    inspect:
      "Read docs/demo-script.md, the step-by-step live demo script, and _judge/production-url.md. Check the script leads with the most differentiating feature, every step maps to something the live app can do, it proves the claims made in the pitch, and it has a fallback for failures. If the file is missing, score 0 and say so.",
    bands: [
      "0-4: Demo fails, is skipped, or doesn't actually show the product working.",
      "5-6: Functional demo with some fumbling or unclear moments.",
      "7-8: Slick, confident, clearly shows the product working and proves the key claims.",
    ],
  },
  {
    id: "F3",
    area: "Finals: Presentation & Communication",
    name: "Team Engagement & Q&A",
    points: 6,
    target: 5,
    judgedFrom: "Live Q&A (judged here from the Q&A section of docs/pitch.md)",
    inspect:
      "Read the Q&A preparation section of docs/pitch.md. Check it lists the hard questions judges will ask (accuracy, privacy of recordings, CRM integration, cost, what is mocked), gives direct specific answers, assigns questions across team members, and is honest about limitations. If the section is missing, score 0 and say so.",
    bands: [
      "0-2: Struggles to answer basic questions about their own project.",
      "3-4: Adequate answers but reliant on one team member, or some vagueness under pressure.",
      "5-6: Confident, specific answers; clear shared understanding across the team.",
    ],
  },
];

export function criterion(id) {
  const found = CRITERIA.find((c) => c.id === id);
  if (!found) throw new Error(`unknown criterion ${id}`);
  return found;
}
