---
author: flow-machine-draft
created_at: 2026-10-15T12:14:56.287Z
---
# 需求规格（Requirements）— 2026-10-15-session-forensics

## 功能需求

### FR-01: 新命令 sillyspec diagnose --change <名>（只读零状态写入）：装配并输出证据包——变更身份（flow-state/tier）、按变更名过滤的 agent 会话日志路径、摩擦账本条目、verify-runs 测试结果文件、评审轮次文件（含 superseded）、取证据任务书

- 必须：`sillyspec diagnose --change <名>` 读取既有数据源装配证据包并输出，全程零写操作（不写进度库、不写 runtime 文件、不建目录——与 run 族命令的 _write 面划清界限）。
- 必须：证据包六面齐全：①变更身份（flow-state.yaml 的 tier/substeps 态，缺失降级为「无 flow 态」注记；归档变更如实标注 archived 并列归档件路径）；②agent 会话日志路径（读 `.runtime/agent-session-log.json`，按登记面既有 `change_key` 键与变更名**精确相等**过滤，零命中如实输出空清单）；③摩擦账本（readFrictionLedger 按条目 change 键过滤）；④verify-runs 测试结果（`.runtime/verify-runs/*/test-result.json` 按 mtime 近序取前 N，默认 3，同 mtime 按路径字典序破平）；⑤评审轮次（变更目录 review.json + `review.json.superseded-*` 存量清单）；⑥取证任务书（FR-02）。
- 必须：`--detect` 透传 agent-session-log 现场探测（不落盘语义随既有 cmdAgentLog）；`--json` 输出结构化证据包（任务书以字符串字段随附，平台可消费）。
- 禁止：不尝试检测 agent 派发能力/harness 类型判伪（D-unmapped-153 死路：伪检测比声明制更假——任务书始终输出，执行方式由宿主 agent 自行决定）。

#### 场景：六面证据包

- Given：fixture spec 目录（含 agent-session-log.json / friction 账本 / verify-runs / 变更目录 review 轮次）
- When：调用装配纯函数
- Then：六面字段齐全且过滤口径正确（会话日志按变更名过滤、verify-runs 按 mtime 近序截断）

#### 场景：零写入

- Given：同一 fixture 目录两次调用前后
- When：比对目录树哈希
- Then：无任何文件新增/修改/删除（只读命令）

#### 场景：缺数据源降级

- Given：空 runtime（无账本/无 verify-runs/无登记日志）
- When：调用装配
- Then：各面为空清单/注记而非抛错（fail-soft，命令仍产出任务书）

### FR-02: 取证任务书含结构维度骨架与取证纪律（path:line 铁律、报告唯一可写产物、维度数据驱动）

- 必须：任务书含六个结构维度骨架：时间线重建 / 计划遵从 / 重复工作 / 停等与重试 / 成本与轮次 / 门禁摩擦——每维度一句话职责（结构骨架，非内容词表，不违反零内容枚举红线）。
- 必须：取证纪律四条在场：①每条 finding 必须带 `path:line` 锚，无锚不成立；②唯一可写产物是 `<变更目录>/diagnosis-report.md`（固定章节：问题陈述/时间线/findings 分维度/无法证实面）；③先读证据包列出的文件本体再下结论，禁全量扫读仓；④结论存疑时定向补证，连续扩面无结论即收敛（时间盒，同评审经济学）。
- 必须：任务书注明数据来源与口径（证据包各面来自哪个文件），报告读者是「要决定下一步怎么办的人」。

#### 场景：任务书必需节

- Given：renderForensicsTaskbook 输出
- When：检索六维度与四纪律关键短语
- Then：逐项在场（含 `path:line` 字面与 diagnosis-report.md 产物名）

### FR-03: 命令装配面在 index.js 接线（case 'diagnose'，动态 import，--help 帮助行更新）

- 必须：`src/index.js` 增 `case 'diagnose':` 分支（动态 import `./forensics.js`，参数透传风格与 case 'agent-log' 同款）；顶层帮助文本增 diagnose 用法行。
- 禁止：不改动既有命令行为面与共享暂存区外的任何无关文件。

#### 场景：命令可达

- Given：仓库根
- When：`sillyspec diagnose --change <fixture 变更> --json`
- Then：exit 0 且 JSON 含六面字段（smoke 级，fixture 化 tmp 目录）

### FR-04: 变更自身测试面与 lint

- 必须：新增 test/forensics.test.mjs：装配函数（六面/过滤/降级/零写入）+ 任务书（维度与纪律关键短语）断言全绿。
- 必须：`npm run lint` 通过；既有测试零新增失败。

#### 场景：新测试全绿

- Given：test/forensics.test.mjs
- When：node --test 运行
- Then：全部用例通过

## 测试绑定（每条 FR 至少一行）

FR-01: test/forensics.test.mjs「六面证据包」「零写入」「缺数据源降级」
FR-02: test/forensics.test.mjs「任务书维度与纪律」
FR-03: test/forensics.test.mjs「任务书维度与纪律」（命令接线面由 index.js case 分支 + 帮助行落盘核对——smoke 面收口时 agent 亲跑留痕，见 design 风险节）
FR-04: test/forensics.test.mjs 全部用例 + npm run lint（收口亲测）
