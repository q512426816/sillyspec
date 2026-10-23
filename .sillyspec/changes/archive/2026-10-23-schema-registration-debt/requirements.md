---
author: flow-machine-draft
created_at: 2026-10-23T02:55:54.312Z
---
# 需求规格（Requirements）— 2026-10-23-schema-registration-debt

## 功能需求

### FR-01: config-schema 注册 commands.scan:check（string）/module_paths（object，legacy 旧字段）/ui_prototype.form（string，段内其他子键经占位形态免未知警告）三键，readers 如实标注；renderExample 补对应 token 行（防漂耦合测试同步过）

- 三键 MUST 注册进 config-schema（commands.scan:check: string / module_paths: object legacy / ui_prototype.form: enum real-code|single-html＋扩展子键占位），readers 如实；renderExample MUST 补对应 token（防漂耦合测试过）；两套件 MUST 全绿；平台仓 local.yaml validate 复跑 MUST 零警告。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: config-schema.test 与 config-validate.test 全绿；平台仓 local.yaml validate 复跑零警告

- 三键 MUST 注册进 config-schema（commands.scan:check: string / module_paths: object legacy / ui_prototype.form: enum real-code|single-html＋扩展子键占位），readers 如实；renderExample MUST 补对应 token（防漂耦合测试过）；两套件 MUST 全绿；平台仓 local.yaml validate 复跑 MUST 零警告。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯注册面元数据补登（无行为面——校验器消费 schema 自动跟随），既有套件即验证
FR-02: 不适用：纯注册面元数据补登（无行为面——校验器消费 schema 自动跟随），既有套件即验证
