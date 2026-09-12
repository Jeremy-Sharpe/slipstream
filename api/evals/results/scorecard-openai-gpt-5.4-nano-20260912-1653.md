# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 4361 | $0.000932 | 0 |
| call-02-arcwell-health | won | 4/4 | True/True | handled/handled | 0.46/0.46 | 6523 | $0.001141 | 0 |
| call-03-afterglow-studio | lost | 0/14 | False/False | ignored/handled | 0.61/0.61 | 5716 | $0.001717 | 0 |
| call-04-kite-and-co | stalled | 6/6 | False/True | partial/none_raised | 0.43/0.43 | 4971 | $0.001134 | 0 |
| call-05-craftwork | lost | 0/3 | False/False | ignored/handled | 0.61/0.61 | 5241 | $0.001364 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/False | partial/partial | 0.51/0.51 | 3525 | $0.001068 | 0 |
| call-07-wattle-street-legal | won | 6/6 | True/True | handled/handled | 0.48/0.48 | 3472 | $0.001115 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/6 | True/True | handled/handled | 0.47/0.47 | 3993 | $0.001252 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 3705 | $0.001110 | 0 |
| call-10-lumen-lane-retail | lost | 0/0 | False/False | ignored/ignored | 0.61/0.61 | 2970 | $0.000979 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/False | partial/none_raised | 0.47/0.47 | 3610 | $0.001149 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/False | none_raised/none_raised | 0.65/0.65 | 2419 | $0.000611 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=83.3%; discovery_exact=58.3%; next_step=91.7%; objection=66.7%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.013572; mean_latency_ms=4208.83