---
description: Audit cohesion across all files — tool counts, source counts, tier details must match everywhere
---

## Current tool count from source

!`cd "$PWD" && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node --env-file=.env dist/index.js 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.result.tools.length+' tools registered')"`

## Counts in index.html

!`grep -n "data-count\|tools\|sources\|28\|27\|eight\|Eight\|five\|Five" index.html | grep -iv "style\|font\|weight\|height\|line\|width\|display\|padding\|margin\|border\|color\|opacity\|radius\|shadow\|background\|transition\|cursor"`

## Counts in README.md

!`grep -n "tool\|source\|28\|27\|eight\|five" README.md | head -20`

## Counts in package.json

!`grep -n "description" package.json`

## Counts in twitter threads

!`grep -n "tool\|source\|28\|27" "C:/Users/skoob/OneDrive/Desktop/fathom-internal/twitter-threads.md" 2>/dev/null | head -20`

## Counts in X article

!`grep -n "tool\|source\|28\|27" "C:/Users/skoob/OneDrive/Desktop/fathom-internal/x-article.md" 2>/dev/null | head -20`

---

Review ALL of the above. Flag any mismatch between the actual registered tool count and what's stated in any file. Fix every mismatch found.
