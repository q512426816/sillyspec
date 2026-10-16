---
author: flow-machine-draft
created_at: 2026-10-16T08:28:38.146Z
---
# 任务注册表（Tasks）— 2026-10-16-ci-linux-residual-fix

- [x] task-01: test/backlog-batch-a.test.mjs 在 linux 与 windows 双端退出码 0（12/12 通过）
- [x] task-02: test/feedback-batch2-hardening.test.mjs 双端退出码 0；⑥ 段 linux 钉「大小写不符如实落②类不放水」、win32/darwin 钉「折叠命中」，./ 前缀+尾部注记与 NEW 未建两项跨平台钉死
- [ ] task-03: 本地 Linux 容器内全量 npm test 零失败（818 文件）
- [ ] task-04: 推送后 CI test job 转绿（lint/docs-gate 维持绿）
- [ ] task-05: 零回归：两文件其余断言、src 实现（quicklog.js/verify-postcheck.js）行为不改
- [ ] task-06: src/verify-postcheck.js 裸 NUL 字节替换为 \u0000 转义（grep/rg 不再判二进制）且运行时字符串值逐字节不变
- [ ] task-07: src/run/shared.js EOL 假 M 探测改 --numstat（git ≤2.43 静默失效修复）+ 源码钉（quick-audit-foreign-residue 5/5 三端绿）
