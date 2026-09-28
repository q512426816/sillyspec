---
author: flow-machine-draft
created_at: 2026-09-28T15:20:00.000Z
---
# 任务注册表（Tasks）— 2026-09-28-sentinel-waiver-hardening

> 按实际实现路径覆写（thin-agent-tasks）。

- [x] task-01: 零提交不豁免（detectFakeCheckCompletion commits 空时 mirror=空集）＋调用方空区间分流（flow.js git log 空串照跑、quick-audit 同修）
- [x] task-02: 基线完整性锚定——三快照点写 flow-state baseline_sha256（含 fresh 路径补漏）、哨兵消费前哈希校验不符从严＋告警、route-hindsight 导出 baselineSha256
- [x] task-03: 测试与实弹——单测⑥零提交从严＋⑦锚定验证读取器；live 角度 A（零提交→拒收）、角度 C（篡改→哈希告警→拒收）、P1 绕过路径（篡改后重跑 start 洗锚——首写者胜未刷新→仍拒收）三复测通过；定向 44/44＋test:core 221/221（npm test 全量失败项逐项归因均预存/并行面）
- [x] task-04: 审查 P1/P2 修正——锚定首写者胜（三写入点守卫）、校验抽离 readBaselineTasksVerified 可单测（⑦）、quick-audit 走验证读取器、FR-06 病句与绑定同段复制勘误
