# 模块影响分析（骨架由 `sillyspec module-impact --change <变更名>` 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| runtime | src/run/test-ledger.js | 新增（P2 三键指纹账本纯函数+IO） | 待回填 |
| runtime | src/run/gates.js | 逻辑变更（P2 消费接线+P1 --full 装配） | 待回填 |
| runtime | src/verify-postcheck.js | 逻辑变更（P1 reconcile 只读形态+P2 消费） | 待回填 |
| runtime | src/run/complete-handlers.js | 逻辑变更（P3 就绪度报告+apply 强提示尾部追加） | 待回填 |
| runtime | src/run/prompt.js | 配置变更（P4 SILLYSPEC_STEP_GUIDE 缺省翻转） | 待回填 |
| cli-entry | src/index.js | 配置变更（P1 gate --full flag 注册） | 待回填 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- ~~`.idea/vcs.xml`~~（骨架从主仓脏文件误收，非本变更文件，剔除）
- `test/*` 四新测试 → 共位测试非模块缺口
- `docs/prompt/*`+`modules/*.md` → 镜像/模块文档自身（task-05）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无需增改——未匹配文件为共位测试/镜像/卡尾教学 token（已去引用化），非模块索引缺口（task-05 核实） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
