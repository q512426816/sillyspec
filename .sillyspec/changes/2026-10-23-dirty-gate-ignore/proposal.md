---
author: flow-machine-draft
created_at: 2026-10-22T23:39:13.117Z
---
# 提案书（Proposal）— 2026-10-23-dirty-gate-ignore

## 动机

任务原话转写：dirty 门已知残渣忽略配置键

动机与背景：2026-10-23 四子代理收口画像：dirty-gap 门 56% 触发率（102/181 归档带 acceptedDirtyGap），其中大头是共享仓已知残渣（quicklog/、test/.sillyspec/ 运行库等既不属本变更也无他会话活跃声明）——每次触发仍要人工重跑带 --accept-dirty-gap（6f87c173 已为此补快速通道文案，说明现行为方向就偏）。新增 local.yaml dirty_gate_ignore 配置键（module_gate_ignore 同款先例：目录前缀、单行逗号、posix）：配置内的已知残渣从 dirty 冻结缺口面剔除并一行留痕，仓主一次声明长期生效；未配置/坏配置/读取失败 fail-soft 行为与现状逐字一致。过滤落在 collectFreezeFiles 单一源内（权威门与 2026-10-23-flow-done-preflight 预检同源继承，零镜像面）。用户已显式授权继续（2026-10-23「继续」）——autopilot 直跑到底，--no-prestage 声明需求已含决策（方案经四子代理分析定案）。

成功标准：
- local.yaml 新键 dirty_gate_ignore（单行逗号分隔目录/文件前缀，posix）：collectFreezeFiles 在 dirty 面收集中剔除命中前缀的文件并在返回值带 dirtyIgnored 清单；patch 子步权威门对剔除留一行 ℹ️（N 个 dirty 文件按 dirty_gate_ignore 剔除——已知残渣面）；剔除后缺口面为空则不阻断直接走冻结（收口完成）
- 未配置该键/键值非法/local.yaml 不可读三态 fail-soft：dirty 门行为与改动前逐字一致（仍阻断），零回归有测试锚
- 收口预检（flow-preflight.js）经同一 collectFreezeFiles 自动继承忽略——配置在场时预检不再产 dirty-gap finding，无需改预检代码
- 阻断文案（权威门+预检两处拷贝）各增第④条出路指引（dirty_gate_ignore 固定忽略），两处逐字同步
- 测试：未配置照常阻断（零回归锚）/ 配置命中剔除+完成收口+留痕行 / 前缀不命中照常阻断 / unit collectFreezeFiles 返回 dirtyIgnored

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. local.yaml 新键 dirty_gate_ignore（单行逗号分隔目录/文件前缀，posix）：collectFreezeFiles 在 dirty 面收集中剔除命中前缀的文件并在返回值带 dirtyIgnored 清单；patch 子步权威门对剔除留一行 ℹ️（N 个 dirty 文件按 dirty_gate_ignore 剔除——已知残渣面）；剔除后缺口面为空则不阻断直接走冻结（收口完成）
2. 未配置该键/键值非法/local.yaml 不可读三态 fail-soft：dirty 门行为与改动前逐字一致（仍阻断），零回归有测试锚
3. 收口预检（flow-preflight.js）经同一 collectFreezeFiles 自动继承忽略——配置在场时预检不再产 dirty-gap finding，无需改预检代码
4. 阻断文案（权威门+预检两处拷贝）各增第④条出路指引（dirty_gate_ignore 固定忽略），两处逐字同步
5. 测试：未配置照常阻断（零回归锚）/ 配置命中剔除+完成收口+留痕行 / 前缀不命中照常阻断 / unit collectFreezeFiles 返回 dirtyIgnored

## 成功标准（可验证）

1. local.yaml 新键 dirty_gate_ignore（单行逗号分隔目录/文件前缀，posix）：collectFreezeFiles 在 dirty 面收集中剔除命中前缀的文件并在返回值带 dirtyIgnored 清单；patch 子步权威门对剔除留一行 ℹ️（N 个 dirty 文件按 dirty_gate_ignore 剔除——已知残渣面）；剔除后缺口面为空则不阻断直接走冻结（收口完成）
2. 未配置该键/键值非法/local.yaml 不可读三态 fail-soft：dirty 门行为与改动前逐字一致（仍阻断），零回归有测试锚
3. 收口预检（flow-preflight.js）经同一 collectFreezeFiles 自动继承忽略——配置在场时预检不再产 dirty-gap finding，无需改预检代码
4. 阻断文案（权威门+预检两处拷贝）各增第④条出路指引（dirty_gate_ignore 固定忽略），两处逐字同步
5. 测试：未配置照常阻断（零回归锚）/ 配置命中剔除+完成收口+留痕行 / 前缀不命中照常阻断 / unit collectFreezeFiles 返回 dirtyIgnored
