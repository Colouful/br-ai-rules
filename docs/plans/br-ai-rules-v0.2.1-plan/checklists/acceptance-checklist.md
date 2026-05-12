# V0.2.1 验收清单

## 文件化资产

- [ ] 存在 `src/built-in/assets/`
- [ ] 存在 `src/built-in/rules/`
- [ ] 至少 13 个 asset YAML
- [ ] 所有内置 rules 都已拆成 YAML
- [ ] asset YAML 字段完整
- [ ] rule YAML 字段完整

## Loader

- [ ] 能读取 built-in assets
- [ ] 能读取 built-in rules
- [ ] 能校验 asset schema
- [ ] 能校验 rule schema
- [ ] 能检测重复 asset id
- [ ] 能检测重复 rule id
- [ ] 能检测 asset 引用缺失 rule
- [ ] 错误信息包含文件路径

## Build

- [ ] `npm run build` 通过
- [ ] `dist/built-in/assets/*.yaml` 存在
- [ ] `dist/built-in/rules/*.yaml` 存在
- [ ] `node dist/cli.js list --assets` 正常

## 兼容

- [ ] `br-rules init` 行为不变
- [ ] `br-rules init --no-sync` 行为不变
- [ ] `br-rules init --stack react,typescript` 行为不变
- [ ] `br-rules init --stack spring-boot,java,mysql,redis` 行为不变
- [ ] `assets.include / exclude` 行为不变
- [ ] `.ai-rules/rules/*.yaml` 自定义规则自动发现不变
- [ ] `rulesets` 兼容逻辑不变

## 测试

- [ ] `npm run typecheck` 通过
- [ ] `npm test` 通过
- [ ] `npm run build` 通过
- [ ] React + TypeScript 测试通过
- [ ] Spring Boot + Java + MySQL + Redis 测试通过
- [ ] 自定义规则测试通过
- [ ] managed block 幂等性测试通过
