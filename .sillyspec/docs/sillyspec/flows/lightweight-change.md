---
author: qinyi
created_at: 2026-10-06T00:30:00+08:00
---
# 轻量变更流程（轻量道 / flow 协议）

## 目标

小改动默认快道：两次协议调用完成一个变更——`flow start --input "动机＋成功标准"` 起变更，`flow done` 收口。CLI 负责起草规格（proposal / requirements / design 四节 / tasks 镜像行）、边干边勾任务、三断点可控性汇报、收口亲自实测；agent 只负责干活与如实汇报。

## 参与模块

- flow.js / flow-draft.js / flow-parity.js：flow 协议、规格机器草稿、轻量↔完整对齐
- machine-draft.js：requirements/design 模板锚与机器预填
- task-tick.js / taskcard*.js：任务面勾选与进度锚（收口哨兵只读 tasks.md）
- task-review.js / review-tier.js / ceremony-*.js：评审分层与抽样（原语/决策密度命中起评审）
- run/gates.js / run/complete-handlers.js：收口门与实测对账
- quicklog.js：quick 台账（quick 道为另一快道，见各自主文档）

## 流程摘要

```
flow start --input "<动机；成功标准：；- 条目>"
  └▶ 落 changes/<名>/：proposal + requirements（成功标准锚）+ design（四节）+ tasks（镜像行）
      └▶ 三断点：① spec 批准（flow approve，机器门）② 执行确认 ③ 归档确认
            （--autopilot 声明豁免留痕）
干活（边干边勾 tasks.md；每任务单元=实现+测试绿后当场 tick）
  └▶ 交付用显式 pathspec 提交（patch 冻结件=baseline..HEAD 提交面；禁目录级 add）
flow done
  └▶ 收口对账：FR 门柱对比 / design 四节锚 / tasks 勾选证据 / 实测 test+lint
      └▶ 实测失败 → 阻断；轻量道实测失败自动升厚
```

## 关键规则

- `--input` 过门格式：动机/背景在前；独立一行「成功标准：」；每行一条 `- <可验证标准>`。
- 实测失败自动升厚；用户同意转完整道须 `--upgrade-thick`（同意门留痕）。
- 收口拒「单拍多格」勾选（勾选是进度锚，watcher 实时上平台）。
- 倒推收尾：代码先写好时 `flow start --input "<已做改动描述＋成功标准>"` 直接收口，不回头补流程。
