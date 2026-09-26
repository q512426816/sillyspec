---
author: flow-machine-draft
created_at: 2026-09-26T10:50:12.875Z
---
# 提案书（Proposal）— 2026-09-26-full-autopilot-parity

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:9f78e842ca64b550682eb070795dff358e0adb815c72ca9bf2f06c3f309b84ae:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
任务原话转写：动机：governance-autopilot 三条中自动勾选与自动绑定可直接迁移到完整流程（R21 thin 实证：治理手工操作从 25 轮压到 2 轮，token 14.4M 反超 OS）。完整流程的对应痛点：execute 阶段 agent 手动勾 tasks.md（与 thin 同款滞后行为）、verify 阶段 agent 手写测试绑定（同款空槽冷启动）。两条迁移点不同但逻辑同源。
成功标准：
- execute --done 自动勾选：execute 阶段完成路径（detectExecuteBatchFinish 后/或 --done 收口）解析 run 内提交的 task-NN token，自动勾选 tasks.md 未勾条目——与 thin 的 flow done 同逻辑
- verify --done 自动绑定：verify 阶段收口测试门之后（test-result.json 已生成），从测试结果自动补全空绑定槽——与 thin 同逻辑（逐行扫描），时点在 verify 而非 flow done
- GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——brainstorm 步骤 8 已有 design 可参考，机器预填从 design 推导是后续独立变更）
- 两条均向后兼容（已有内容不覆盖）；测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d82ed99083bcab17c00cbfd31476b82fab0da54da2629e73bc34ccca8a0f90a2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. execute --done 自动勾选：execute 阶段完成路径（detectExecuteBatchFinish 后/或 --done 收口）解析 run 内提交的 task-NN token，自动勾选 tasks.md 未勾条目——与 thin 的 flow done 同逻辑
2. verify --done 自动绑定：verify 阶段收口测试门之后（test-result.json 已生成），从测试结果自动补全空绑定槽——与 thin 同逻辑（逐行扫描），时点在 verify 而非 flow done
3. GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——brainstorm 步骤 8 已有 design 可参考，机器预填从 design 推导是后续独立变更）
4. 两条均向后兼容（已有内容不覆盖）
5. 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:879e97fc2a132e974128b868d308e51f1ae32620f8df918496191374c2e43744:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
1. execute --done 自动勾选：execute 阶段完成路径（detectExecuteBatchFinish 后/或 --done 收口）解析 run 内提交的 task-NN token，自动勾选 tasks.md 未勾条目——与 thin 的 flow done 同逻辑
2. verify --done 自动绑定：verify 阶段收口测试门之后（test-result.json 已生成），从测试结果自动补全空绑定槽——与 thin 同逻辑（逐行扫描），时点在 verify 而非 flow done
3. GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——brainstorm 步骤 8 已有 design 可参考，机器预填从 design 推导是后续独立变更）
4. 两条均向后兼容（已有内容不覆盖）
5. 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
