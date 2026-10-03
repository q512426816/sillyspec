---
author: flow-machine-draft
created_at: 2026-10-03T05:37:23.770Z
---
# 需求规格（Requirements）— 2026-10-03-splitgwt-direct-test

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: splitGwtSeparator 直测三态——导出获得消费方
Given flow-draft.js 导出的 splitGwtSeparator（批次1 新增，括号深度感知 When/Then 分隔扫描）
When test/flow-draft.test.mjs 以 import 消费该导出并直测
Then 三态断言全绿：括号内分隔符（→/嵌词则）不切返回 null；括号外 →/则/使得 切分返回两段（首个深度 0 分隔符生效、后续括号内容原样保留）；空输入返回 null

### FR-02: pre-push lint 门「未引用导出」清单归零
Given 22e-b 死导出裁决的 lint 检查（src+test 其余文件零引用的导出拦截）
When splitGwtSeparator 有测试消费方后重跑 pre-push
When lint 门不再拦截 push，「未引用导出」清单不含该符号

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「⑧ splitGwtSeparator 直测：括号深度感知三态」——7 组断言（括号内不切×2、括号外切×3、混合边界×1、空输入×1）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：push 门实测（flow done 收口后由主会话执行 git push，门过即为验收——lint 检查器为 test/check-syntax.mjs 既有面，不由本变更改动）
