#!/bin/zsh
# axe-core WCAG 2.2 AA sweep over every demo + showcase page.
#
# Prereqs: `npm run build`, a static server on :8765 serving www/
# (python3 -m http.server 8765 -d www), and playwright-cli on PATH.
# axe.min.js is fetched into www/ on first run (kept out of git).
#
# Usage: scripts/axe-audit.sh [results.jsonl]
# Exit code 1 when any page has violations — CI-ready.
set -u
OUT="${1:-/tmp/axe-results.jsonl}"
: > "$OUT"
BASE="http://localhost:8765"

if [ ! -f www/axe.min.js ]; then
  curl -sL https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js -o www/axe.min.js
fi

pages=()
for f in src/demos/*.html; do
  [ "$(basename $f)" = "_shared.js" ] && continue
  pages+=("/demos/$(basename $f)")
done
for d in src/showcases/*/; do pages+=("/showcases/$(basename $d)/"); done

playwright-cli close >/dev/null 2>&1
playwright-cli open "$BASE${pages[1]}" >/dev/null 2>&1

fail=0
for p in "${pages[@]}"; do
  playwright-cli goto "$BASE$p" >/dev/null 2>&1
  result=$(playwright-cli --raw eval "(async () => {
    await new Promise(r => setTimeout(r, 900));
    if (!window.axe) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = '/axe.min.js'; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] },
    });
    return JSON.stringify(r.violations.map(v => ({
      id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
      sample: v.nodes.slice(0,3).map(n => n.target.join(' ').slice(0,120)),
    })));
  })()" 2>/dev/null)
  echo "{\"page\": \"$p\", \"violations\": ${result:-\"ERROR\"}}" >> "$OUT"
  if [ "$result" != "[]" ]; then
    fail=1
    echo "FAIL $p"
    echo "  $result"
  else
    echo "ok   $p"
  fi
done
playwright-cli close >/dev/null 2>&1
exit $fail
