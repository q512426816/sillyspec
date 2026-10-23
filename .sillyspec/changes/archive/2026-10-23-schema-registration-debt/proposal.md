---
author: flow-machine-draft
created_at: 2026-10-23T02:55:54.312Z
---
# 提案书（Proposal）— 2026-10-23-schema-registration-debt

## 动机

任务原话转写：schema 补登三键（平台仓 dogfood 欠账）

动机与背景：config validate 上线后在平台仓（multi-agent-platform）dogfood 又发现 3 个真实消费键未注册 schema：commands.scan:check（scan 漂移检查消费）、module_paths（旧字段部分工具仍用）、ui_prototype（2026-10-15-ui-proto-form-config 消费段）——校验器报未知键警告，报假警瓦解校验面信任。与变更 8 的 7 键补登同性质（发现面/校验面/示例面三同源）。用户指令链：升级 CLI＋瘦身平台仓配置（2026-10-23）——本变更为其直接后续。autopilot 直跑到底，--no-prestage 声明需求已含决策。

成功标准：
- config-schema 注册 commands.scan:check（string）/module_paths（object，legacy 旧字段）/ui_prototype.form（string，段内其他子键经占位形态免未知警告）三键，readers 如实标注；renderExample 补对应 token 行（防漂耦合测试同步过）
- config-schema.test 与 config-validate.test 全绿；平台仓 local.yaml validate 复跑零警告

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. config-schema 注册 commands.scan:check（string）/module_paths（object，legacy 旧字段）/ui_prototype.form（string，段内其他子键经占位形态免未知警告）三键，readers 如实标注；renderExample 补对应 token 行（防漂耦合测试同步过）
2. config-schema.test 与 config-validate.test 全绿；平台仓 local.yaml validate 复跑零警告

## 成功标准（可验证）

1. config-schema 注册 commands.scan:check（string）/module_paths（object，legacy 旧字段）/ui_prototype.form（string，段内其他子键经占位形态免未知警告）三键，readers 如实标注；renderExample 补对应 token 行（防漂耦合测试同步过）
2. config-schema.test 与 config-validate.test 全绿；平台仓 local.yaml validate 复跑零警告
