---
author: flow-machine-draft
created_at: 2026-10-15T14:27:50.944Z
---
# 设计记录（Design Record）— 2026-10-15-eval-probe2-orders-export

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新增 eval 第 5 个任务 `eval/tasks/005-orders-export/`——探针序列第二枚，隐含面从 004 的「健壮性卫生」（空行/孤儿/交错，实测 n=1 双臂 100%，区分度不足）升级为「数据里看得见、指令里没写」的五类解析陷阱：

1. **out/ 目录自建**：输出契约指定 `out/summary.json`，仓库不给 out/ 目录——合理人预期：命令跑通（自建目录）。
2. **UTF-8 BOM**：fixture 首三字节 EF BB BF——表头首列名义上是 `\uFEFFid`；合理处理：剥 BOM。
3. **CRLF 行尾**：Windows 导出常见——不 trim `\r` 则 `status` 值变成 `paid\r`，过滤全落空。
4. **引号内千分位逗号**：`"1,234.50"`——CSV 引号语义（引号内逗号非分隔符）；naive split(',') 列错位、金额 NaN。
5. **混排空行**：中段空行——须跳过。

五类全部「数据本体可见、指令零提示」：照抽象规格直排的实现必错，正确实现必须真正打开数据文件。判别力由测试钉死（naive index 列位实现必拒）。实测（A/B 双臂真 token）放收口后执行——同 004 形态，交付物是任务本体 + 零 token 管道验证 + 判别力测试。

B 臂处理效果（treatment）假设：SillySpec 流程强制的「成功标准/验收作答 + flow done 实测自验证」链路，会推着 agent 检查数据本体/跑通命令——对这类数据陷阱假定有正效应；n=1 先取信号，若 A 挂 B 过即探针首次产出区分度证据。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- **纯新增**：`eval/tasks/005-orders-export/{task.json, verify.mjs, files/data/orders.csv, solution/bin/export-orders.mjs}` + `test/eval-probe2-orders.test.mjs`。eval 工具链零改动（loadTasks 自动发现；005 奇数 → dry-run mixed 下 A/B 双臂均 pass（B 臂 fail 路径对应偶数号任务））。
- verify 判分口径：运行 `node bin/export-orders.mjs`（cwd=工作副本）→ 读 `out/summary.json` → deepEqual 期望 `[{region:'APAC',total:2200,count:2},{region:'EU',total:2284.5,count:3}]`；金额为数值（2284.5 与 2200 均为二进制精确值，无浮点噪声）。
- 交付文件面自声明：上述 6 个新增文件（含 data/.gitattributes 字节锁），无修改面。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:eval/tasks/005-orders-export/task.json | instruction（只命名表层契约） |
| 新增 | NEW:eval/tasks/005-orders-export/files/data/orders.csv | 固定 fixture（BOM+CRLF+引号逗号+空行，字节精确） |
| 新增 | NEW:eval/tasks/005-orders-export/verify.mjs | 判分（期望硬编码，读 out/summary.json） |
| 新增 | NEW:eval/tasks/005-orders-export/solution/bin/export-orders.mjs | 参考解（引号感知解析 + BOM/CRLF/空行处理 + mkdir） |
| 新增 | NEW:test/eval-probe2-orders.test.mjs | 判别力三用例（参考解过 / 无实现拒 / naive 拒） |
| 新增 | NEW:eval/tasks/005-orders-export/files/data/.gitattributes | `*.csv -text` 锁字节（禁换行归一化——CRLF 是本任务设计面，不是环境容忍面） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用（静态任务资产；fixture 行序即被测输入设计）。
2. 并发写：verify 与测试各自在独立临时目录构建工作副本，无共享写面。
3. 切换/生命周期：任务目录静态；solution/ 不进 agent 工作副本与任务指纹（工具链既有口径）。
4. 作用域：单仓目录资产。CRLF 说明：fixture 的 CRLF 是**有意字节**（Windows 导出形态的隐含面），但 git 检出配置（core.autocrlf）可能改写行尾——**必须用 .gitattributes 锁死**（`eval/tasks/005-orders-export/files/data/*.csv -text` 禁用换行归一化），否则 Linux/macOS 检出后 CRLF 面消失、Windows 检出若 autocrlf 归一化亦可能翻 LF。BOM 同理属字节面（不被 autocrlf 触碰）。这是与 004 的关键工程差异（004 的 CRLF 是环境容忍面，005 的 CRLF 是任务设计面，必须锁字节）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **最大风险：CRLF/BOM 字节被 git 检出改写**（见盲维 4）。缓解：.gitattributes 锁 `-text`（新增为交付文件第 6 项），测试断言 fixture 字节（EF BB BF 与 \r\n 在场）钉死。
- **次风险：隐含面「合理解唯一性」复议**：①out/ 自建——唯一合理（契约写死路径，不存在则建是常规）；②BOM 剥离——唯一合理（`\uFEFF` 是编码标记不是数据）；③CRLF 容忍——唯一合理（跨平台文本常识）；④引号语义——唯一合理（CSV 标准；指令写「逗号分隔」即 CSV 语境）；⑤空行跳过——唯一合理。均无二义。
- **第三风险：n=1 无区分度**（同 004 的解读注意）——本轮交付的价值在任务本体与判别力测试；实测若双臂仍全过，结论是「该陷阱族裸能力亦覆盖」，探针序列按需再升级（本次已刻意选比 004 更硬的族）。
- **放弃的方案**：*金额字段不加引号只放纯数字再另设千分位列*——弱化陷阱且引入新列语义；*时区/夏令时陷阱*（时间戳族）——二义性风险高（跨时区语义可辩护），违反唯一性红线；*指令加一句「数据可能有格式噪音」*——泄题禁区。
