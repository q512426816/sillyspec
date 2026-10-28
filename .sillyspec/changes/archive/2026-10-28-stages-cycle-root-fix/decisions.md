---
author: flow-machine-draft
created_at: 2026-10-28T05:45:45.555Z
---
# 决策记录（Decisions）— 2026-10-28-stages-cycle-root-fix

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险是环不只这一条（同一子树可能还有其他模块静态引 stages/index.js 系），断此边后换入口形态仍撞——对策：诊断脚本全子树扫描确认 run/shared.js 是唯一回边（常量/进度等直引者不在 execute.js 子树内），并加 FR-02 静态断言锁死该文件的 import 面防复潮。次级风险：动态 import 首调有微小延迟（<1ms，模块已缓存路径无感）——getStageSteps 非热路径，可忽略。 放弃的方案：① 改 stages/index.js 把 stageRegistry 惰性化（getter/工厂）——所有消费方 API 面翻动，风险远大于收益；② 断 execute.js → knowledge-hits 边——那是知识遥测的正当依赖方向，反向把 appendKnowledgeHit 惰性化属错位修补（环的成因在 run/shared 这个共享库背了重依赖，不在知识链）；③ 把 stageRegistry 挪到轻叶子模块——注册表定义与阶段定义文件强耦合，搬家动 10+ 文件。
