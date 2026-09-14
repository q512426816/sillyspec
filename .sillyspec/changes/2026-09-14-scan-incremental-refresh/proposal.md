---
author: qinyi
created_at: 2026-09-14 03:19:07
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
scan 产物漂移的信号侧四路已通（scan-staleness / scan diff / archive-delta 建议 / last-delta 回灌），但刷新执行无闭环：agent 定点补文档后 source_commit 不推进，漂移信号永久重报旧账，唯一官方路径是全量 `run scan --standard --force-rescan`。用户需求（2026-09-14）：「scan 能不能在有基础扫描版本基础上，通过 commit 内容版本差异去更新文档，不要全量」。前世依据：D-7 设计稿方案 A 落地为信号（scan diff），刷新形态原意为「agent 按清单定点补」；知识库 decisions/core-engine.md D-001@v1 把增量划归 scan 域——本变更即该域立项承接。

## 关键问题
1. 增量补丁不闭环：基线不推进 → 信号永久重报、补过/没补过分不清（D-003@v2）
2. 编辑拍被覆盖保护掐死：guard 只写不删 + 7/40 位哈希错配恒拦（Grill P1-1 实证，D-007@v1）
3. 脏工作区语义缺口：diff 只看已提交而本仓常态脏，盖章会把未验证状态盖成已验证（D-004@v1）

## 变更范围
新增 `sillyspec scan refresh` 两拍命令（只读工单拍 + 盖章拍）；per-doc 基线分组 diff；bumpScanDocBaselines 独立盖章函数；scan-diff/scan-staleness 基线聚合改最旧；worktree-guard 加法握手 + 7/40 归一化修复；检出极限如实声明。详见 design.md 文件变更清单（12 项）。

## 不在范围内（显式清单）
- 不碰模块卡 / _module-map.yaml 结构 / knowledge（D-001@v1——已有各自维护通道，refresh 越界变第三写入方）
- 不做自动/定期刷新（D-7 方案 D 已排除）
- 不撤不改 scan-staleness advisory 语义（D-006@v1，仅聚合口径对齐）
- 不做无引用论断的语义级过期检测（检出极限，如实声明）
- 不动 scan facts 全量幂等（顺带重跑即可）

## 成功标准（可验证）
- e2e：临时 git 仓跑通 refresh→编辑→--done 全链路，受影响文档 source_commit 推进、未受影响不动；下轮 scan diff 从新基线起算
- 门控：无基线/非祖先/quick 浅文档/dirty 四类拒绝路径各有测试；软门 --force 可越
- guard：白名单内编辑放行、白名单外保护不变、存量 guard 行为回归测试、7-40 位混合归一化用例
- 全量 npm test 通过 + lint 0 告警 + docs check 全过
