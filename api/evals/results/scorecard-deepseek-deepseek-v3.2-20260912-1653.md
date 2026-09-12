# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 24295 | $0.000693 | 0 |
| call-02-arcwell-health | won | 4/5 | True/True | handled/handled | 0.46/0.46 | 23769 | $0.000689 | 0 |
| call-03-afterglow-studio | lost | 0/0 | False/False | ignored/ignored | 0.61/0.61 | 17466 | $0.000466 | 0 |
| call-04-kite-and-co | stalled | 6/6 | False/False | partial/partial | 0.43/0.43 | 26417 | $0.000719 | 0 |
| call-05-craftwork | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 22589 | $0.000505 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/False | partial/partial | 0.51/0.51 | 10497 | $0.000905 | 0 |
| call-07-wattle-street-legal | won | 6/5 | True/True | handled/handled | 0.48/0.48 | 10366 | $0.000895 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/5 | True/True | handled/handled | 0.47/0.47 | 22085 | $0.000486 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 19091 | $0.000646 | 0 |
| call-10-lumen-lane-retail | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 7177 | $0.000555 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/False | partial/handled | 0.47/0.47 | 21483 | $0.000679 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/True | none_raised/none_raised | 0.65/0.65 | 3676 | $0.000165 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=100.0%; discovery_exact=50.0%; next_step=91.7%; objection=75.0%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.007403; mean_latency_ms=17409.25