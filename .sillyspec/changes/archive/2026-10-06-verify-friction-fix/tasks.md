---
author: flow-machine-draft
created_at: 2026-10-06T13:38:06.171Z
---
# 任务注册表（Tasks）— 2026-10-06-verify-friction-fix

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-verify-friction-fix --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-verify-friction-fix` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: verify-probes --init --force 覆盖前自动落带时间戳备份到 .sillyspec/.runtime/verify-runs/ 并打印备份路径；新增 --refresh-probes 定向刷新：只刷新未手填的探针预填段，已手填段保留并逐段报告跳过原因
- [x] task-02: sillyspec gate last --change <名> 直接打印 gate-last 指针内容与 blocked 明细（含 reconcile missing/undeclared 摘要），exit code 反映是否存在阻断；sillyspec runtime list 的 KNOWN 清单登记 verify-runs
- [x] task-03: plan postcheck YAML 硬门报错按 js-yaml 错误类型分诊：至少覆盖半角冒号（mapping values are not allowed）、保留指示符（cannot start any token，含反引号）、流序列（expected , or ]）三类，各给中文修复动作；新增 sillyspec taskcard validate [--all|--task task-NN] 独立校验命令（frontmatter/必要字段/占位符/target_files 形态），失败 exit 1
- [x] task-04: API_FACE_DECLARED_RE 宽收同义声明（无接口变更/不涉及接口/零端点/无端点/0 端点），design 骨架接口段 TODO 注释附可直接粘贴的声明句式；宽收有回归测试钉住
- [x] task-05: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
