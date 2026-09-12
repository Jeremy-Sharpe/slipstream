# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 6301 | $0.001980 | 0 |
| call-02-arcwell-health | won | 4/5 | True/True | handled/handled | 0.46/0.46 | 3343 | $0.001385 | 0 |
| call-03-afterglow-studio | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 5115 | $0.002209 | 0 |
| call-04-kite-and-co | stalled | 6/6 | False/True | partial/handled | 0.43/0.43 | 3289 | $0.001515 | 0 |
| call-05-craftwork | lost | 0/1 | False/False | ignored/partial | 0.61/0.61 | 4101 | $0.001748 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/False | partial/handled | 0.51/0.51 | 3255 | $0.001374 | 0 |
| call-07-wattle-street-legal | won | 6/5 | True/True | handled/handled | 0.48/0.48 | 3473 | $0.001367 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/5 | True/True | handled/handled | 0.47/0.47 | 3349 | $0.001441 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 3291 | $0.001405 | 0 |
| call-10-lumen-lane-retail | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 4133 | $0.001791 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/True | partial/handled | 0.47/0.47 | 3944 | $0.001507 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/True | none_raised/none_raised | 0.65/0.65 | 2865 | $0.000667 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=100.0%; discovery_exact=41.7%; next_step=75.0%; objection=50.0%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.018389; mean_latency_ms=3871.58