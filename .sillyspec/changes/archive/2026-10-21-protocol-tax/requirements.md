---
author: flow-machine-draft
created_at: 2026-10-21T14:15:09.575Z
---
# 需求规格（Requirements）— 2026-10-21-protocol-tax

## 功能需求

### FR-01: DEBUG_SILLYSPEC_TIMING=1 时 run/flow 命令尾部输出分段耗时（sync/gates/render/state-write 至少四段），不开时零输出变化

- 设置环境变量 `DEBUG_SILLYSPEC_TIMING=1` 时，run/flow 主命令**必须**在输出尾部打印分段耗时行（至少 sync / gates / render / state-write 四段，段名带 `[timing]` 前缀；该命令未触达的段写 `n/a` 不许省略段名）；未设置该变量时输出**必须**与现状逐字节等价（禁止出现任何 [timing] 行或额外空行）。

#### 场景：主路径

Given 临时仓存在活跃 change；When 以 `DEBUG_SILLYSPEC_TIMING=1` 运行任一 run 渲染/推进命令；Then 输出含 `[timing]` 且同时出现 sync/gates/render/state-write 四个段名；When 同命令不带环境变量运行；Then 输出无 `[timing]` 字样。

### FR-02: 同一步骤重复进入时不再全量重放固定模板：重复渲染首屏 <60 行，固定规则收敛为 step-guide 锚文件一行引用

- 同一 (change, stage, step) 的重复渲染（同步骤第二次及以后进入）**必须**输出增量面：首屏 <60 行，固定规则模板（路径铁律、逃逸口对照表、完成后执行、平台 directives 等 step0 级全文）**必须**收敛为 step-guide 锚文件一行引用；步骤推进（step 序号变化）或换 change 后**必须**恢复全量首渲染；增量面**必须**保留状态行与锚引用行（agent 可凭锚文件取回全文）。

#### 场景：重复进入

Given 活跃 change 处于 stage 的 step N；When 第二次运行同步骤渲染命令；Then 首屏 <60 行且含锚文件引用行、不含路径铁律全文；When 推进到 step N+1 再渲染；Then 恢复全量渲染。

### FR-03: 新增全局 --out-file <路径> 与 --tail N：全文写文件、stdout 只出尾 N 行，退出码与不用 flag 完全一致

- 全局 flag `--out-file <路径>` **必须**对所有命令可用：完整输出写该文件、stdout 改打「全文已写 <路径>」+ 尾部行；`--tail N` **必须**控制尾部行数（默认 40，N 为正整数）；两 flag 单用/合用语义一致；任意命令的退出码**必须**与未使用 flag 时相同（含失败命令 exit≠0 的场景——失败信息不因截尾丢失，需进入尾行或全文件）。

#### 场景：成功与失败命令

Given 任一命令成功路径；When 加 `--out-file f --tail 5`；Then stdout ≤7 行（提示行+5 尾行）、f 含全文、退出码与裸跑一致；Given 任一 gate 拒绝命令（exit 1）；When 同 flag 运行；Then 退出码仍为 1 且拒绝原因可在尾行/全文件读到。

### FR-04: run <stage> --wait --json：问询+选项结构化 JSON 输出；--continue --answers k1=v1,k2=v2 一次携带多问多答

- `run <stage> --wait --json` **必须**在 stdout 输出唯一一个可 `JSON.parse` 的对象（字段至少含 change/stage/step/stepName/question/options[]，options 元素含 label/description），退出码与文本模式 --wait 一致；`--continue --answers <k1=v1,k2=v2,…>` **必须**一次调用回填多个 waiting 步骤（k 匹配步骤名或序号，值含逗号时支持引号形态 `k="v,含逗号"`），全部键命中才推进；任一键无匹配**必须**整单拒绝 exit≠0 并列出未匹配键（禁止部分回填）。

#### 场景：一次三答与键无匹配

Given 阶段存在 3 个 waiting 步骤；When `--continue --answers "2=答案A,3=答案B,4=答案C"`；Then 三步全部回填且后续推进单次完成、无中间 exit≠0；Given answers 含不存在键；When 运行；Then exit≠0、错误信息列出该键、无任何 waiting 步骤被回填。

### FR-05: --continue 在无等待步骤时改为幂等 no-op（exit 0 + 提示行），不再 exit=1

- `--continue`（不带 --answers）在当前阶段无 waiting 步骤时**必须**以 exit 0 幂等返回，输出一行提示（指向 `--status` / `progress show` 查看下一步），**禁止**以 exit=1 报错；带 --answers 且无 waiting 步骤时同样幂等 exit 0 并提示（答案不落盘）；有 waiting 步骤时的既有语义**必须**不变。

#### 场景：幂等与保留语义

Given 阶段无 waiting 步骤；When `--continue`；Then exit 0 且输出含 progress show 指引；Given 阶段有 1 个 waiting 步骤；When `--continue --answer "…"`；Then 行为与现状一致（回填并推进）。

### FR-06: status/progress show/handoff 查看等只读命令不再触发平台同步（消费仓 status --change 6.3s → <1.5s），同步仍由写命令与 bg-sync 承担

- status / progress show / handoff（查看态，无写操作）等只读命令**必须**不触发平台同步：不调用 syncSpecTree、输出不含 [sync] 行（平台已连接时同样不触发）；写命令（run/flow 推进、task tick 等）与 bg-sync 的同步语义**必须**零变化；验收计时在 multi-agent-platform 消费仓实测 `status --change` <1.5s（改动前 6.3s）。

#### 场景：只读不同步、写路径不变

Given 已配置平台连接的仓；When `status --change <名>`；Then 输出无 [sync] 行且命令 <1.5s；When 任一写命令成功执行；Then 同步行为与现状一致（写命令同步/bg-sync 照常）。

### FR-07: doctor 归档锚点校验批量化（单次 git cat-file --batch-check），实测 41.8s → <5s 且 findings 输出与改前逐条等价

- doctor 的归档锚点悬空校验（change-patch.json head/baseline）**必须**从逐 SHA `git cat-file -e` 改为单次 `git cat-file --batch-check` 批量判定（多 SHA 合并为至多一次 git 进程调用；_branchReviewReferences 同理批量化为单次枚举）；findings 输出**必须**与逐 SHA 版本逐条等价（悬空/有效判定与文案不变）；实测本仓 doctor 总耗时 <5s（改动前 41.8s，CPU profile 95% 在串行 spawnSync）。

#### 场景：等价与批量

Given fixture 含多个归档（change-patch.json 含有效与悬空 SHA 混合）；When 运行 detectArchiveIntegrity；Then 悬空名单与逐 SHA 旧实现逐条一致；Given 本仓（含真实归档体量）；When `sillyspec doctor`；Then 总耗时 <5s。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/timing-segments.test.mjs「timing 四段输出与默认零变化」
FR-02: test/output-repeat-delta.test.mjs「重复渲染<60行+锚引用/换步恢复全量」
FR-03: test/out-file-tail.test.mjs「全文件+尾行+退出码一致（含失败命令）」
FR-04: test/wait-json-answers.test.mjs「wait --json 可解析/answers 一次多答/键无匹配整单拒绝」
FR-05: test/continue-idempotent.test.mjs「无 waiting 时 exit 0+指引/有 waiting 语义不变」
FR-06: test/status-nosync.test.mjs「status 无 [sync] 行且不触发同步/写命令同步不变」
FR-07: test/doctor-anchor-batch.test.mjs「悬空判定与逐 SHA 版等价/批量单进程」
