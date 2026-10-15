---
author: flow-machine-draft
created_at: 2026-10-15T14:27:50.944Z
---
# 需求规格（Requirements）— 2026-10-15-eval-probe2-orders-export

## 功能需求

### FR-01: eval/tasks/005-orders-export/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/orders.csv（五类隐含面的固定 fixture，字节精确）、verify.mjs（期望硬编码）、solution/bin/export-orders.mjs（参考解全对）

- 必须：instruction 只命名：文件路径（data/orders.csv）、表头（id,region,amount,status）、过滤（status=paid）、输出契约（out/summary.json，{"regions":[{"region","total","count"}]}，region 字母序升序）；**不提及**五类隐含面：①out/ 目录不存在须自建；②UTF-8 BOM 表头；③CRLF 行尾；④引号内千分位逗号（CSV 引号语义）；⑤混排空行。每类唯一合理解，且正确实现必须检查数据文件本体才能全对。
- 必须：fixture（files/data/orders.csv，字节精确）承载五类隐含面：BOM（EF BB BF）开头、CRLF 行尾、`"1,234.50"` 与 `"1,000.00"` 引号金额、空行、7 行数据（paid 5 行 / pending 1 / refunded 1）。
- 必须：verify.mjs 期望硬编码并独立于实现：APAC total=2200 count=2；EU total=2284.5 count=3（paid 行：EU 1234.50+50+1000 / APAC 200+2000）；判分读 out/summary.json（须存在且可解析）。

#### 场景：四件套齐全且指令不泄露

- Given：eval/tasks/005-orders-export/
- When：核对文件面与 instruction 文本
- Then：四件在场；instruction 不含「BOM/CRLF/引号/自建/空行」等提示语

#### 场景：fixture 字节精确

- Given：files/data/orders.csv
- When：按字节读
- Then：首三字节 EF BB BF；行尾为 CRLF；含至少一个引号包裹且内含逗号的金额字段

### FR-02: 判别力：naive 实现（index 列位、不剥 BOM/CRLF/引号）verify 必拒；参考解必过

- 必须：test/eval-probe2-orders.test.mjs 三用例：参考解（solution 复制进工作副本）过 verify；无实现被拒；naive 实现（mkdir out/、按行 split 逗号、index 取列、不做 BOM/CRLF/引号处理）被拒——判别力成立前提。
- 必须：工作副本口径与 eval/lib/workdir.mjs 的 prepareWorkdir 同款（files/ 复制）。

#### 场景：三用例判别

- Given：隔离临时工作副本
- When：node --test
- Then：参考解 exit 0；无实现 exit≠0；naive exit≠0

### FR-03: eval 管道集成：node eval/run.mjs --dry-run 含 005 零报错跑通

- 必须：`node eval/run.mjs --dry-run`（mixed）在 5 任务集上跑通：005 为奇数号 → A 臂 solution pass 路径、B 臂占位 fail 路径，判定与 dry-run 期望一致。

#### 场景：dry-run 全管道

- Given：当前仓库
- When：node eval/run.mjs --dry-run
- Then：退出码 0，报告含 005-orders-export

### FR-04: 变更自身测试面与 lint

- 必须：FR-02 断言由 test/eval-probe2-orders.test.mjs 承载并全绿；`npm run lint` 通过。

#### 场景：测试与 lint

- Given：当前仓库
- When：node --test test/eval-probe2-orders.test.mjs + npm run lint
- Then：全绿

## 测试绑定（每条 FR 至少一行）

FR-01: test/eval-probe2-orders.test.mjs「FR-02 参考解过 verify / naive 拒 / 无实现拒」（四件在场由用例文件读取隐式断言；指令不泄露面为写作期自查 + 人工评审）
FR-02: test/eval-probe2-orders.test.mjs「FR-02 参考解过 verify / naive 拒 / 无实现拒」
FR-03: 不适用：--dry-run 为零 token 管道验证，属收口后人工/agent 亲跑动作而非单测面（理由同 004 变更 design）
FR-04: test/eval-probe2-orders.test.mjs 全部用例 + npm run lint（收口亲测）
