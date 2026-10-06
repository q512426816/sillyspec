---
author: flow-machine-draft
created_at: 2026-10-06T13:38:25.147Z
---
# 决策记录（Decisions）— 2026-10-06-resume-domain-flip

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：mtime 不可信场景误剔——工具保留旧 mtime（cp -p / 归档解包）落进未跟踪区且恰在本变更期间成为交付面。对称面：收口冻结面（collectFreezeFiles）不做此过滤，未提交交付仍走「无法归属警告/--freeze-dirty」既有出口，路由面少一个域只是 advisory 注入变窄，不丢审计事实。clock skew：出生时刻与 mtime 同机同时钟，无跨机比较。 试过放弃①：按路径形态过滤（排除 .claude/ 等目录）——开放世界枚举，写死目录清单必漏新形态，违反本变更自己的成功标准，放弃。 试过放弃②：fresh 时把 porcelain 未跟踪面快照进 flow-state、重入时对照差集——状态面翻倍且 flow-state 并入 patch 冻结件的口径要跟着改；快照后文件被本会话编辑的差集判定仍要回退到 mtime，多一层状态没有多一层判据，放弃。 试过放弃③：在 changedFilesSinceBaseline 内部加过滤参数——fr-rot-precision ⑥ 源码钉断言调用形态 `changedFilesSinceBaseline(cwd, st.baseline_commit)`，改签名要么破坏钉要么连带改三个消费面（resume 路由/dirty 计数/收口测试门），收口测试门语义不该被路由面需求带着动，放弃，改在调用侧包裹。
