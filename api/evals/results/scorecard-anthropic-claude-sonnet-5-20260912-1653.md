# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 18432 | $0.023944 | 0 |
| call-02-arcwell-health | won | 4/5 | True/True | handled/handled | 0.46/0.46 | 19145 | $0.026082 | 0 |
| call-03-afterglow-studio | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 65951 | $0.074850 | 1 |
| call-04-kite-and-co | stalled | 6/6 | False/True | partial/handled | 0.43/0.43 | 23427 | $0.030082 | 0 |
| call-05-craftwork | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 25265 | $0.029042 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/False | partial/partial | 0.51/0.51 | 23747 | $0.028128 | 0 |
| call-07-wattle-street-legal | won | 6/5 | True/True | handled/handled | 0.48/0.48 | 19381 | $0.026792 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/5 | True/True | handled/handled | 0.47/0.47 | 15800 | $0.022438 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 19142 | $0.025852 | 0 |
| call-10-lumen-lane-retail | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 20892 | $0.027294 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/False | partial/handled | 0.47/0.47 | 21576 | $0.028430 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/True | none_raised/none_raised | 0.65/0.65 | 11308 | $0.013760 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=100.0%; discovery_exact=50.0%; next_step=83.3%; objection=58.3%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.356694; mean_latency_ms=23672.17