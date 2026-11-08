---
author: flow-machine-draft
created_at: 2026-11-03T02:53:21.837Z
---
# 任务注册表（Tasks）— 2026-11-03-distill-prompt-hardening

- [ ] task-01: 模板 propose 命令改单引号 body 并带 --from 来源标记，附单引号转义与 category 枚举（known-issues 连字符）指引
- [ ] task-02: spec_dir 段改写为「落盘前 ls 核验；悬空回落当前工作目录 .sillyspec 并留痕偏差；禁止落自建孤儿目录」，删除「自动上行无需手动同步」表述
- [ ] task-03: 新增回流确认段：propose 后显式 sillyspec platform sync（不带 --change）并按回执留痕，未连接平台则汇报未回流
- [ ] task-04: 新增查重（search --query）/同题幂等/宁缺毋滥 2-5 条指引；resume 式补上下文摘要兜底句
- [ ] task-05: test_distill.py 既有 prompt 断言同步更新，backend 知识蒸馏测试全绿
