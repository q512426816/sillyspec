---
author: flow-machine-draft
created_at: 2026-10-15T11:52:30.994Z
---
# 设计记录（Design Record）— 2026-10-15-eval-planted-defect-probe

## 做法概述

新增 eval 第 4 个任务 `eval/tasks/004-phase-stats/`——**种植缺陷探针**：与既有 001-003（instruction 把边界逐条写明）相反，本任务指令只命名日志解析格式、配对语义与输出契约；五类隐含输入（①行序与时间序交错、②中段空行、③纯空白行/行尾空格、④未闭合 START、⑤孤儿 END）全部由固定 fixture 承载，每类有唯一合理解。verify.mjs 期望硬编码（download r1/10s、login r4/22s、upload r1/17s——未闭合与孤儿零贡献）。配套 test/eval-planted-defect-probe.test.mjs 三用例（参考解过 / naive 拒 / 无实现拒）把判别力钉进仓库测试套件。

方法对照：obra/superpowers 用种植缺陷探针量化技能行为（writing-plans v6.4.2 的 planted-defect probes 9/9 实证）。选「日志会话配对统计」题材的理由：①合理解唯一性强——乱序配对/跳空白/退化事件零贡献是唯一不荒谬的读法，不像 glob 语义（`*` 是否跨目录）存在正当分歧；②五类隐含输入可由一份固定 fixture 全部承载，判分确定；③naive 实现形态清晰（按文件邻接配对），判别力可被测试钉死。

真实 token 的 A/B 实测（`--pilot --task 004-phase-stats`）**不在本变更范围**：需 claude CLI 登录态与真实额度，且单任务双臂是评测动作不是交付物。本变更交付探针本体 + 零 token 管道验证；实测收益数据（B 臂在 Review Focus 落地后对五类隐含面的捕获率）留作探针任务的首次运行产出。

## 接口契约

- **不改动任何既有函数/命令/文件格式**。纯新增：`eval/tasks/004-phase-stats/{task.json, verify.mjs, files/data/events.log, solution/bin/phase-stats.mjs}` + `test/eval-planted-defect-probe.test.mjs`。
- eval 工具链零改动：loadTasks 按目录自动发现新任务（id 排序 004 在 003 后）；tasksFingerprint 自动纳入（指纹变化=评测分组正常演进，`--set-baseline` 语义照旧）；dry-run mixed 模式按任务号奇偶分臂（004 偶数 → A 过 B 挂）。
- 交付文件面自声明：上述 5 个新增文件，无修改面、无删除面。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. **乱序/迟到到达**：本变更无运行时输入面。fixture 的乱序行是被测对象的设计内输入（探针本体），不是本设计的风险面；verify 只读工作副本的固定产物。
2. **并发写**：verify.mjs 以子进程跑被测 CLI、只读 stdout，不写任何文件；test 用例各自在独立 mkdtemp 目录构建工作副本，无共享写面。eval 并发跑任务时每 (task,arm) 独立 workdir（workdir.mjs 既有隔离），本任务不引入新共享态。
3. **切换/生命周期**：任务目录是静态资产，无生命周期态。solution/ 不进 agent 工作副本（workdir 只复制 files/）、不进内容指纹（tasks.mjs 既有口径）——参考解后续修缮不会污染真实评测分组。
4. **作用域**：单仓单目录资产。CRLF 说明：Windows 检出下 events.log 可能带 CRLF——这是**有意的隐含面之一**（合理解=按行 trim 后解析；solution 与 naive 都在同机同 fixture 上判分，两臂公平）。verify 只比对最终 JSON，跨平台期望值一致。

## 风险与死路

- **最大风险：隐含面的「合理解」被认为不够唯一**（判分公平性）。若 B 臂实现选择另一种可辩护读法（如把未闭合 START 按「到文件末尾」计时长）会误判为失败。缓解：①五类输入全部选了唯一合理解——「未闭合不计时长」是统计语义下唯一不捏造数据的读法（捏造结束时刻无依据）；②instruction 明确「rounds=完成轮数、totalSeconds=完成轮次时长之和」，未完成轮次不属于"完成"是字面推论；③真跑前由人工抽看 A/B 失败 workdir 的 stderr 定位（verify 逐断言可定位）。
  - **设计迭代留痕（fixture v1 → v2，判分公平性红线的自我纠察）**：初版 fixture 做了**全行序打乱**——部分 END 行在文件序上先于自己 session 的 START 出现，这使「单遍扫描按 (sessionId,phase) 配对」这一最合理解必然漏配（solution 参考解自己就挂了，测试当场暴露）。全乱序下"先按时间戳排序再配对"与"单遍文件序配对"两种读法都有可辩护性，违反本条唯一性红线——已修正为**交错乱序**：跨 session 事件交错 + 行时间戳非单调（保住"行序≠时间序"的隐含面），但各 session 自身的 START 恒先于自己的 END（保住单遍配对解的唯一性）；未闭合/孤儿/多轮/空行/空白行五类隐含面全部保留，naive 判别力经测试复核不变。
- **次风险：naive 实现恰好蒙对**（判别力失真）。naive 若按行序邻接配对：首个 END（s3）在其 START 之前到达——邻接栈实现会跳过或错配，空白行会让 split 解析出 undefined 字段——无论崩溃还是错值，verify 必拒；测试钉死后该性质受回归保护。
- **评测口径风险**：B 臂轻量道（flow start）对这种小任务不经过 plan 阶段的 Review Focus 节——首轮实测若两臂无差异，可能归因于「B 臂没走到机制」而非「机制无效」。这不是本变更缺陷而是解读注意事项：届时应改用走完整 plan 流程的任务形态（或 B 臂 prompt 指定 run plan）再下结论。已记入本节供首次实测者参考。
- **放弃的方案**：
  - *glob 匹配题材*（镜像本仓 2026-10-15-module-path-glob-match 真实故障）：`*` 是否跨目录在业界存在正当分歧（minimatch vs bash），作为"隐含唯一解"不成立——弃。
  - *在 verify.mjs 里按隐含面分组计分*（如输出各盲区命中明细）：verify 契约是退出码 0/非 0（runner 口径），分组计分需要动 eval 工具链——超出本变更边界；失败定位已由逐断言 stderr 覆盖。
  - *给 instruction 加「数据可能有脏行」级别的弱提示*：会直接泄题，摧毁探针的判别力——禁区。
