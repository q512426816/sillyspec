---
schema_version: 1
doc_type: module-card
module_id: release
author: zcode-knowledge-hardening-1015
created_at: 2026-10-15T09:45:00+08:00
---

# release

## 职责

版本发布面——package.json 版本号推进、R5 版本锚断言同步（test/quick-retired.test.mjs）、
npm publish 钉扎通道（DoH 解析钉扎 + 发布前预核验 + 发布后 dist-tags 双核验）、git push
main（pre-push 拦截时修复而非跳过）。

## 定位

高频复发的 chore 域（2026-10-07 ~ 10-13 一周内 7 个 release-* 变更实证）。此前发布类条目
因交付面（package.json + quick-retired 测试）无模块归属，fr-index 路径投票全部落入 auto-*
伪域；本卡为其补真域——未来发布变更触达 package.json 自动路由至此。

## 边界

- 不含 npm 包内容物变更（src/ 交付归各功能域，发布变更只在版本面+随版修复引用）
- 钉扎通道脚本属一次性 /tmp 工件不入库；通道口径以各 release 变更 FR 场景正文为准
