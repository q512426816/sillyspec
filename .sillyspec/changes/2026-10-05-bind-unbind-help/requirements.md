---
author: flow-machine-draft
created_at: 2026-10-05T14:20:11.277Z
---
# 需求规格（Requirements）— 2026-10-05-bind-unbind-help

## 功能需求

### FR-01: tests 用法行含 --bind/--unbind 语义说明（追加新行不替换旧行 / 按 --row-id 或 --tests 删行）

- tests 命令用法输出必须随附语义短注：--bind 追加一条新绑定行（不替换旧行；row_id 缺省自动生成 manual:*）、--unbind 按 --row-id <id> 删行（或 --tests 路径反查）、不带 bind/unbind 只读展示——禁止只列 flag 名不说明语义。

#### 场景：主路径

- Given: 运行 sillyspec tests（无参/缺参）
- When: 用法门输出
- Then: 用法行后随语义短注一行

### FR-02: 语义说明与实现一致（bind 行构造 append 语义、unbind 删行 id 来源两口径）

- 语义短注必须与实现事实一致：bind 行构造为 append（旧行保留）、unbind 删行 id 来源 --row-id / --tests 两口径——由源级回归的实现一致性锚锁定。

#### 场景：主路径

- Given: 源级回归测试
- When: 断言实现锚文本（row 构造 / unbind id fail 提示）
- Then: 两锚在场（实现变更时锚红提示同步文案）

### FR-03: 源级回归测试锁定用法行语义文本在场

- 必须有源级回归测试：断言用法行语义文本在场与实现一致性双锚。

#### 场景：主路径

- Given: 仓内源码
- When: 回归测试执行
- Then: 双断言成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/bind-unbind-help.test.mjs「① 用法行含 --bind/--unbind 语义说明」
FR-02: test/bind-unbind-help.test.mjs「② 语义与实现一致锚（append 构造 + 删行 id 两口径）」
FR-03: test/bind-unbind-help.test.mjs「① + ② 双断言齐备」
