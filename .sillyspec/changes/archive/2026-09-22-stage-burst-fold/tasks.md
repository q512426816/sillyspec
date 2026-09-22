---
author: qinyi
created_at: 2026-09-23 00:10:00
---
# 任务注册表（Tasks）— 2026-09-22-stage-burst-fold

> 切片按设计四 Phase：配置面→渲染面/完成面（并行）→flow 翻转→测试面收口。
> 依赖：task-02/task-03 依赖 task-01（readStageBurst）；task-05 依赖全部前序。
> 测试与实现同卡（r7 dogfood 纪律）；NEW 文件录 module-map。

## Wave 1（配置面，无依赖）
- [x] task-01: readStageBurst 配置读取 (target_files: src/run/shared.js, NEW:test/stage-burst.test.mjs)——新增 export（readLocalYamlRaw+js-yaml 读 stage.burst，env SILLYSPEC_STAGE_BURST=0/1 覆写，fail-safe false）+ 三态单测（无配置/配置 true/env 两向覆写/坏 YAML）

## Wave 2（渲染面+完成面+翻转，并行；task-02/03 依赖 task-01，task-04 独立无依赖）
- [x] task-02: burst 渲染分支 (depends_on: task-01) (target_files: src/run/stage.js)——抽取 executeNoAiCliAction（:592-629 if-链）与阶段收尾助手（:640-653），runStage 加 burst 单趟遍历分支（白名单 brainstorm/plan/execute + noAI 就地完成 + AI 步逐个 outputStep + burst 尾提示 + 全 noAI 收尾；waiting 步由 :245-254 既有硬拦前置，burst 不可达）
- [x] task-03: completeStepBurst 循环包装 (depends_on: task-01) (target_files: src/run/complete.js, src/run/command.js)——新增 export（50 轮上限/printNext:false/每轮 P0-2 合成/每轮前尾随 stale→pending 拉回/--answer 快照比对单次消费/--step 仅首轮/pm.read null 防护/整体 --output 横幅）+ :1727/:2073 两处分发按 burst 门接线（auto 路径跳过 :2064-2070 预合成）；completeStep 本体零 diff
- [x] task-04: flow 缺省翻回 legacy (target_files: src/flow.js, src/config-schema.js, test/flow-protocol.test.mjs, test/flow-route.test.mjs, test/flow-draft.test.mjs)——src/flow.js :66/:76 两处 'thin'→'legacy' + :18/:62/:124 三处文案同步 + config-schema :170 desc 同步 + 受影响测试 fixtures 补 flow: mode: thin（flow-protocol makeRepo ①②③⑤⑥、flow-route、flow-draft ⑥；断言本体不动）

## Wave 3（测试面收口，依赖 Wave 2 全部）
- [x] task-05: stage-burst 测试面 (depends_on: task-02, task-03, task-04) (target_files: NEW:test/stage-burst.test.mjs)——渲染折叠/等价性双跑 gate 判定一致/断点停失败步+progress 态一致/answer 单次消费/env 逃生阀/flow 缺省 + 全量 npm test+lint 零回归 + 本仓 local.yaml 自举（不入提交面）。注：无新 src 文件，module-map 零改动（lint 覆盖面仅 src/，test/check-syntax.mjs:122-136）
