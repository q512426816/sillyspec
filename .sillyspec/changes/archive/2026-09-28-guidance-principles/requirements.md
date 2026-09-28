---
author: flow-machine-draft
created_at: 2026-09-28T05:35:51.109Z
---
# 需求规格（Requirements）— 2026-09-28-guidance-principles

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 原则档案一——工具引导产物语言生态中立
Given sillyspec 面向任意技术栈的多仓
When 生成须知、探针文案、骨架、任务书等引导产物
Then 不绑定语言、框架、包管理器、构建工具；生态命令由仓与项目自描述，agent 就近发现

### FR-02: 原则档案二——门位原则
Given 设计检查与门禁的挂载时机
When 评估挂载位置
Then 与错误修复成本匹配：方向性错误开工引导、局部文本错误过程测试加收口兜底、累积性漂移三层都要；不把所有检查堆在收口

### FR-03: UI 执行须知改写为四条原则版
Given UI 触达变更开工
When 须知注入
Then 四条原则在位：定稿原型必须是可复跑真码产物、开工先就近发现本项目管线（多项目仓按触达路径就近）、手绘单文件仅限一次性粗选、视觉降级须用户裁决留痕；零生态词零命令零配置

### FR-04: brainstorm 阶段注入
Given 头脑风暴方案对比步渲染 prompt
When 变更目录语料命中 UI 触达检测
Then 注入同一 UI 执行须知；无命中替换空串；异常 fail-soft 单行说明；占位符入指纹掩蔽清单

### FR-05: 引导输出断言测试
Given 引导构建函数输出
When 跑断言测试
Then 输出不含生态命令词形态（检查输出而非源码文本——源码为探测示教注释引用合法）

### FR-06: 既有 ui-visual 测试同步
Given 须知内容改写
When 跑既有测试
Then 新原则关键词断言在位（真码产物、就近发现、仅限一次性粗选、生态词零命中）

### FR-07: 过程与收口双时机触发
Given 引导文件被修改
When 动态测试推断
Then 断言测试自动入实测面（agent 写完即跑为过程拦、flow done 实测为收口拦）

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：原则档案本体（本条 FR 即档案，归档 distill 入索引即验收）
不适用：原则档案本体（本条 FR 即档案，归档 distill 入索引即验收）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：原则档案本体（同上）
不适用：原则档案本体（同上）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs「buildUiGuidanceLines：仓中立 + 证据约定与探针同源」（含真码产物、就近发现、仅限一次性粗选、生态词零命中断言）
test/ui-visual-guidance.test.mjs「buildUiGuidanceLines：仓中立 + 证据约定与探针同源」（含真码产物、就近发现、仅限一次性粗选、生态词零命中断言）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/prompt-placeholders.test.mjs 回归全绿（掩蔽清单变更零破坏）；注入块 fail-soft 与空串替换由 detectUiTouch 既有单测与 node --check 覆盖
test/prompt-placeholders.test.mjs 回归全绿（掩蔽清单变更零破坏）+ 注入块 node --check；语料检测为 detectUiTouch 既有单测锁定

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/guidance-output-neutrality.test.mjs 全部 3 用例
test/guidance-output-neutrality.test.mjs 全部 3 用例（node --test 实测 16/16 全绿）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs 同 FR-03 用例（增 4 断言）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：机制属性（动态测试推断按 import 依赖自动绑定 test/guidance-output-neutrality.test.mjs——本变更收口实测即实证）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：FR-01~07 已覆盖全部交付面（原机器摘录第 8 条为「双时机触发」语义并入 FR-07）
