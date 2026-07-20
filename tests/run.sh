#!/bin/bash
# Extracts the <script> from dnd-companion.html and runs the test suite.
set -e
cd "$(dirname "$0")"
python3 - <<'PY'
import re
html = open("../dnd-companion.html").read()
js = re.search(r"<script>(.*)</script>", html, re.S).group(1)
stubs = ("globalThis.localStorage={getItem:()=>null,setItem:()=>{}};"
         "globalThis.confirm=()=>true;globalThis.alert=()=>{};\n")
open(".app.extracted.js", "w").write(js)
open(".engine.combined.js", "w").write(stubs + js + "\n" + open("engine.test.body.js").read())
PY
node --check .app.extracted.js && echo "syntax OK"
node .engine.combined.js
if [ -d node_modules/jsdom ]; then
  node ui.test.js
else
  echo "(ui.test.js skipped — run 'npm install' in tests/ to get jsdom)"
fi
