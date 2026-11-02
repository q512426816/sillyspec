---
author: flow-machine-draft
created_at: 2026-11-02T08:52:22.389Z
---
# 决策记录（Decisions）— 2026-11-02-knowledge-engine-tail

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：**风险**：① 向量路径融合新增冷缓存图构建（~7.1s 首次）——接受项，写明；② 遥测口径变化影响 knowledge-stats 历史解读——文档同步 + neverHit 语义不变（仍按查询通道）；③ section doc-refs 过滤减少边数（预期降幅写入设计），scope 对手工条目的召回面收窄——只影响裸名词引用，可接受。 **放弃的方案**：① 遥测把 scope 全部并入 matchedFiles——20 条 scope 决策会让 neverHit 失真（每次 flow start 反复计命中）；② 统一 standalone 到 getKnowledgeGraph——同进程陈旧图有实测（先 get 后改知识再 get 仍返回旧图），收益仅省 45ms；③ doc-refs 过滤用「盘上存在」——图会依赖构建时文件系统状态、缓存指纹不覆盖目标存在性；④ frCount 改注释保留——死字段继续误导，直接删除。
