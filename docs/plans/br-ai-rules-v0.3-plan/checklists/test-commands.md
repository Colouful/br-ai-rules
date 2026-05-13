# V0.3 Test Commands

## Base Quality

```bash
cd /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules

npm install
npm run typecheck
npm test
npm run build
```

## V0.2 Regression

```bash
TEST_DIR="/tmp/br-ai-rules-v03-v02-regression"
CLI="/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js"

rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

node "$CLI" init --stack vue,typescript
node "$CLI" check
node "$CLI" list --assets
node "$CLI" diff
```

## V0.3 Local Source Smoke

```bash
TEST_DIR="/tmp/br-ai-rules-v03-source-smoke"
SOURCE_DIR="/tmp/br-ai-rules-v03-team-source"
CLI="/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js"
REPO="/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules"

rm -rf "$TEST_DIR" "$SOURCE_DIR"
mkdir -p "$TEST_DIR"

cp -R "$REPO/examples/team-source" "$SOURCE_DIR"

cd "$TEST_DIR"

node "$CLI" init --stack spring-boot,java,mysql,redis --source "$SOURCE_DIR" --asset team.backend-standard
node "$CLI" check
node "$CLI" source list
node "$CLI" asset list
node "$CLI" diff

grep -n "禁止直接抛出 RuntimeException" AGENTS.md
grep -n "鉴权变更必须确认影响范围" CLAUDE.md
grep -n "接口字段说明必须中文" .cursor/rules/ai-coding.mdc
cat .ai-rules/generated.json | grep "team-ai-rules"
```

## Source Change Diff

```bash
echo "\n    V0.3 diff test marker." >> "$SOURCE_DIR/rules/team.no-raw-exception.yaml"

cd "$TEST_DIR"
node "$CLI" diff
```

Expected: diff shows generated files would change.

## Broken Source Test

```bash
BROKEN_SOURCE="/tmp/br-ai-rules-v03-broken-source"
BROKEN_TEST="/tmp/br-ai-rules-v03-broken-test"

rm -rf "$BROKEN_SOURCE" "$BROKEN_TEST"
cp -R "$REPO/examples/team-source" "$BROKEN_SOURCE"
mkdir -p "$BROKEN_TEST"

python3 - <<'PY'
from pathlib import Path
p = Path("/tmp/br-ai-rules-v03-broken-source/assets/team.backend-standard.yaml")
s = p.read_text()
s = s.replace("team.no-raw-exception", "team.missing-rule")
p.write_text(s)
PY

cd "$BROKEN_TEST"
node "$CLI" init --source "$BROKEN_SOURCE" --asset team.backend-standard
```

Expected: clear error about missing rule.
