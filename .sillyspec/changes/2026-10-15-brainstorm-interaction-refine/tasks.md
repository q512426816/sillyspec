---
author: flow-machine-draft
created_at: 2026-10-15T08:31:00.324Z
---
# 任务注册表（Tasks）— 2026-10-15-brainstorm-interaction-refine

- [x] task-01: 需求确认清单逐条带来源标记（用户原话/agent 推断两态），未确认过的推断点不得混入已确认清单
- [x] task-02: 对话式探索支持分块回放：每轮输出含 200-300 字回放块（猜测标为猜测）+ 一句「哪里不对或漏了什么」，步骤保持 repeatableWait 语义
- [x] task-03: 进入「提出 2-3 种方案」前：P1/P2 未决项为 0 或已记录为「我的判断」落 decisions.md
- [x] task-04: 分段展示设计输出含「我替你做的决定」节，条目来源为 decisions.md 中 source≠user 的条目
- [x] task-05: Design Grill 子代理派发 prompt 含实现者视角四要素（真身份/联系不到作者/只报猜错会出事的必须被回答项/显式跳过项与 nothing important left 出口），主代理回收后分三堆处理
- [x] task-06: brainstorm 阶段 prompt 含自欺逃逸口对照表（三条：够清晰、太简单、用户说听起来不错）
- [x] task-07: 发现规模超出当前档位时当场说明并给出升级建议（不改客观定价机制）
- [x] task-08: 变更自身测试面跑绿（node --test 相关用例），lint 通过
