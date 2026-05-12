# BR AI Rules V0.2 默认资产内容建议

本文档定义 V0.2 第一批默认资产的建议规则内容。执行模型可以据此生成 YAML 文件。

## base.behavior-basic

- `base.behavior.clarify-before-coding`：需求、范围、验收标准不清楚时，先提出关键问题，不要直接修改代码。
- `base.behavior.restate-goal-and-scope`：开始修改前，先简要说明你理解的目标、可能涉及的文件和不应触碰的范围。
- `base.behavior.minimal-change`：优先做完成当前任务所需的最小修改，不扩大影响范围。
- `base.behavior.no-unrelated-refactor`：不要做无关重构，不要格式化无关文件，不要删除不理解的代码。
- `base.behavior.verify-behavior-change`：如果修改会影响功能行为，必须补充测试或说明可执行的手工验证方式。
- `base.behavior.report-validation-and-risk`：最终回复必须说明修改文件、验证结果、未覆盖风险。如果没有运行验证，必须说明原因。

## language.typescript

- `language.typescript.no-any-without-reason`：禁止为了快速通过类型检查而随意使用 `any`。如果必须使用，说明原因和后续收敛方式。
- `language.typescript.no-type-assertion-coverup`：不要用类型断言掩盖真实类型问题。优先修正类型定义、数据结构或边界校验。
- `language.typescript.public-api-types`：公共函数、组件 props、接口返回值必须有清晰类型表达，避免隐式 any 和不稳定结构。
- `language.typescript.async-error-handling`：异步函数必须考虑失败路径，不要吞掉异常，不要只处理 happy path。
- `language.typescript.do-not-change-tsconfig-casually`：不要为了当前任务随意修改 `tsconfig`、构建配置或 lint 配置。

## language.java

- `language.java.layering`：保持 Controller / Service / Repository 或 Mapper 分层清晰，不要在 Controller 写复杂业务逻辑。
- `language.java.public-signature-compatibility`：不要随意改变公共方法、接口、DTO 字段含义，避免破坏兼容性。
- `language.java.exception-handling`：异常处理必须遵循项目现有规范，不要随意吞异常或返回含糊错误。
- `language.java.money-time-state-care`：涉及金额、时间、状态流转的逻辑必须谨慎，说明边界条件和验证方式。
- `language.java.validation-and-permission`：不要绕过已有参数校验、权限校验和业务校验。

## framework.react

- `framework.react.reuse-components`：优先复用项目已有组件、hooks 和样式系统，不要为了单个需求引入新 UI 库。
- `framework.react.state-locality`：组件状态尽量局部化，避免无必要引入全局状态或复杂状态管理。
- `framework.react.side-effects`：副作用必须放在合适位置，注意依赖数组、清理函数和重复请求问题。
- `framework.react.loading-empty-error`：页面、列表、表单、弹窗必须考虑 loading、empty、error 等状态。
- `framework.react.behavior-verification`：涉及交互行为变化时，补充组件测试或说明手工验证路径。

## framework.vue

- `framework.vue.keep-style-consistent`：遵循项目现有 Composition API 或 Options API 风格，不要混用不一致写法。
- `framework.vue.reuse-components-composables`：优先复用已有组件、composables 和样式系统。
- `framework.vue.reactivity-boundary`：不要随意改变响应式数据结构，注意 ref、reactive、computed、watch 的边界。
- `framework.vue.no-unnecessary-global-state`：不要为了局部需求引入或修改全局状态。
- `framework.vue.page-verification`：行为变化需要说明页面路径、操作步骤和预期结果。

## framework.spring-boot

- `framework.spring-boot.layering`：遵循 Controller / Service / Mapper 或 Repository 分层，不要跨层写逻辑。
- `framework.spring-boot.request-validation`：接口入参必须校验，并遵循项目现有错误返回规范。
- `framework.spring-boot.transaction-boundary`：涉及数据库写入、状态变更、多表操作时必须考虑事务边界。
- `framework.spring-boot.permission-check`：涉及用户、角色、组织、数据范围时必须确认鉴权点。
- `framework.spring-boot.idempotency-concurrency`：涉及状态变更、回调、重试、支付、库存等场景时必须考虑幂等和并发。

## middleware.mysql

- `middleware.mysql.migration-plan`：涉及表结构变更必须说明迁移方案、兼容策略和回滚方式。
- `middleware.mysql.index-awareness`：新增查询必须考虑索引、过滤条件和排序字段。
- `middleware.mysql.no-n-plus-one`：不要在高频接口引入 N+1 查询。
- `middleware.mysql.pagination-order`：分页查询必须明确稳定排序，避免翻页数据漂移。
- `middleware.mysql.update-delete-scope`：更新和删除操作必须明确范围，避免误更新、误删除。

## middleware.redis

- `middleware.redis.key-ttl`：必须明确 key 命名、作用域和过期时间。
- `middleware.redis.no-sensitive-cache`：不要缓存明文密码、token、密钥等敏感信息。
- `middleware.redis.consistency`：缓存更新必须考虑一致性、失效策略和并发场景。
- `middleware.redis.lock-ttl`：分布式锁必须设置过期时间，并考虑释放失败和锁误删问题。
- `middleware.redis.not-transaction-replacement`：不要用 Redis 替代数据库事务。

## middleware.message-queue

- `middleware.message-queue.idempotent-consumer`：消费者必须考虑重复消费，关键操作要具备幂等性。
- `middleware.message-queue.retry-failure`：必须考虑消费失败、重试、死信或补偿机制。
- `middleware.message-queue.compatible-payload`：消息体变更要保持兼容，避免破坏已有消费者。
- `middleware.message-queue.no-long-transaction`：不要在消费者中执行不可控长事务。
- `middleware.message-queue.traceability`：关键业务消息必须有日志和可追踪 ID。

## practice.testing-basic

- `practice.testing.behavior-change-test`：行为变化必须补充自动化测试，或说明无法自动化时的手工验证步骤。
- `practice.testing.bug-regression`：Bug 修复优先补回归测试，避免同类问题再次出现。
- `practice.testing.no-fake-result`：不要伪造测试结果。未运行测试时必须明确说明。
- `practice.testing.do-not-ignore-existing-failures`：不要跳过已有失败测试。若失败与当前任务无关，也必须说明。

## practice.dependency-control

- `practice.dependency.no-auto-add`：未经确认不要新增 npm、Maven、Gradle、pip、Go module 等依赖。
- `practice.dependency.explain-impact`：如必须新增依赖，先说明用途、替代方案、体积、安全、维护和回滚影响。
- `practice.dependency.prefer-existing`：优先使用项目已有工具库和已有实现，不要为小功能引入大型库。

## practice.security-basic

- `practice.security.no-secret-output`：不要输出、提交或记录密钥、token、密码、私钥等敏感信息。
- `practice.security.no-permission-bypass`：不要绕过权限校验、认证逻辑、数据范围限制。
- `practice.security.validate-user-input`：用户输入必须校验，涉及上传、下载、回调、支付等场景要特别说明风险。
- `practice.security.safe-logging`：日志中不要记录敏感字段，错误信息不要泄露内部实现细节。

## practice.api-contract

- `practice.api.no-breaking-change`：不要随意修改已有接口字段含义、错误码、状态码或返回结构。
- `practice.api.compatible-new-field`：新增字段要考虑向后兼容，避免影响旧客户端。
- `practice.api.pagination-filter-sort`：分页、排序、过滤规则必须保持一致，并说明默认值。
- `practice.api.change-impact`：接口变更必须说明影响范围，包括调用方、文档、测试和回滚方式。
