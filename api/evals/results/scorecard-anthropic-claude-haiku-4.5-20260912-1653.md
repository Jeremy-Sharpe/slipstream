# Scorecard Eval

| call | outcome | discovery expected/got | next step expected/got | objection expected/got | talk ratio expected/got | latency ms | cost | parse retries |
|---|---|---:|---|---|---:|---:|---:|---:|
| call-01-northstar-labs | won | 6/5 | True/True | handled/handled | 0.44/0.44 | 14764 | $0.005940 | 0 |
| call-02-arcwell-health | won | 4/5 | True/True | handled/handled | 0.46/0.46 | 12753 | $0.006288 | 0 |
| call-03-afterglow-studio | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 9136 | $0.005895 | 0 |
| call-04-kite-and-co | stalled | 6/6 | False/False | partial/partial | 0.43/0.43 | 8606 | $0.005715 | 0 |
| call-05-craftwork | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 11018 | $0.006948 | 0 |
| call-06-meridian-ai | stalled | 3/3 | False/True | partial/handled | 0.51/0.51 | 7479 | $0.005272 | 0 |
| call-07-wattle-street-legal | won | 6/6 | True/True | handled/handled | 0.48/0.48 | 8874 | $0.006074 | 0 |
| call-08-elm-and-ledger-accounting | won | 6/5 | True/True | handled/handled | 0.47/0.47 | 7637 | $0.005541 | 0 |
| call-09-port-phillip-physio-group | won | 6/5 | True/True | handled/handled | 0.50/0.50 | 8543 | $0.005880 | 0 |
| call-10-lumen-lane-retail | lost | 0/0 | False/False | ignored/partial | 0.61/0.61 | 10205 | $0.006510 | 0 |
| call-11-banksia-architects | stalled | 6/5 | False/False | partial/handled | 0.47/0.47 | 8655 | $0.005686 | 0 |
| call-12-dockside-dental | no_show | 0/0 | False/False | none_raised/none_raised | 0.65/0.65 | 3339 | $0.002563 | 0 |

Summary: repeats=1; cases_per_repeat=12; discovery_tolerance=100.0%; discovery_exact=58.3%; next_step=91.7%; objection=58.3%; talk_ratio=100.0%; parse_failures=0; total_cost=$0.068312; mean_latency_ms=9250.75