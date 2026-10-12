---
author: flow-machine-draft
created_at: 2026-10-12T13:27:44.613Z
---
# 决策记录（Decisions）— 2026-10-12-review-probe-injection

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：命令行源（command）在任务书渲染路径同步执行——恶意/误配命令可拖慢渲染或产出注入文本。缓解：超时 10s + 输出帽 2KB/20 行 + fail-soft + provenance 留痕；local.yaml 本就是逐机可信配置面（与 commands.test/lint 同信任级），不新增信任边界。 试过但放弃：① CLI 内置常用探针库（启动冒烟/类名冲突 grep 等）——违反开放世界红线（内置清单永远追不上项目特有面，且天然带语言倾向），只配示例进 config-schema desc 不进运行时；② 探针产物缓存复用——渲染频率低（每评审一次），缓存引入失效复杂度不值；③ 允许探针声明 severity/FR 映射等元数据——YAGNI，第一版只要清单行，元数据等真实需求出现再加。
