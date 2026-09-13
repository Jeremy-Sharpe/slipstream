export type RateScenario = {
  volume: number;
  baselineRate: number;
  scenarioRate: number;
};

export function rateScenario({ volume, baselineRate, scenarioRate }: RateScenario): {
  baselineOutcomes: number;
  scenarioOutcomes: number;
  additionalOutcomes: number;
} {
  const baselineOutcomes = volume * baselineRate;
  const scenarioOutcomes = volume * scenarioRate;
  return { baselineOutcomes, scenarioOutcomes, additionalOutcomes: scenarioOutcomes - baselineOutcomes };
}
