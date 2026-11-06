---
author: flow-machine-draft
created_at: 2026-11-06T14:29:33.291Z
---
# 需求规格（Requirements）— 2026-11-06-knowledge-propose-body-file

## 功能需求

### FR-01: knowledge propose --title X --body-file <路径> 从指定文件读全文作正文写入 proposed/ 条目，落盘内容与源文件一致

- 必须支持 `--body-file <路径>` 参数：cmdPropose 以 UTF-8 全文读取该文件内容作为条目正文，写入 `knowledge/proposed/<slug>.md` 的正文段；落盘正文必须与源文件内容逐字一致（不追加不截断，frontmatter/标题/尾注等模板行的拼接方式与既有 --body 路径完全相同）。

#### 场景：主路径

- Given：一个含中文正文与特殊字符（含 `projects/<encoded-cwd>/` 形态写法、中文标点、多行文本）的临时正文文件
- When：`knowledge propose --title <标题> --body-file <该文件>`
- Then：输出 `ok:true`、`action:created`；`proposed/<slug>.md` 正文段与源文件逐字一致

### FR-02: --body 与 --body-file 同给时显式报错（互斥冲突），不静默择一

- 禁止静默择一：`--body` 与 `--body-file` 同时出现时必须报 `ok:false` 的互斥冲突错误（错误码 `body_source_conflict`，中文提示两参数互斥），且不得写盘。

#### 场景：互斥冲突

- Given：任意可用正文源
- When：同一次调用同时传 `--body <文本>` 与 `--body-file <路径>`
- Then：输出 `ok:false` 且 error.code 为 `body_source_conflict`；proposed/ 目录无新文件

### FR-03: --body-file 指向不存在或不可读文件时输出结构化错误（body_file_missing/body_file_read_failed），不落半成品文件

- 必须区分两类失败并以结构化错误码输出：路径不存在 → `body_file_missing`（附路径）；存在但读取抛错（如权限/目录）→ `body_file_read_failed`（附原因摘要）。两类失败都必须发生在任何目录创建/写盘之前，禁止落半成品文件。

#### 场景：文件缺失

- Given：`--body-file` 指向不存在的路径
- When：`knowledge propose --title X --body-file <该路径>`
- Then：`ok:false` 且 error.code 为 `body_file_missing`；proposed/ 目录未被创建（该次调用零落盘）

#### 场景：文件不可读

- Given：`--body-file` 指向一个目录（readFileSync 必然抛 EISDIR）
- When：同上调用
- Then：`ok:false` 且 error.code 为 `body_file_read_failed`；同样零落盘

### FR-04: 既有 --body 命令行传参路径行为零变化（既有测试全绿）

- 必须保持 `--body` 既有行为逐字节不变：不传 `--body-file` 时参数解析、正文写入、输出 JSON 结构与现状一致；cmdPropose 此前无测试覆盖，本变更以对照用例锁定既有形态（`--body` 正文落盘、无 body 时 `(no body provided)` 兜底、`--from`/`--category` 组合）。

#### 场景：既有形态对照

- Given：不传 `--body-file` 的三种调用（带 --body / 不带 body / 带 --from）
- When：分别执行 cmdPropose
- Then：落盘内容与输出 JSON 与变更前行为一致（正文、兜底串、source 行）

### FR-05: 帮助文案（cmdKnowledge --help）与 src/index.js 顶部 usage 同步列出 --body-file

- 必须同步两处发现面：`cmdKnowledge --help` 的 propose 说明与 `src/index.js` 顶部 usage 的 knowledge 行均列出 `--body-file <路径>` 形态（与 --body 并列，注明从文件读正文）。

#### 场景：文案同步

- Given：本变更合入后的源码
- When：检查 `src/stages/knowledge.js` help 输出与 `src/index.js` usage 文本
- Then：两处均含 `--body-file` 字样且语义为「从文件读正文」

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-propose-body-file.test.mjs「T1: --body-file 主路径落盘与源文件一致」
FR-02: test/knowledge-propose-body-file.test.mjs「T2: --body 与 --body-file 互斥报错且零落盘」
FR-03: test/knowledge-propose-body-file.test.mjs「T3: 缺失/不可读结构化错误码且零落盘」
FR-04: test/knowledge-propose-body-file.test.mjs「T4: 既有 --body 形态零回归对照」
FR-05: test/knowledge-propose-body-file.test.mjs「T5: help 与 usage 文案同步」
