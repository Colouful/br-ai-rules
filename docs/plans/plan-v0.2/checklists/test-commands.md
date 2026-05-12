# BR AI Rules V0.2 测试命令

## 1. 基础测试

```bash
npm install
npm run typecheck
npm test
npm run build
node dist/cli.js --help
```

## 2. React 项目端到端

```bash
ROOT="$(pwd)"
rm -rf /tmp/br-ai-rules-react-demo
mkdir -p /tmp/br-ai-rules-react-demo
cd /tmp/br-ai-rules-react-demo
node "$ROOT/dist/cli.js" init --stack react,typescript
node "$ROOT/dist/cli.js" check
node "$ROOT/dist/cli.js" list --assets
find . -maxdepth 4 -type f | sort
cat .ai-rules/config.json
cat AGENTS.md
cat CLAUDE.md
cat .cursor/rules/ai-coding.mdc
cat .ai-rules/generated.json
```

## 3. Spring Boot 项目端到端

```bash
ROOT="/你的/br-ai-rules/绝对路径"
rm -rf /tmp/br-ai-rules-spring-demo
mkdir -p /tmp/br-ai-rules-spring-demo
cd /tmp/br-ai-rules-spring-demo
node "$ROOT/dist/cli.js" init --stack spring-boot,java,mysql,redis
node "$ROOT/dist/cli.js" check
node "$ROOT/dist/cli.js" list --assets
find . -maxdepth 4 -type f | sort
cat .ai-rules/config.json
cat AGENTS.md
cat CLAUDE.md
cat .cursor/rules/ai-coding.mdc
cat .ai-rules/generated.json
```

## 4. 自定义规则测试

```bash
ROOT="/你的/br-ai-rules/绝对路径"
rm -rf /tmp/br-ai-rules-custom-demo
mkdir -p /tmp/br-ai-rules-custom-demo
cd /tmp/br-ai-rules-custom-demo
node "$ROOT/dist/cli.js" init --stack react,typescript
node "$ROOT/dist/cli.js" add team.no-auto-dependency --category dependency
python3 - <<'PY'
from pathlib import Path
p = Path('.ai-rules/rules/team.no-auto-dependency.yaml')
s = p.read_text()
s = s.replace('TODO: 规则名称', '禁止自动新增依赖')
s = s.replace('TODO: 在这里填写团队规则内容。', '不允许在未明确说明原因并获得确认前新增依赖。')
p.write_text(s)
PY
node "$ROOT/dist/cli.js" check
node "$ROOT/dist/cli.js" sync
node "$ROOT/dist/cli.js" list --custom
grep -R "禁止自动新增依赖" .
```

## 5. managed block 保护测试

```bash
cat >> CLAUDE.md <<'CUSTOM_EOF'

## Team Custom Rules
这里是团队自定义内容，sync 后必须保留。
CUSTOM_EOF
node "$ROOT/dist/cli.js" sync
grep -n "这里是团队自定义内容" CLAUDE.md
```

## 6. 漂移检测测试

```bash
python3 - <<'PY'
from pathlib import Path
p = Path('AGENTS.md')
s = p.read_text()
s = s.replace('需求', '需求漂移', 1)
p.write_text(s)
PY
node "$ROOT/dist/cli.js" check
```

期望：check 失败或提示自动生成区漂移。

修复：

```bash
node "$ROOT/dist/cli.js" sync
node "$ROOT/dist/cli.js" check
```
