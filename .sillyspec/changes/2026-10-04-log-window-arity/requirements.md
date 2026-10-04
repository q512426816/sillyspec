---
author: flow-machine-draft
created_at: 2026-10-04T16:16:16.959Z
---
# 需求规格（Requirements）— 2026-10-04-log-window-arity

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: B4 救赎窗口的 git log 裸计数改为 -n 形态，救赎 note 路径恢复生效且既有 D7 断言转绿

- 系统 MUST 以 -n 形态调用救赎窗口的 git log（裸计数在 git 2.4x 是 ambiguous argument fatal，fail-open 静默吞致窗口源从未收集），且 D7 夹具须真实构造「B1 源缺席+porcelain 恒空」的救赎前提

#### 场景：分支窗口救赎

Given 主干非 main 命名的仓、变更分支上有 per-task 提交、工作树干净
When reconcileTargetFiles 对账
Then 声明文件经分支 log 窗口命中救赎，notes 含「对账救赎」且未声明文件不误救

### FR-02: 既有测试回归绿且 lint 零死导出

- 系统 MUST 在既有测试全绿与 lint 零告警下交付（plan-target-files 全量用例回归）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/plan-target-files.test.mjs「D7 分支锚定救赎」正负例（救赎 ok+note 在场+never.js 不误救）
FR-02: test/plan-target-files.test.mjs 全量用例 + node test/check-syntax.mjs（收口由 CLI 实测门复跑）
