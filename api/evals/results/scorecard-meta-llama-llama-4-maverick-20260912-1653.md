# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 6548 | $0.000823 | 0 |
| call-02-arcwell-health | won | 4/5 | True/True | handled/handled | 0.46/0.46 | 6491 | $0.000835 | 0 |
| call-03-afterglow-studio | lost | 0/9 | False/False | ignored/handled | 0.61/0.61 | 55211 | $0.004784 | 1 |
| call-04-kite-and-co | stalled | 6/6 | False/False | partial/handled | 0.43/0.43 | 6398 | $0.000819 | 0 |
| call-05-craftwork | lost | 0/2 | False/False | ignored/handled | 0.61/0.61 | 5475 | $0.000702 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/True | partial/handled | 0.51/0.51 | 49492 | $0.004409 | 1 |
| call-07-wattle-street-legal | won | 6/5 | True/True | handled/handled | 0.48/0.48 | 5559 | $0.000745 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/5 | True/True | handled/handled | 0.47/0.47 | 5702 | $0.000741 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 5683 | $0.000717 | 0 |
| call-10-lumen-lane-retail | lost | 0/8 | False/False | ignored/partial | 0.61/0.61 | 18793 | $0.001002 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/False | partial/handled | 0.47/0.47 | 5377 | $0.000719 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/True | none_raised/none_raised | 0.65/0.65 | 2425 | $0.000327 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=75.0%; discovery_exact=25.0%; next_step=83.3%; objection=50.0%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.016623; mean_latency_ms=14429.50