---
id: task-03
title: W2/FR-03 code-face-key 单点 + 两指纹代码树内容键化
title_zh: W2/FR-03 code-face-key 单点 + 两指纹代码树内容键化
wave: W2
status: draft
depends_on:
  - task-01
  - task-02
goal: 纯文档提交不再击穿两类复用指纹；口径单点化
implementation: 新建 src/run/code-face-key.js：filterCodePorcelain/isNonCodePath 迁入（旧路径 re-export）+ computeCodeTreeKey（git ls-tree -r -z 过滤哈希，整树 oid 快路径，git 失败 null）；computeGateFingerprint 与 computeQualityScanFingerprint 的 HEAD 分量替换为树键
verify: node --test test/code-face-key-doc-commit-survival.test.mjs（文档提交两指纹存活/代码提交击穿/非 ASCII 路径不入代码面）
constraints: fail-open miss 语义/逃生阀/TTL 不变；ls-tree -z 防 quotepath 转义；不新增语言性扩展枚举
acceptance:
  - 纯文档提交：两指纹均存活，下轮命中复用
  - 代码提交：必失配真跑
  - ls-tree -z 解析非 ASCII 路径不误入；整树 oid 快路径；git 失败 null
target_files:
  - src/run/code-face-key.js
  - src/run/green-cache.js
  - src/run/verify-quality-scan.js
  - test/code-face-key-doc-commit-survival.test.mjs
allowed_paths:
  - src/run/code-face-key.js
  - src/run/green-cache.js
  - src/run/verify-quality-scan.js
  - test/code-face-key-doc-commit-survival.test.mjs
---

