---
author: flow-machine-draft
created_at: 2026-11-06T16:51:35.827Z
---
# 需求规格（Requirements）— 2026-11-07-knowledge-accept-channel

## 功能需求

### FR-01: knowledge accept --id proposed/<slug> --file <目标> 完成：目标知识文件追加 ## 条目 + INDEX.md 对应分类段补路由行 + 源 proposed 文件删除，输出 JSON 含 anchor/keywords
- 必须实现 `knowledge accept` 子命令：读 proposed/<slug>.md（frontmatter/# 标题/正文/尾注剥离），复用 classify 既有迁移原语完成目标知识文件追加 `## <标题>` 条目 + INDEX.md 对应分类段补路由行（只增不改既有行）+ 删除源 proposed 文件，输出 JSON 含 anchor/keywords/appendedTo。

#### 场景：主路径
- Given：proposed/foo.md 含合法标题与正文；--file known-issues.md
- When：knowledge accept --id proposed/foo --file known-issues.md
- Then：known-issues.md 追加 `## <标题>` 块；INDEX.md Known Issues 段新增路由行；proposed/foo.md 已删除；输出 ok:true 含 anchor

### FR-02: category frontmatter 为有效目标（known-issues/patterns/conventions）时可省 --file 自动路由；category 无效或缺失时必须显式 --file，否则结构化报错不落盘
- 必须支持 category 自动路由：proposed 文件 frontmatter `category` 值为 known-issues/patterns/conventions 之一时 --file 可省（路由到同名目标文件）；category 缺失或为 uncategorized/无效值且未显式传 --file 时，必须输出结构化错误（target_file_required）且零写盘。

#### 场景：category 自动路由
- Given：proposed/bar.md frontmatter category: patterns
- When：knowledge accept --id proposed/bar
- Then：追加进 patterns.md（--file 省略合法）

#### 场景：category 无效且未传 --file
- Given：proposed/baz.md category: uncategorized
- When：knowledge accept --id proposed/baz
- Then：ok:false + error.code=target_file_required；三个知识文件零改动

### FR-03: 同标题条目已存在于目标文件时幂等（跳过追加只做源文件清理收尾，skippedReason=duplicate-title）
- 必须幂等：目标文件已含同标题 `##` 条目时跳过追加（skippedReason=duplicate-title），仅做 INDEX 路由行补齐与源 proposed 文件删除收尾；重复执行 accept 不产生重复内容。

#### 场景：重复合并
- Given：目标文件已含 `## <标题>` 条目
- When：accept 同一 proposed 条目
- Then：目标文件零追加；输出 skippedReason=duplicate-title；源文件已清

### FR-04: --dry-run 只渲染计划零写盘
- 必须支持 --dry-run：渲染将要发生的变更（追加标题/路由行/源删除）而不写任何文件（目标文件/INDEX/proposed 源文件/审计均零写）。

#### 场景：dry-run
- Given：同 FR-01 场景
- When：accept --dry-run
- Then：输出 plan（appendToTarget/indexRouteLine/removeFromProposed）；四个文件零改动

### FR-05: knowledge inbox 列出 proposed/ 待审清单（slug+标题+积压天数）；digest 含 proposed 积压信号（>0 可见）
- inbox 必须列出 proposed/ 全部待审条目（slug+标题+积压天数）；digest 必须新增 proposed 积压信号（条数 >0 时可见，超阈升 warn——阈值对齐既有 digest 信号风格）。

#### 场景：inbox 待审清单
- Given：proposed/ 有 2 条待审
- When：knowledge inbox
- Then：输出含 2 条的 proposed 清单（slug+标题+天数）

### FR-06: SKILL.md proposed 规则更新为指向 accept 命令（用户确认后 agent 可代跑）
- SKILL.md 的 proposed 规则必须更新：由「不要自动审核合并（无命令支撑的悬空规则）」改为指向 `knowledge accept`——用户明确确认条目后 agent 以 accept 代跑合并；命令表同步登记 accept 用法。

#### 场景：规则落地
- Given：本变更合入后的 SKILL.md
- When：检查 proposed 规则行与命令表
- Then：两处均含 accept 命令用法；悬空表述消失

### FR-07: 既有 classify/inbox/digest 测试面全绿 + 新增用例覆盖上述分支
- 必须保持既有 classify/inbox/digest 测试面全绿；新增测试用例覆盖 FR-01~FR-05 全部分支（含 frontmatter 解析边界：缺标题/缺 frontmatter 的病态 proposed 文件结构化报错不落盘）。

#### 场景：回归与边界
- Given：本变更合入后
- When：跑既有 knowledge-classify/knowledge-inbox/knowledge-digest 测试面 + 新增用例
- Then：全部通过；病态文件（无 # 标题）报 structured error 零写盘

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-accept-channel.test.mjs「T1: 主路径迁移+INDEX 注册+删源」
FR-02: test/knowledge-accept-channel.test.mjs「T2: category 自动路由与 target_file_required」
FR-03: test/knowledge-accept-channel.test.mjs「T3: duplicate-title 幂等」
FR-04: test/knowledge-accept-channel.test.mjs「T4: dry-run 零写盘」
FR-05: test/knowledge-accept-channel.test.mjs「T5: inbox 待审清单 + digest 信号」
FR-06: test/knowledge-accept-channel.test.mjs「T6: SKILL.md 文案同步」
FR-07: test/knowledge-accept-channel.test.mjs「T7: 病态 proposed 文件报错不落盘」
