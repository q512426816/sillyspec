---
author: flow-machine-draft
created_at: 2026-10-09T03:58:40.335Z
---
# 设计记录（Design Record）— 2026-10-09-fourpiece-created-at-local

## 做法概述

`src/index.js` fourpiece-init case 的 `fpStamp` 由 `new Date().toISOString().slice(0,19)` 改为 `datetime.js nowWallClock()`——与 taskcard.js:238、design-init（index.js:2282-2287，`await import('./datetime.js')` 同款注入面）同口径。选生成端修复而非读取端兼容：datetime.js 头注已立规「frontmatter 人读时间字段统一本地墙钟」，CLI readBirthTs（Date.parse 裸形状按本地）与平台 `_read_born_at` 透传 + 前端本地解析都是既定读取口径，读取端为 UTC 旧值猜时区反而引入歧义。死变量 `fpDate`（toISOString 日期切片，case 内仅定义无消费）一并移除。

## 接口契约

命令行输出与文件结构零变化；唯一行为变化：三件骨架 frontmatter `created_at` 值从「UTC 数字的裸形状」变为「本地墙钟 YYYY-MM-DD HH:mm:ss」。无函数签名变化（case 内局部常量替换）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——单次 CLI 调用内同步计算时间戳并写盘，无事件流、无乱序面。
2. 并发写：既有幂等保护不变（已存在不覆盖）；两进程并发首生同 change 目录的竞态是既有行为，本次只换时间戳来源，不新增竞态面。
3. 切换/生命周期：无状态；进程中断最坏留下已写的骨架，重跑不覆盖属既有幂等语义，不受时间戳来源影响。
4. 作用域：时间戳取进程本机时区的本地墙钟——这正是口径（人读本机时间）；跨时区机器各自生成各自的本地墙钟，git 合并面不含 frontmatter 时间字段冲突基线，不串台。

## 风险与死路

最大风险：存量已写 UTC 的 `created_at` 不自愈（如 2026-10-09-workspace-init-skill-gate 的 requirements/proposal 02:04:06），时间线对旧变更仍显示旧错值——接受：历史工件不改写，变更事实以 watcher 事件流为准，新变更起生效。试过放弃的方案：①读取端按 UTC 解析无时区裸形状——无法区分「本地墙钟约定值」与「UTC 误写值」，猜错方向比不猜更糟；②created_at 显式带时区偏移（+08:00）——与 datetime.js 立的「YYYY-MM-DD HH:mm:ss 形状」约定冲突，牵动 CLI/平台全部读取面，超出本修范围。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/index.js | fourpiece-init `fpStamp` 改 `nowWallClock()`（约 2175-2177 行），移除死变量 `fpDate` |
| 修改 | test/fourpiece-init.test.mjs | 新增本地墙钟窗回归用例（三件骨架 created_at 落窗断言） |
