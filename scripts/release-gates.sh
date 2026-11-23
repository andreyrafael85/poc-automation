#!/usr/bin/env bash
# The release gates (AGENTS.md rule 3, README "Quality") on the current tree, in one run.
#
#   scripts/release-gates.sh <label>      e.g. v3413 — results in .visual-qa/<label>-*
#
# Runs typecheck, lint, the unit tests, analyze, the delivery build, the catalog doc, the harness exports (en,
# seeded), the harness routes in en (seeded) and in pt-BR, and prints one summary line per gate. It only reads and
# builds: no deploy, no tenant read (the harness runs on mocks).
set -u
LABEL=${1:?usage: scripts/release-gates.sh <label>}
cd "$(dirname "$0")/.." || exit 1
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
mkdir -p .visual-qa
LOG=.visual-qa/$LABEL-gates
mkdir -p "$LOG"

npm run -s typecheck >"$LOG/typecheck.log" 2>&1; echo "TYPE=$?"
npm run -s lint >"$LOG/lint.log" 2>&1; echo "LINT=$?"
npm test >"$LOG/test.log" 2>&1; echo "TEST=$?"; grep -E "Test Files|Tests " "$LOG/test.log"
npm run -s analyze >"$LOG/analyze.log" 2>&1; echo "ANALYZE=$?"
npm run -s build -- --optimize --enable-code-splitting >"$LOG/build.log" 2>&1; echo "BUILD=$?"
echo "DIST=$(find dist -type f | wc -l)"
grep -rlF "$HOME/" dist | head -3  # no local path may leak into the bundle
npm run -s docs:catalog 2>&1 | tail -1

node scripts/visual/capture.mjs --mode build --seed --exports --out ".visual-qa/$LABEL-exports" >".visual-qa/$LABEL-ex.log" 2>&1; echo "EX=$?"
grep -E "exports\] (ok|FAIL)" ".visual-qa/$LABEL-ex.log"
node scripts/visual/capture.mjs --mode build --seed --out ".visual-qa/$LABEL-en-routes" >".visual-qa/$LABEL-enr.log" 2>&1; echo "EN=$?"
PT="/?locale=pt-BR,/timeline?locale=pt-BR,/executive?locale=pt-BR,/report?locale=pt-BR,/wrapup?locale=pt-BR,/wrapup/prints?locale=pt-BR,/settings?locale=pt-BR,/settings?tab=dashboards&locale=pt-BR,/rca?locale=pt-BR,/problems?locale=pt-BR,/infrastructure?locale=pt-BR,/services?locale=pt-BR,/kubernetes?locale=pt-BR,/competitor?locale=pt-BR,/value?locale=pt-BR,/coverage?locale=pt-BR,/logs?locale=pt-BR,/security?locale=pt-BR,/experience?locale=pt-BR,/technologies?locale=pt-BR,/cloud?locale=pt-BR,/business?locale=pt-BR,/consumption?locale=pt-BR,/automation?locale=pt-BR,/opportunities?locale=pt-BR,/roadmap?locale=pt-BR,/licensing?locale=pt-BR,/assessment?locale=pt-BR,/adoption?locale=pt-BR,/ai-observability?locale=pt-BR,/builder?locale=pt-BR"
node scripts/visual/capture.mjs --mode build --seed --out ".visual-qa/$LABEL-ptbr-routes" --routes "$PT" >".visual-qa/$LABEL-ptr.log" 2>&1; echo "PT=$?"
for r in "$LABEL-en-routes" "$LABEL-ptbr-routes"; do
  node -e "const r=require('./.visual-qa/'+process.argv[1]+'/report.json');console.log(process.argv[1], Object.entries(r.summary).map(([k,v])=>k+' '+v.pass+'/'+v.warn+'/'+v.fail).join('; '))" "$r"
done
grep -E "FAIL: " ".visual-qa/$LABEL-enr.log" ".visual-qa/$LABEL-ptr.log" | head -20
echo "== gates done"
