# csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/rikisanjaya67/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/rikisanjaya67/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's own csv-reader 1.0.0 that answers exactly as it does on every case. Entry for make.fun's "Read broken CSV files faster, 21 November 2026" bounty: `solve.js` reads each CSV text once, left to right, with the same broken-row policy as the reference (BOM dropped, stray CRs dropped, quoted fields with doubled quotes and line breaks inside, unterminated quotes read again as unquoted, short and long rows recorded), but scans with `indexOf` jumps instead of one character at a time. On the practice set it answers all 6 cases exactly, in about 0.9 seconds end to end where the house baseline takes about 1.6 seconds.

## Run it

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=csv-reader-speed-01-run-20261121-kit/practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards
