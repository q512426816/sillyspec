---
author: flow-machine-draft
created_at: 2026-10-21T14:30:01.939Z
---
# 决策记录（Decisions）— 2026-10-21-cli-manifest-since-cache

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：**缓存与服务器清单脱钩后的幻影行**（缓存含服务器已不存在的行 → 每轮生成 no-op delete op）。诱因仅限缓存文件被外部破坏或服务器纪元更换；防线三层——spec_version 倒退检测全量对账、inc_count 定期全量对账（默认 50 轮）、`SILLYSPEC_SPEC_SYNC_FULL=1` 逃生门；幻影 delete 在服务端本就是无行 no-op（R-07），changes/ 整删另有 computeSpecOps 空树守卫兜底。次风险：缓存文件体积与全量清单同量级（2MB 级）——本地磁盘无压力，读取 <50ms（实测量级），可接受。 放弃的方案：① 只存游标不存 files（每次让服务器返回「游标后全量」）——服务器需新语义（返回基线+增量两段）且无合并锚，协议复杂化；② ETag/If-None-Match 整体未变短路——无变化场景才有效，任何单行变化仍全量 2.2MB；③ 服务器端存客户端会话——有状态、多机 CLI 各自游标互踩，与无状态端点原则冲突。
