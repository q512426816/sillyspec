---
author: flow-machine-draft
created_at: 2026-09-30T02:48:56.680Z
---
# 决策记录（Decisions）— 2026-09-30-docs-gate-zero

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：repo:// 转换后本仓 docs gate 与 sillyhub 仓漂移耦合——hub 侧后续演进使已转换引用失效时，配置了映射的设备上本仓推送被 gate 拦。这是 ratchet 的设计内语义（279→0 的清偿本身证明引用当前全部有效；失效即可见即修），未配映射设备零影响。 弃案：① local.yaml skip 藏数——与「真欠账清零」相反，且 local.yaml 是 gitignored 机器配置不随仓传播，他设备失效数反弹；② doc_type: snapshot 豁免——这批是活文档（spec 主场文档），冻结语义失真且豁免面随文档新增不可控；③ 让 docs-check 支持裸路径跨仓自动解析——引入路径猜测歧义（本仓与目标仓存在大量同名 router.py/service.py，预演实测 service.py 86 候选/router.py 86 候选），repo:// 显式前缀正是为消歧而设的既有机制，不应绕过。
