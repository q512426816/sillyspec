---
author: flow-machine-draft
created_at: 2026-09-24T17:20:40.225Z
---
# 提案书（Proposal）— 2026-09-25-thin-review-slice

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:7887489886c41a9556747632b47ff804b405b2be612e70223423c540544dd285:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
任务原话转写：动机：薄道唯一缺失的质量件——独立评审。撞实验 5 个 P1 全由独立评审抓住，薄道目前测试绿即过、无第二双眼睛。定档采用危险证据累积制（体积/文件数出局）：高危交付语义词一票升级；盲维四问有实质作答=该维风险面（作答即信号，不另造问卷）；交付 diff 原语扫描；决策密度 editRatio；--review/--no-review 声明一票。缺省要评审、豁免要多证并举，豁免者按 1/4 定额抽查采样进遥测（误豁免率可校准）。
成功标准：
- flow done 新增 review 子步（patch 后）：定档→需评审且 review.json 缺失则打印评审任务书（材料包+盲维检查单+预算帽+只读纪律+schema 契约）exit 1 断点续；review.json 在场则校验，FAIL 或 P1 发现拦截并列明细，修复后删件重评
- 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈任一即需评审；全部不命中且无声明才豁免；豁免变更 1/4 定额抽查采样
- flow start 支持 --review/--no-review 声明通道（落 flow-state），简报预告定档机制
- 评审结果进 flow-telemetry（required/sampled/verdict/发现数）
- 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flow 系全绿且既有夹具零采样碰撞
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b3d0f0918f02dc822fcc0087366c8aa64fb0e48b5e22f3a48769cfcd712e4e86:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. flow done 新增 review 子步（patch 后）：定档→需评审且 review.json 缺失则打印评审任务书（材料包+盲维检查单+预算帽+只读纪律+schema 契约）exit 1 断点续；review.json 在场则校验，FAIL 或 P1 发现拦截并列明细，修复后删件重评
2. 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈任一即需评审；全部不命中且无声明才豁免；豁免变更 1/4 定额抽查采样
3. flow start 支持 --review/--no-review 声明通道（落 flow-state），简报预告定档机制
4. 评审结果进 flow-telemetry（required/sampled/verdict/发现数）
5. 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flow 系全绿且既有夹具零采样碰撞
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:780ea4f2a2307827223cfec3a01e3f73b1b7e38aca3bcbaae7563479b44a9387:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
1. flow done 新增 review 子步（patch 后）：定档→需评审且 review.json 缺失则打印评审任务书（材料包+盲维检查单+预算帽+只读纪律+schema 契约）exit 1 断点续；review.json 在场则校验，FAIL 或 P1 发现拦截并列明细，修复后删件重评
2. 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈任一即需评审；全部不命中且无声明才豁免；豁免变更 1/4 定额抽查采样
3. flow start 支持 --review/--no-review 声明通道（落 flow-state），简报预告定档机制
4. 评审结果进 flow-telemetry（required/sampled/verdict/发现数）
5. 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flow 系全绿且既有夹具零采样碰撞
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
