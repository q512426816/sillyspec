---
author: qinyi
created_at: 2026-09-16 03:09:52
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（执行者） | 按 verify-result.md 受控槽段回填判断层内容的 AI 子代理/主代理 |
| CLI 门禁 | verify/plan --done、worktree apply、quick 实测门等机械校验方 |
| 用户 | 多会话共享仓的开发者，门禁假阳性/静默失败的直接受害者 |

## 功能需求

### FR-01: 集成验证回执双形态解析
Given verify-result.md「## 集成验证回执」槽段含多行 YAML 条目（`- claim: X` 起头、缩进续行 `command:` / `exit:` / `log:` 字段任意序）
When verify --done 时 parseEvidenceSlots 解析槽段
Then 四字段齐全且 exit 为数字的条目进 runtimeEvidence（与单行管道形态等价）；任一字段缺失不命中（fail-closed 不变）；存量单行回执解析行为逐字节不变

### FR-02: TaskCard 顶层重复键硬报错
Given tasks/task-NN.md frontmatter 存在顶层键（行首无缩进 `key:`）出现 ≥2 次（如骨架反填 depends_on 后 agent 又手填一处）
When plan --done 触发 validatePlanFeasibility
Then 该卡 error 阻断，报错指明键名、出现次数与各处行号，并提示「保留正确一处、删除其余」；无重复键的卡片零新 error

### FR-03: worktree apply Gate1 白名单模块文档
Given 变更实际改动含 `.sillyspec/docs/**` 文件且 design §6 / task allowed_paths 未声明
When worktree apply（真实 apply 与 checkOnly assess）跑 Gate1 清单校验
Then 不再报「文件清单校验失败」BLOCKED；该文件照常进 patch 回放主仓（Gate1 与 resolvePatchFiles 同源 allowSet，无静默丢失）；apply 结果 warnings 报备实际落地的 docs 文件清单（审计可见）

### FR-04: 隔离快照生成物 copy 面
Given local.yaml 配置 `gate_snapshot.copy: [<仓根相对路径>]`（目录或文件）且主仓该路径存在
When verify/quick 门禁创建隔离快照
Then 快照内该路径可见（junction 链接，junction 失败回退递归 copy）；未配置时快照行为不变；配置的路径主仓不存在时 warn 跳过不作废快照

### FR-05: probe7 锚点 advisory 口径对齐
Given verify-result.md 探针 7 矩阵某行判定 covered、证据列含 `.test.` 文件名锚（无行号）
When verify --done 跑 checkProbe7AnchorCoverage advisory
Then 不再计入 missingAnchors（file:line 锚维持原判定）；advisory 文案同步为「file:line 或 .test. 文件名锚点」

## 非功能需求
- 兼容性：5 处全部增量式——存量单行回执/无重复键卡片/已声明 docs 的 design/未配 copy 面的 local.yaml/带行号锚的证据，行为逐一不变
- Windows 兼容：junction 用 symlinkSync(..., 'junction')（不依赖特权）；路径一律仓根相对 POSIX
- 多会话：改动集中在低冲突文件（probe7-anchor-check 零依赖单文件、verify-facts-schema 单函数内扩展），verify-probes.js 仅动骨架注释文案
- 测试：node --test 直测 5 组，不依赖真实 git 仓的用例纯函数化

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 回执双形态解析（多行 YAML 聚合 + 单行正则保留），否决 YAML 重渲染迁移 |
| D-002@v1 | FR-04 | 快照 copy 面声明式配置，否决快照内跑 gen 命令与 lint 豁免启发式 |
| D-003@v1 | FR-03 | docs 白名单并入 allowSet（Gate1/patch 同源），否决违规前置滤除（静默丢失风险）——已被 @v2 修正 |
| D-003@v2 | FR-03 | 条件加白（声明面非空才加）+ declaredFace 审计口径，保空清单 fail-open 语义（design-grill M5/M3） |
| D-004@v1 | FR-02 | feasibility 单点重复键检测，否决各消费方分散加报错 |
| D-005@v1 | FR-05 | advisory 锚点本地正则扩口径，否决 import stage-contract（破坏零依赖定位） |
