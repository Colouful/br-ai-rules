# BR AI Rules V0.3 技术实现文档

## 1. 架构目标

V0.3 的目标是让 BR AI Rules 支持本地团队规则源，让团队可以在独立目录或仓库中维护共享规则，并在多个项目中复用。

核心链路：

```text
built-in assets
+ local source assets
+ project custom rules
→ resolved rules
→ target adapters
→ generated files
→ generated snapshot
```

## 2. 核心模块

```text
src/
  cli.ts
  commands/
    init.ts
    sync.ts
    check.ts
    diff.ts
    list.ts
    add.ts
    source-list.ts
    asset-list.ts
  core/
    config.ts
    assets.ts
    source.ts
    render.ts
    generated.ts
    managed-block.ts
    checksum.ts
```

## 3. 数据来源

### Built-in assets

```text
src/built-in/assets/*.yaml
src/built-in/rules/*.yaml
```

构建后复制到：

```text
dist/built-in/assets/*.yaml
dist/built-in/rules/*.yaml
```

### Local team source

```text
team-source/
  br-rules.source.json
  assets/*.yaml
  rules/*.yaml
```

### Project custom rules

```text
.ai-rules/rules/*.yaml
```

## 4. 配置模型

```ts
type Config = {
  version: string;
  language: string;
  targets: {
    generic: boolean;
    claude: boolean;
    cursor: {
      enabled: boolean;
      mode: "single";
    };
  };
  sources?: Array<{
    type: "local";
    path: string;
  }>;
  assets: {
    include: string[];
    exclude: string[];
  };
  customRules: {
    autoDiscover: boolean;
    paths: string[];
  };
  writeMode: "managed-block";
};
```

## 5. Source Loader

`src/core/source.ts` 负责：

1. 解析 `config.sources`
2. 解析 local source path
3. 读取 `br-rules.source.json`
4. 读取 `assets/*.yaml`
5. 读取 `rules/*.yaml`
6. 校验 source asset 引用的 rule 是否存在
7. 生成 normalized source bundle

核心校验：

```text
source path must exist
manifest must exist
manifest must contain name/version
asset id must be unique
rule id must be unique
asset.rules references must exist
```

## 6. 规则合并逻辑

V0.3 合并三层：

```text
1. built-in assets/rules
2. source assets/rules
3. project custom rules
```

设计原则：

- built-in 提供默认基础能力
- source 提供团队共享规则
- custom 提供项目私有规则
- V0.3 不做 override
- 跨层重复 ID 应该被视为错误

推荐流程：

```text
loadBuiltInAssets()
loadBuiltInRules()
loadConfiguredSources()
loadSourceAssets()
loadSourceRules()
loadCustomRules()
validateDuplicateIds()
expandAssetsToRules()
filterByTargetsAndLanguage()
render()
```

## 7. Asset 展开规则

`assets.include` 可以包含 built-in asset id 和 source asset id。展开时：找到 asset → 读取 asset.rules → 找到对应 rules → 根据 language / target 过滤 → 按 category 分组渲染。

`assets.exclude` 优先级高于 include。

## 8. Target Adapter

输出目标：

```text
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

每个 adapter 负责目标文件路径、markdown header、managed block 渲染和 block 外内容保护。

## 9. Managed Block

```md
<!-- BR-AI-RULES:START -->
...
<!-- BR-AI-RULES:END -->
```

sync 只更新 block 内内容，不覆盖 block 外团队手写内容。

## 10. generated.json 快照

`.ai-rules/generated.json` 记录当前生成状态，包括：

- version
- generatedAt
- language
- sources[]
- assets[]
- rules[]
- targets{}

用途：check 判断漂移，diff 判断规则源变化，并为后续 upgrade / remote source 打基础。

## 11. check 逻辑

`check` 负责读取配置、解析 built-in/source/custom、校验引用、重新渲染目标内容、与当前文件 managed block 对比、检查 generated.json 快照，并输出 drift 或 up-to-date。

## 12. diff 逻辑

`diff` 负责重新解析并渲染，对比当前生成文件，输出将发生变化的目标文件。当 source rule 改动时，应反映到 diff。

## 13. source list 命令

`br-rules source list` 读取 config.sources，加载每个 source manifest，输出 source name/version/description 和 source assets/rules。

## 14. asset list 命令

`br-rules asset list` 加载 built-in assets 和 source assets，根据 config.assets.include/exclude 标记启用状态，并输出 Built-in assets 和 Source assets。

## 15. 测试策略

当前测试覆盖：config version、managed block、render、check、target cleanup、TODO warning、source loader、source commands、asset list、generated snapshot。

推荐继续覆盖：source path 相对路径、source rule 修改后 diff、broken source manifest、missing rule reference、duplicate id across source/custom、source asset exclude。

## 16. 扩展方向

V0.4 之后可考虑：GitHub remote source、npm source、source upgrade、source lock、web rule platform、team rule review workflow。

暂不建议过早做：Agent、Skill、Hook、Runtime、OpenSpec。
