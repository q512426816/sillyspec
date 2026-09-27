---
author: flow-machine-draft
created_at: 2026-09-27T12:57:41.422Z
---
# 需求规格（Requirements）— 2026-09-27-pushgate-green-repair

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
Given 系统就绪
When test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
Then 行为符合本条标准描述

### FR-02: 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
Given 系统就绪
When 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/doc-ref-check.test.mjs｜runDocsCheck 全量校验（93 处引用 0 失效即整文件通过）
test/config-schema.test.mjs｜renderExample 防漂耦合——每个 live 键首段+末段 token 必现（第 96 行起断言组，覆盖 FR-02 的 example 面）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：纯文档行号锚更新与 renderExample 注释行不改变任何运行行为/门档位缺省值——无独立行为断言面；回归由 FR-01 绑定的 config-schema 防漂耦合断言组旁证（example 输出面），门档位缺省值不变由 LOCAL_YAML_SCHEMA 声明面（config-schema.test 第 1-95 行 schema 断言组）覆盖
