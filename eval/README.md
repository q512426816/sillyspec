# SillySpec A/B 评测

客观量化回答一个问题：**同一个 agent，走 SillySpec 流程（B 臂）比裸跑（A 臂）到底好多少？**

- 同任务、同模型、同判分脚本（每任务一个 `verify.mjs`，退出码 0 = 通过），唯一变量是「有没有 SillySpec」。
- 产出：分臂通过率 + Wilson 95% 置信区间、Δ(B−A) 区间、flaky 剔除、token/费用/耗时、基线回归对比。
- 所有结果落 SQLite（`eval/results/eval.db`），可审计、可复跑。

## 快速开始

```bash
node eval/run.mjs --dry-run        # ① 零 token：假 agent 验证整条管道（先跑这个）
node eval/run.mjs --preflight      # ② 零 token：检查 Node 版本与 agent CLI 可用
node eval/run.mjs --pilot          # ③ 真跑：前 20 个任务 × 双臂（从这里开始烧 token）
node eval/run.mjs --report         # 查看报告
node eval/run.mjs --set-baseline   # 成绩满意后固化为回归基线（发版前对比）
```

npm 快捷方式：`npm run eval:dry`、`npm run eval:pilot`。

## 认证与 apikey（重要）

**不需要把 apikey 配置在本评测的任何脚本或配置文件里。**

CLI 适配器只是以子进程方式调起你本机的 headless agent CLI（默认 `claude -p`，可换 zcode / codex 等），认证完全沿用该 CLI 自己的登录态或它读取的环境变量——你之前怎么用它，评测就怎么用。评测脚本不接管、不存储、不转发任何密钥，`eval.config.json` 可以安全提交。

前置条件只有一条：目标 agent CLI 已安装、已登录、终端里能跑通。拿不准就先 `node eval/run.mjs --preflight`。

未来若要接裸 API（如 GLM 的 OpenAI 兼容端点）跑自研 agent 循环，那才需要环境变量方式的 key（同样是环境变量，不进脚本）——届时新增一个 adapter 即可。

## 命令一览

| 命令 | 用途 | token 消耗 |
|---|---|---|
| `--dry-run[=mixed\|pass\|fail]` | 假 agent 跑管道（mixed 会确定性制造两臂差异） | 0 |
| `--preflight` | Node 版本 + agent CLI 探活 | 0 |
| `--pilot` | 前 20 任务双臂真跑 | 真实消耗 |
| `--task <id>` / `--arm A\|B` / `--sample N` | 收窄范围 | 按范围 |
| `--rerun-failed` | 只重跑上轮 fail/timeout/error | 定向，省钱 |
| `--force` | 忽略缓存强制重跑 | 按范围 |
| `--report [--dry-run]` | 报告（CI / Δ / flaky / 基线） | 0 |
| `--set-baseline` | 固化当前成绩为回归基线 | 0 |

## 省 token 机制（内建）

1. **缓存**：同 `(config_hash, task, arm)` 已有 pass/fail 终态自动跳过；改了提示词/流程/任务内容会换 hash，只重跑受影响部分。
2. **定向重跑**：`--rerun-failed` 不碰已通过的任务。
3. **双重熔断**：单任务 agent 超时（`adapter.timeoutMs`）+ 判分超时（`verifyTimeoutMs`），死循环烧不穿。
4. **dry-run / preflight 全零 token**，烧钱的大跑之前管道一定先验通。

## 任务格式

每个任务一个目录，四件套：

```
eval/tasks/001-slugify/
├── task.json     # id / instruction（两臂收到同一份需求文本）
├── verify.mjs    # 判分：以被测工作目录为 cwd 执行，退出码 0 = 通过
├── files/        # 工作副本脚手架（复制后交给 agent；棕地任务在这里放待改代码）
└── solution/     # 参考解（仅 dry-run 假 agent 使用，不参与指纹）
```

写任务的要点：instruction 必须无歧义（判分才有唯一正确解）；verify 只看行为不看出身。当前 3 个种子任务偏小（用于验管道），正式 pilot 前应扩充到 20+，并逐步引入更贴近 SillySpec 甜区的中等规模功能任务。后续如需对接 Terminal-Bench 2.0 等外部任务源，写一个「外部任务 → 本格式」的导入器即可，编排与报告层不用动。

## 配置（eval.config.json）

- `arms.A / arms.B`：两臂的 `setup`（agent 进场前执行的命令，B 臂默认 `npx sillyspec init`；dry-run 跳过）与 `promptTemplate`（`{instruction}` 占位）。
- `adapter`：`command` 数组 + `stdin: "prompt"`（prompt 走 stdin，规避跨平台引号问题；也可在 command 里用 `{prompt}` 占位改为参数注入）；`{workdir}` / `{maxTurns}` 占位可用；`parseStdoutJson: true` 时尽力从 stdout JSON 提取 token/费用（提不到记 null，不瞎填）。
- 换被测 agent：改 `adapter.tool` + `adapter.command`（如 zcode / codex 的 headless 形式），两臂 prompt 模板不用动。

## 目录

```
eval/
├── run.mjs            # 入口
├── eval.config.json   # 配置（无密钥，可提交）
├── lib/               # 编排/报告/适配器/DB
├── tasks/             # 任务集
└── results/           # 运行产物（eval.db / 工作副本 / 日志 / baseline.json）——已 gitignore
```

## 已知边界

- 通过率只统计 pass/fail；timeout / error（agent 崩溃、臂 setup 失败）单列不计入分母，避免把管道故障算成 agent 失败。
- 同任务同臂多次运行结果摇摆会被标记 flaky 并从通过率剔除——放量前建议每任务跑 2 次，flaky 高说明任务本身不稳定，先修任务。
- 单臂 n < 30 时报告会提示区间仅供方向参考。
