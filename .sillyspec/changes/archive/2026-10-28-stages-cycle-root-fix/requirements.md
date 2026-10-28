---
author: flow-machine-draft
created_at: 2026-10-28T05:24:13.775Z
---
# 需求规格（Requirements）— 2026-10-28-stages-cycle-root-fix

## 功能需求

### FR-01: test/r5-wiring-three.test.mjs 单独直跑不再抛 TDZ，原用例全绿

- 修复后 `node test/r5-wiring-three.test.mjs` 直接运行**必须**正常完成（不再抛 `Cannot access 'execute' before initialization`），既有用例全部通过；同一入口形态（测试直 import `run/complete.js` 等先经 execute.js 子树进入的模块）**禁止**再触发 stages/index.js 顶层 stageRegistry 的 TDZ。

#### 场景：TDZ 入口形态直跑

- Given：当前 HEAD 上 `node test/r5-wiring-three.test.mjs` 抛 ReferenceError（stages/index.js:18）
- When：修复后同命令直跑
- Then：进程正常退出，用例计数全绿

### FR-02: run/shared.js 静态 import 面不再含 stages/index.js（测试断言锁死，防回边复潮）

- `src/run/shared.js` **禁止**静态 import `stages/index.js`；stageRegistry 的取用**必须**改为点用惰性动态 import（使用点所在函数已 async）。测试**必须**以静态断言锁死该 import 面（读源码断言无 `from '../stages/index.js'` 静态 import 行），防后续依赖边复潮。

#### 场景：断言锁死

- Given：修复后的 run/shared.js 源码
- When：断言测试读取源文件检查静态 import 面
- Then：不含 stages/index.js 静态 import；含点用动态 import（运行时取 stageRegistry 正常）

### FR-03: local.yaml 的 r5-wiring-three known_failures 机器豁免撤销（该测试回归默认验证面）

- 根修落地后**必须**从 `.sillyspec/local.yaml` 的 known_failures 清单移除 r5-wiring-three 豁免条目及其归属注释，使该测试回归默认收口验证面；豁免残留（修复后不删）**禁止**出现。

#### 场景：豁免撤销

- Given：local.yaml known_failures 含 r5-wiring-three 锚定豁免（2026-10-28-shadow-checkpoint D-001 留痕）
- When：根修交付
- Then：known_failures 清单为空（或不含该条），`sillyspec config known-failures list` 无该键

### FR-04: CLI 既有入口零回归（受影响面测试绿）

- 修复**禁止**改变 run/shared.js 对外行为：getStageSteps 等既有调用方在修复前后行为一致；受影响面测试（r5-wiring 三件、stage 注册表消费面、run/shared 直/间接触达面）**必须**全绿。

#### 场景：注册表消费面回归

- Given：stageRegistry 经 run/shared 消费的既有路径（quick scanProfile 三步表等）
- When：修复后跑受影响面
- Then：全部通过，行为输出与修复前一致

### FR-05: 零新依赖

- 实现**必须**仅改动既有模块 import 形态（静态→动态），**禁止**新增 npm 依赖或新文件级公共 API。

#### 场景：依赖面断言

- Given：修复 diff
- When：检查 package.json 与新导出
- Then：零新增依赖、零新增公共导出

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/stages-cycle-regression.test.mjs「TDZ 入口形态直跑绿（r5-wiring 同入口 import 完整进程）」+ 既有 test/r5-wiring-three.test.mjs 全绿
FR-02: test/stages-cycle-regression.test.mjs「run/shared 静态 import 面断言 + 点用动态 import 存在」
FR-03: test/stages-cycle-regression.test.mjs「known_failures 清单不含 r5-wiring 锚定键」
FR-04: test/stages-cycle-regression.test.mjs「getStageSteps 注册表消费回归（quick/standard 两档）」+ 受影响面 r5-wiring-three 复跑
FR-05: 不适用：纯 import 形态变更无运行时新面——package.json 零变更为交付 diff 自证（收口冻结面断言）
