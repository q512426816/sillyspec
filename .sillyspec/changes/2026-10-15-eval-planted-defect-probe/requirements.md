---
author: flow-machine-draft
created_at: 2026-10-15T11:52:30.994Z
---
# 需求规格（Requirements）— 2026-10-15-eval-planted-defect-probe

## 功能需求

### FR-01: eval/tasks/004-phase-stats/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/events.log（承载五类隐含输入的固定 fixture）、verify.mjs（期望硬编码、fail 时可定位哪条隐含面挂了）、solution/bin/phase-stats.mjs（参考解过 verify）

- 必须：任务四件套齐全且形态符合 eval 工具链契约（task.json 含 id/title/instruction；verify.mjs 以被测工作目录为 cwd、退出码 0=过；files/ 为工作副本脚手架；solution/ 仅服务 dry-run 参考、不进 agent 工作副本）。
- 必须：instruction 为「命名表层 + 隐含盲区」形态——只命名事件行格式（`<ISO 时间戳> <START|END> <sessionId> <phase>`）、配对语义（同 sessionId 同名 phase START→END 为一轮）与输出契约（一行 JSON、phases 按 phase 字典序、rounds=完成轮数、totalSeconds=完成轮次时长整数秒之和）；**不提及**行序、空行、尾随空白行、未闭合 START、孤儿 END 五类隐含输入。
- 必须：fixture（files/data/events.log，内容固定）全部承载五类隐含输入：①行序与时间序不一致（跨 session 交错）；②中段空行；③纯空白行（含行尾空格形态）；④未闭合 START（有 START 无 END 的 session）；⑤孤儿 END（有 END 无 START 的 session）。每类隐含输入有唯一合理解（乱序按 (sessionId,phase) 配对、空白行跳过、未闭合/孤儿不计入时长与轮数、不崩溃）。

#### 场景：四件套齐全

- Given：eval/tasks/004-phase-stats/
- When：核对文件面
- Then：task.json、verify.mjs、files/data/events.log、solution/bin/phase-stats.mjs 四件在场且 task.json 可被 JSON.parse

#### 场景：指令不泄露隐含面

- Given：task.json 的 instruction 文本
- When：检索五类隐含输入的关键词（乱序/排序/空行/空白/未闭合/孤儿/END 缺失等提示语）
- Then：不出现对这五类输入的处理指示（只允许以「完成轮数」「时长之和」等输出契约词汇出现）

### FR-02: verify.mjs 判分独立于实现：期望值硬编码、逐断言可定位、输出契约严格

- 必须：verify.mjs 的期望 JSON 硬编码（不读实现、不重算）；逐项断言（可运行、stdout 单行可解析 JSON、phases 深相等、每 phase 的 rounds/totalSeconds 逐项核对），失败时 stderr 指明断言项。
- 必须：期望值正确反映 fixture 的唯一合理解：download rounds=1 totalSeconds=10；login rounds=4 totalSeconds=22；upload rounds=1 totalSeconds=17（未闭合 s5 与孤儿 s6 零贡献）。

#### 场景：期望硬编码且可定位

- Given：eval/tasks/004-phase-stats/verify.mjs 源文本
- When：检索期望值与断言结构
- Then：download/login/upload 三组期望值逐字在场；断言失败路径有区分性 stderr 输出

### FR-03: dry-run 双路径：solution 参考解过 verify（pass 路径）、占位产物被 verify 拒（fail 路径）

- 必须：把 solution/bin/phase-stats.mjs 复制进含 files/ 脚手架的工作副本后运行 verify.mjs，退出码 0。
- 必须：工作副本无实现（或仅占位产物）时运行 verify.mjs，退出码非 0。

#### 场景：参考解通过

- Given：临时工作副本 = files/ ∪ solution/
- When：node verify.mjs（cwd=工作副本）
- Then：退出码 0

#### 场景：无实现被拒

- Given：仅 files/ 脚手架的临时工作副本
- When：node verify.mjs
- Then：退出码非 0

### FR-04: 判别力：naive 实现（按文件邻接配对、不跳空行）verify 必拒

- 必须：新增 test/eval-planted-defect-probe.test.mjs，内嵌一个「只实现了命名表层」的 naive 实现（逐文件行序邻接配对、不 trim/不跳空行），对其运行 verify.mjs 退出码非 0——证明该任务能区分「只做表面」与「覆盖隐含面」的实现，这是本探针的成立前提。

#### 场景：naive 被拒

- Given：临时工作副本 = files/ ∪ 测试内嵌 naive 实现
- When：node verify.mjs
- Then：退出码非 0

#### 场景：判别力测试进仓库套件

- Given：test/eval-planted-defect-probe.test.mjs
- When：node --test 运行
- Then：全部用例通过（naive 拒 / 参考解过 / 无实现拒 三用例）

### FR-05: eval 管道集成：node eval/run.mjs --dry-run 含新任务零报错跑通

- 必须：`node eval/run.mjs --dry-run`（mixed 模式）在含 004 的 4 任务集上跑通无异常：004 为偶数号 → A 臂走 solution pass 路径、B 臂走占位 fail 路径，verify 双路径判定与 dry-run 期望一致；任务指纹计算含新任务不报错。

#### 场景：dry-run 全管道

- Given：当前仓库
- When：node eval/run.mjs --dry-run
- Then：退出码 0，报告含 004-phase-stats 任务面（A 过 B 挂的 mixed 期望形态）

### FR-06: 变更自身测试面与 lint

- 必须：FR-03/FR-04 的断言由 test/eval-planted-defect-probe.test.mjs 承载并全绿；`npm run lint` 通过。

#### 场景：lint 与测试面

- Given：当前仓库
- When：npm run lint + node --test test/eval-planted-defect-probe.test.mjs
- Then：lint 通过（0 死码/内容规则过）、测试全绿

## 测试绑定（每条 FR 至少一行）

FR-01: test/eval-planted-defect-probe.test.mjs「FR-03 参考解过 verify」（四件套在场的存在性由该用例的文件读取隐式断言；指令不泄露面为写作期自查，验收靠规范与人工评审——不适用：prompt 文本负面清单无机械断言面，理由记 design）
FR-02: test/eval-planted-defect-probe.test.mjs「FR-03 参考解过 verify」（期望值正确性由参考解通过隐式锁定）
FR-03: test/eval-planted-defect-probe.test.mjs「FR-03 参考解过 verify / 无实现被 verify 拒」
FR-04: test/eval-planted-defect-probe.test.mjs「FR-04 naive 实现被 verify 拒」
FR-05: 不适用：--dry-run 为零 token 管道验证，属发版前人工/收口动作而非单测面（runner 起子进程编排，测试内复刻即重复实现）；本变更收口时由 agent 亲跑留痕（design 风险节记实测证据）
FR-06: test/eval-planted-defect-probe.test.mjs「FR-03/04 全部用例」+ npm run lint（收口亲测）
