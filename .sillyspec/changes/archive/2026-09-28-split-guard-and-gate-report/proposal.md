---
author: flow-machine-draft
created_at: 2026-09-28T07:05:54.763Z
---
# 提案书（Proposal）— 2026-09-28-split-guard-and-gate-report

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:5357d0e15cc5f27186380f7b4c96ce90ca0c1f62cbf38cd9323e59489965856f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
任务原话转写：背景：两项工具修复。P4——成功标准摘录器把「节点与边」「页面 UI」「语言框架」这类成对短名词也被斜杠拆成两条 FR（本会话三次实证，每次人工重写加 amend-draft 留痕）；但斜杠拆分本身是 2026-09-25-fr-compound-split 的刻意设计（两侧含谓词的合取标准拆开粒度才真），只能收窄不能取消。P6——门 FAIL 时只说「命令与输出尾部见上」，排障全靠手翻 runtime 目录，且快照模式结果文件随快照清理蒸发。
成功标准：
- 摘录器斜杠拆分收窄：仅当拆分后每一段都含谓词词元（访问、生效、校验、通过等行为动词词表）才拆；成对短名词（节点与边、页面 UI、warn 错误 off 等）保持整条；分号拆分与路径形态守卫行为不变
- 门 FAIL 三件套透传：失败行样本（前五条）、结果 JSON 全路径、可直接粘贴重放的批命令，在测试门 FAIL 输出处一并打印
- 快照证据回拷：快照模式测试门 FAIL 时，快照内 verify-runs 结果目录回拷主仓 runtime 后再清理，排障证据不再蒸发
- 既有 fr-compound-split 测试扩展锁定新边界：谓词双侧拆分保留、名词对不拆、路径与分号行为不变
- 同文件他会话在途改动零夹带（flow-draft 与 quick-audit 提交前逐 hunk 核对）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d3590f108f1467c54063a62cfe021392b466070fadf8f03d62d0755ce7077650:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 摘录器斜杠拆分收窄：仅当拆分后每一段都含谓词词元（访问、生效、校验、通过等行为动词词表）才拆
2. 成对短名词（节点与边、页面 UI、warn 错误 off 等）保持整条
3. 分号拆分与路径形态守卫行为不变
4. 门 FAIL 三件套透传：失败行样本（前五条）、结果 JSON 全路径、可直接粘贴重放的批命令，在测试门 FAIL 输出处一并打印
5. 快照证据回拷：快照模式测试门 FAIL 时，快照内 verify-runs 结果目录回拷主仓 runtime 后再清理，排障证据不再蒸发
6. 既有 fr-compound-split 测试扩展锁定新边界：谓词双侧拆分保留、名词对不拆、路径与分号行为不变
7. 同文件他会话在途改动零夹带（flow-draft 与 quick-audit 提交前逐 hunk 核对）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7377341074e9ab38aee0d78f2017335bfb72d22be5750135993a92ebabdf5e20:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
1. 摘录器斜杠拆分收窄：仅当拆分后每一段都含谓词词元（访问、生效、校验、通过等行为动词词表）才拆
2. 成对短名词（节点与边、页面 UI、warn 错误 off 等）保持整条
3. 分号拆分与路径形态守卫行为不变
4. 门 FAIL 三件套透传：失败行样本（前五条）、结果 JSON 全路径、可直接粘贴重放的批命令，在测试门 FAIL 输出处一并打印
5. 快照证据回拷：快照模式测试门 FAIL 时，快照内 verify-runs 结果目录回拷主仓 runtime 后再清理，排障证据不再蒸发
6. 既有 fr-compound-split 测试扩展锁定新边界：谓词双侧拆分保留、名词对不拆、路径与分号行为不变
7. 同文件他会话在途改动零夹带（flow-draft 与 quick-audit 提交前逐 hunk 核对）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
