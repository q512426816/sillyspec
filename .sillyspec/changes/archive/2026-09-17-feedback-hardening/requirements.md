---
author: zcode-feedback-hardening
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-feedback-hardening
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（执行者） | 填写 verify-result.md 探针7矩阵、编写 plan.md 的 AI 主代理/子代理 |
| CLI 门禁 | quick/verify --done 实测门（gate-snapshot 隔离快照）、plan --done postcheck、verify --done 硬门与 advisory |
| 用户 | 多会话共享仓的开发者，门禁环境性假败与口径打架的直接受害者 |

## 功能需求

### FR-01: 门禁快照供给链命令面（gate_snapshot.commands）
Given 主仓 local.yaml 声明 `gate_snapshot.commands`（string[]，块列表或 inline flow 双形态）
When quick/verify 门禁构建隔离快照（createGateSnapshot）至环境目录链接与完整性预检之后、copy 面（applyGateSnapshotCopy）之前
Then 逐条命令在快照根 cwd 执行（每条超时 300s；非零退出/超时 warn 不作废快照，fail-open）；命令产出的生成物为快照内真实文件，copy 面对已存在 dst 照旧跳过（新鲜度优先）
And 未配置 `gate_snapshot.commands`（全部存量 local.yaml）时快照构建行为逐字节不变；执行段打印一次活链接警示（命令不得改写 node_modules 等环境目录）

### FR-02: 探针7 证据锚点三形态口径对齐（预填说明 + advisory 同权）
Given verify-result.md 探针7矩阵段（骨架/幂等补段路径）
When CLI 渲染预填说明
Then 说明明示：covered/partial 证据须含测试锚点三形态之一（`file:line` / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态——删除误导性的「或人工核验提示」措辞
And verify --done 时 probe7-anchor-check advisory 对含反引号锚的 covered 行不再提示回补（本地正则补第三形态，与硬门 matrixEvidenceHasAnchor 三形态同权）；advisory 文案（gates.js）同步三形态；advisory 仍不阻断

### FR-03: 隐式 Wave 串行执行（无显式 Wave 的 plan 统一口径）
Given plan.md 无任何显式 `## Wave N` 标题而 tasks.md 注册表非空（light 级无任务区形态）
When execute 构建 Wave 步骤（parseWavesFromPlan 合成隐式单 Wave）
Then buildWavePrompt 对该 Wave 下发：头部「（隐式合成——plan.md 无显式 Wave 划分）」标注 + 调度要求串行铁律（任务逐个完成——单子代理串行或逐个启动子代理等待完成再下一个，禁止并行启动；理由=未做过文件正交/契约链核查）+ 角色清单并行措辞同步收敛
And plan --done postcheck 对「无显式 Wave + 多 task 共享 allowed_path」从 error 降级为 warning（串行执行安全；提示显式分 Wave 可获并行收益，同 Wave 共享文件的既有 error 对显式 Wave 形态不变）
And execute 检查 0.8 错误文案与新口径一致（未识别 Wave 标题 → 任务退化为隐式串行，Wave 结构意图丢失）；stages/plan.js:199「自动串行」宣称维持（现为真实行为）

### FR-04: 测试与文档镜像随行
Given FR-01~03 行为变更
When 收尾
Then 新增/更新直测：gate_snapshot.commands 解析+执行段（未配置零行为/配置执行/失败 fail-open）、probe7-anchor-check 三形态（反引号锚不再 missing）、buildWavePrompt implicit 串行指令、plan-postcheck 无 Wave 共享路径 warning 化（test/plan-optimization Test 5f 断言随行）；文档镜像同步（docs/prompt/{plan,execute,verify}.md、.claude/skills/sillyspec-{plan,execute,verify}/SKILL.md、troubleshooting.md、config-schema 示例）

## 验收标准
- 三处负面反馈场景逐一可复现修复：①快照内生成物可由命令产出（全量 lint/test 不再因主仓缺/过期生成物必挂）；②covered 行给反引号测试路径一轮过硬门且 advisory 零提示；③light 级 plan 无 Wave 段 + 多 task 共享文件 plan --done 通过（仅 warning），execute 步骤下发串行指令
- 存量零回归：未配置 commands 的快照、有显式 Wave 的 plan、file:line/.test. 锚、显式 Wave 同 Wave 共享路径 error——行为逐一不变
