---
author: flow-machine-draft
created_at: 2026-11-23T15:58:38.796Z
---
# 提案书（Proposal）— 2026-11-23-release-33410

## 动机

任务原话转写：发版 3.34.10 并清偿探针归档 advisory

动机与背景：
2026-11-23-probe1-bracket-path-blind 已归档但留三项 advisory：core-engine 模块文档未更新、test 目录未登记模块图、quick-retired R5 版本锚仍停 3.34.8（package.json 已 3.34.9，锚过时致测试红）。用户指示发布新版 npm 最小版本升级；用户口述 3.32.10 低于当前 3.34.9，npm 不允许降级，按最小补丁位取 3.34.10。

成功标准：
- core-engine 模块文档补探针 1 方括号字面路径行为变更说明
- _module-map.yaml core-engine 模块登记 verify-probes 同族测试文件
- package.json/package-lock 升 3.34.10，quick-retired R5 锚同步 3.34.10
- lint 绿、quick-retired 与 verify-probes 同族测试绿
- npm publish 3.34.10 成功

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. core-engine 模块文档补探针 1 方括号字面路径行为变更说明
2. _module-map.yaml core-engine 模块登记 verify-probes 同族测试文件
3. package.json/package-lock 升 3.34.10，quick-retired R5 锚同步 3.34.10
4. lint 绿、quick-retired 与 verify-probes 同族测试绿
5. npm publish 3.34.10 成功

## 成功标准（可验证）

1. core-engine 模块文档补探针 1 方括号字面路径行为变更说明
2. _module-map.yaml core-engine 模块登记 verify-probes 同族测试文件
3. package.json/package-lock 升 3.34.10，quick-retired R5 锚同步 3.34.10
4. lint 绿、quick-retired 与 verify-probes 同族测试绿
5. npm publish 3.34.10 成功
