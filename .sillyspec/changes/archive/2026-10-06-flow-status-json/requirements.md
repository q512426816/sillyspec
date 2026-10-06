---
author: flow-machine-draft
created_at: 2026-10-06T05:06:35.656Z
---
# 需求规格（Requirements）— 2026-10-06-flow-status-json

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: flow status --change <存在的活跃变更> --json 输出合法 JSON，含 change/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps 字段

- 必须：`--json` 在场时 stdout 输出单个合法 JSON 对象（末尾一次换行），包含 change、phase、designFilled、frFilled、bindingsFilled、bindingsTotal、tasksChecked、tasksTotal、substeps 九字段，字段值与人类可读路径同源（同一份状态推断逻辑产出，两条渲染路径不得各自计算）；禁止在 JSON 行之外向 stdout 混入人类可读文案行。不带 `--json` 时输出必须与现状逐字一致。

#### 场景：主路径

- Given：变更目录在场且 flow-state.yaml 存在（spec 槽已填、任务部分勾选）
- When：`flow status --change <名> --json`
- Then：stdout 整体可被 JSON.parse，九字段齐备，substeps 为已完成子步名数组，phase 为阶段字符串
- Given：同上 fixture，经真实 CLI 入口（bin/sillyspec.js）调用
- When：`node bin/sillyspec.js flow status --change <名> --json`
- Then：stdout 同为单行合法 JSON（--json 经 index.js 全局解析透传进 flow 族，不得因入口层剥离而失效）

### FR-02: 变更不存在与已归档两种形态下 --json 亦输出结构化 JSON（带对应状态标记）且进程退出码与现有人类可读路径一致

- 必须：变更不存在时 `--json` 输出含不存在标记的 JSON 对象且进程 exit 1；已归档时输出含已归档标记的 JSON 对象且 exit 0；变更目录在场但无 flow-state（头脑风暴预段形态）时输出含对应标记的 JSON 且 exit 0。三形态退出码必须与不带 `--json` 的现行路径完全一致。

#### 场景：三形态退出码与标记

- Given：changes/ 与 changes/archive/ 下均无该变更目录
- When：`flow status --change <名> --json`
- Then：stdout 为合法 JSON 且含不存在状态标记，进程 exit 1
- Given：仅 changes/archive/<名> 在场
- When：同上
- Then：stdout 为合法 JSON 且含已归档状态标记，exit 0

### FR-03: 新增单元测试覆盖上述三种形态并纳入 test:core，全部跑绿

- 必须：新增测试文件覆盖活跃、不存在、已归档、目录在场无 flow-state 四形态的 `--json` 输出与退出码，并断言不带 `--json` 的人类可读关键行未回归；测试文件必须登记进 package.json 的 test:core 清单；test:core 全量跑绿。

#### 场景：主路径

- Given：仓库工作区含本变更实现
- When：`npm run test:core`
- Then：全部用例通过，含新增测试文件

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-status-json.test.mjs「活跃变更 --json 九字段齐备且与人类路径同源」
FR-02: test/flow-status-json.test.mjs「不存在 exit 1 / 已归档与目录在场无 state exit 0——与人类路径一致」
FR-03: test/flow-status-json.test.mjs「test:core 清单驻留断言 + 人类可读回归行」
