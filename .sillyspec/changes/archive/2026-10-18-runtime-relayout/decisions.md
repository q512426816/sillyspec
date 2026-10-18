---
author: flow-machine-draft
created_at: 2026-10-18T06:08:48.594Z
---
# 决策记录（Decisions）— 2026-10-18-runtime-relayout

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 锚点：flow.js/index.js/task-tick.js/complete-handlers.js
- 答案：- **最大风险：读写点遗漏**（19 类家族散布 ~25 个源文件，读点比写点多——watcher-events 有 flow.js/index.js/task-tick.js/complete-handlers.js 四处读点）。对策：逐家族 grep 全仓读写点清单化（设计已列写入点文件清单），测试面 26 个既有测试文件做回归网，漏改即路径断裂当场暴露。 - **次风险：混版本并发窗口**旧进程写根目录——迁移幂等 + prune 双路径兜底，窗口内最坏情况是文件短暂在旧位置（读点已切新会读不到）→ 迁移重入收敛；db 备份/日志无状态语义，风险趋零。 - 试过放弃的方案：①`state/<change>/` 按 change 建子目录（prune 可 rm -rf 单目录更优雅）——文件名构造面翻倍、迁移映射复杂化，弃；②只做归档回收不动布局——根目录仍混放单例/日志/脚本，用户"统一下一级+temp"诉求不满足，弃；③迁移 sillyspec.db 进子目录——doctor 候选路径/平台指针/WAL 侧车多点引用，单文件非乱源，收益小于风险，弃。
