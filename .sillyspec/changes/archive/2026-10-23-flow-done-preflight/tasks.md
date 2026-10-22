---
author: flow-machine-draft
created_at: 2026-10-22T17:10:34.488Z
---
# 任务注册表（Tasks）— 2026-10-23-flow-done-preflight

- [x] task-01: 新增 src/flow-preflight.js collectCloseoutPreflight（dirty/orphan 双源只读预检，旗标与守卫逐条镜像权威门；批准后裁剪：review.json 预验不做——design 放弃项留痕）——验证：unit 直调三镜像态
- [x] task-02: cmdFlowDone 实测门前接线（findings 非空→既有处置文案块一次报全+reportMidFail('patch')+exit 1；全过静默）——验证：temp 仓手工跑 dirty 拦与全过两态
- [x] task-03: 新增 test/flow-done-preflight.test.mjs（①dirty 命中实测未启动+一次报全+零子步标记 ②--accept-dirty-gap 放行完成收口 ③unit 镜像守卫 ④干净面预检静默）全绿——验证：node --test 该文件 + thin-done-dirty-gate 既有面回归
