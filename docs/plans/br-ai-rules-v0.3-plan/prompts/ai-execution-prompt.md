请你在 br-ai-rules 项目中实现 V0.3：团队规则源与资产升级。

项目路径：

/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules

重要背景：

- 当前已发布 `@br-ai/rules@0.2.2-beta.1`
- 前端和后端 dogfood 均已完成
- V0.3 只做 local team source，不做远程源和 Web 平台

目标：

实现团队本地规则源能力，让项目可以通过：

```bash
br-rules init --stack spring-boot,java,mysql,redis --source ../team-ai-rules --asset team.backend-standard
```

加载团队共享规则资产。

必须做：

1. 支持 local source
2. 支持 source manifest：`br-rules.source.json`
3. 支持 source assets：`assets/*.yaml`
4. 支持 source rules：`rules/*.yaml`
5. 支持 config.sources
6. 支持 `init --source --asset`
7. 支持 `br-rules source list`
8. 支持 `br-rules asset list`
9. generated.json 记录 sources / source assets / source rules 快照
10. diff 能反映 source rule 改动导致的生成文件变化
11. 新增 `examples/team-source`
12. 增加完整测试
13. 保持 V0.2 全部能力不回归

禁止做：

- GitHub remote source
- npm source
- Web 平台
- 登录权限
- 规则市场
- 自动升级命令
- br-rules verify
- Agent / Skill / OpenSpec / Hook / Runtime

建议实现顺序：

1. 阅读 docs/ 下的 V0.3 计划文档
2. 新增 source schema 和 source loader
3. 修改 config schema 支持 sources
4. 修改资产加载流程，合并 built-in + source + custom
5. 修改 init 支持 --source --asset
6. 添加 source list 命令
7. 添加 asset list 命令
8. 扩展 generated.json
9. 增强 diff
10. 添加 examples/team-source
11. 补充测试
12. 运行完整回归

质量检查：

```bash
npm run typecheck
npm test
npm run build
```

本地验收：

```bash
TEST_DIR="/tmp/br-ai-rules-v03-test"
SOURCE_DIR="/tmp/br-ai-rules-v03-team-source"

rm -rf "$TEST_DIR" "$SOURCE_DIR"
mkdir -p "$TEST_DIR"

cp -R examples/team-source "$SOURCE_DIR"

cd "$TEST_DIR"
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js init --stack spring-boot,java,mysql,redis --source "$SOURCE_DIR" --asset team.backend-standard
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js check
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js source list
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js asset list
```

最终输出报告：

- 修改文件
- 新增命令
- 测试结果
- V0.2 回归结果
- V0.3 验收结果
- 是否可以发布 beta
