---
author: flow-machine-draft
created_at: 2026-09-24T18:12:42.771Z
---
# 提案书（Proposal）— 2026-09-25-thin-platform-args

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:7b6bfe22485cbf21c0abe434d53ffa907acd478a19ee3b8db8ad4480d4289d7b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
任务原话转写：动机：平台侧（multi-agent-platform）三子代理核对实证——flow 命令族零平台参数支持：--spec-dir 对 start 是 ENOENT 崩溃路径（PM 未锚定 specBase，change 目录建在本地）、预建目录被当 legacy 拒收、不读 .sillyspec-platform.json 指针、--spec-root/--runtime-root 静默忽略、变更名零校验（穿越名实测逃逸）。平台 thin 派发被完全挡住，上游先修。
成功标准：
- cmdFlow 的 specBase 改经 resolvePlatformSpecDir（显式 --spec-dir/--spec-root > 平台指针 > 本地），指针失效 fail-closed 报错不静默回退；--runtime-root 透传 resolveRuntimeRoot
- cmdFlowStart/Done 的 ProgressManager 全部以 specDir=specBase 构造（DB 行、change 目录、归档链与工件同根，ENOENT 消失）；平台 writer 预建的空变更目录放行为全新 start（非空且无头脑风暴产物仍拒）
- flow start/done/amend-draft 变更名白名单校验（拒穿越/default/quick-hex/分隔符，exit 2 给合法格式）
- 清晰度门两选一文案补过门格式样例（独立节头行+列表行）
- 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留）、空目录预建放行、名称校验四态、指针恢复；flow 系全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:ed7744f40bd03fb6478cc3536af6ef84dc7e4423e71df4a8dd1b957e0ac9a796:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. cmdFlow 的 specBase 改经 resolvePlatformSpecDir（显式 --spec-dir/--spec-root > 平台指针 > 本地），指针失效 fail-closed 报错不静默回退；--runtime-root 透传 resolveRuntimeRoot
2. cmdFlowStart/Done 的 ProgressManager 全部以 specDir=specBase 构造（DB 行、change 目录、归档链与工件同根，ENOENT 消失）；平台 writer 预建的空变更目录放行为全新 start（非空且无头脑风暴产物仍拒）
3. flow start/done/amend-draft 变更名白名单校验（拒穿越/default/quick-hex/分隔符，exit 2 给合法格式）
4. 清晰度门两选一文案补过门格式样例（独立节头行+列表行）
5. 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留）、空目录预建放行、名称校验四态、指针恢复；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:d86f2dcdc0c6d29f760feb7a2354c76ce07a871d39c06087347c58d31bcb0674:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
1. cmdFlow 的 specBase 改经 resolvePlatformSpecDir（显式 --spec-dir/--spec-root > 平台指针 > 本地），指针失效 fail-closed 报错不静默回退；--runtime-root 透传 resolveRuntimeRoot
2. cmdFlowStart/Done 的 ProgressManager 全部以 specDir=specBase 构造（DB 行、change 目录、归档链与工件同根，ENOENT 消失）；平台 writer 预建的空变更目录放行为全新 start（非空且无头脑风暴产物仍拒）
3. flow start/done/amend-draft 变更名白名单校验（拒穿越/default/quick-hex/分隔符，exit 2 给合法格式）
4. 清晰度门两选一文案补过门格式样例（独立节头行+列表行）
5. 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留）、空目录预建放行、名称校验四态、指针恢复；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
