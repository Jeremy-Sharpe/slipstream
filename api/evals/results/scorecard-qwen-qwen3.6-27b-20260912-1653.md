# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 99137 | $0.007621 | 0 |
| call-02-arcwell-health | failed | 4/- | True/- | handled/- | 0.46/- | 0 | $0.000000 | 1 |
| call-03-afterglow-studio | lost | 0/0 | False/False | ignored/ignored | 0.61/0.61 | 52808 | $0.013105 | 0 |
| call-04-kite-and-co | failed | 6/- | False/- | partial/- | 0.43/- | 0 | $0.000000 | 1 |
| call-05-craftwork | failed | 0/- | False/- | ignored/- | 0.61/- | 0 | $0.000000 | 1 |
| call-06-meridian-ai | failed | 3/- | False/- | partial/- | 0.51/- | 0 | $0.000000 | 1 |
| call-07-wattle-street-legal | failed | 6/- | True/- | handled/- | 0.48/- | 0 | $0.000000 | 1 |
| call-08-elm-and-ledger-accounting | failed | 6/- | True/- | handled/- | 0.47/- | 0 | $0.000000 | 1 |
| call-09-port-phillip-physio-group | failed | 6/- | True/- | handled/- | 0.50/- | 0 | $0.000000 | 1 |
| call-10-lumen-lane-retail | failed | 0/- | False/- | ignored/- | 0.61/- | 0 | $0.000000 | 1 |
| call-11-banksia-architects | failed | 6/- | False/- | partial/- | 0.47/- | 0 | $0.000000 | 1 |
| call-12-dockside-dental | no_show | 0/0 | False/False | none_raised/none_raised | 0.65/0.65 | 172182 | $0.020033 | 1 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=25.0%; discovery_exact=16.7%; next_step=25.0%; objection=25.0%; talk_ratio=25.0%; parse_failures=9; total_cost=$0.040759; mean_latency_ms=27010.58