---
author: qinyi
created_at: 2026-09-18 08:10:00
---

# 任务清单（Tasks）

- [x] task-01: collectProbe8DiffFiles——diff 源三态 fallback（worktree 双源/in-place 含已提交/design-list）+ 文件分类规则（后缀+目录+.vue frontend）+ design 差集 advisory (depends_on: )
- [x] task-02: extractFrontendPayloadFields——三后缀提取（formData/payload/请求邻近窗口 DTO 键/name 属性/vue v-model/wxml value）+ URL 段边界关联 + escape hatch + 归一 (depends_on: task-01)
- [x] task-03: extractBackendFields 两趟——Controller 端点定位（类级+方法级拼接）+ @RequestParam 修正正则三态 + @RequestBody 类型收集 + 必填三形态 + 二趟全仓 DTO/实体解析 + 非 Java 跳过 (depends_on: task-01)
- [x] task-04: comparePayloadFields 纯函数+骨架 direct-compare 子段渲染（命中统计+明细行+advisory 档+渲染行不误中锚点） (depends_on: task-02, task-03)
- [x] task-05: runProbe8PayloadParity diff 源切换接线（collectProbe8DiffFiles 替换 parseFileChangeListDetailed 调用点+模式注记） (depends_on: task-01, task-04)
- [x] task-06: 测试补全——NEW test/probe8-direct-compare.test.mjs（~35 断言）+ 既有 probe8 两文件适配 (depends_on: task-01, task-02, task-03, task-04, task-05)
