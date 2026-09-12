# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 3652 | $0.004751 | 0 |
| call-02-arcwell-health | won | 4/5 | True/True | handled/handled | 0.46/0.46 | 4122 | $0.005010 | 0 |
| call-03-afterglow-studio | lost | 0/1 | False/False | ignored/partial | 0.61/0.61 | 3401 | $0.004888 | 0 |
| call-04-kite-and-co | stalled | 6/6 | False/False | partial/handled | 0.43/0.43 | 3343 | $0.004450 | 0 |
| call-05-craftwork | lost | 0/1 | False/False | ignored/partial | 0.61/0.61 | 3208 | $0.004208 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/False | partial/partial | 0.51/0.51 | 3791 | $0.004975 | 0 |
| call-07-wattle-street-legal | won | 6/5 | True/True | handled/handled | 0.48/0.48 | 5392 | $0.004370 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/5 | True/True | handled/handled | 0.47/0.47 | 3476 | $0.004455 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 3183 | $0.004364 | 0 |
| call-10-lumen-lane-retail | lost | 0/1 | False/False | ignored/partial | 0.61/0.61 | 3616 | $0.004469 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/True | partial/handled | 0.47/0.47 | 3868 | $0.004813 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/True | none_raised/handled | 0.65/0.65 | 2127 | $0.002234 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=100.0%; discovery_exact=25.0%; next_step=83.3%; objection=50.0%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.052987; mean_latency_ms=3598.25