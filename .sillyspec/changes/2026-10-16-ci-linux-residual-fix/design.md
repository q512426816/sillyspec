---
author: flow-machine-draft
created_at: 2026-10-16T08:28:38.146Z
---
# 设计记录（Design Record）— 2026-10-16-ci-linux-residual-fix

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三处改动，全部落在「测试/源码卫生」面，产品逻辑零改：

1. **`test/backlog-batch-a.test.mjs`③b**：`fsExports` 建好后追加 `delete fsExports.constants`。
   根因不是「spread 枚举不全」（那是上一轮 node 22 的另一坑，已由显式补键解决），而是
   `cjsMockModuleLoad` 对 mock exports **逐键 `ObjectDefineProperty`**：linux 上 `fs.constants`
   是 `writable:false/configurable:false` 的数据属性 → 不可重定义直接 TypeError 炸整文件；
   windows 上同属性 `writable:true` → 侥幸不炸（本地 12/12 绿、CI 红的唯一分叉点）。
   `F_OK/R_OK/W_OK/X_OK` 同为不可重定义，但 `enumerable:false`，spread 天然不带。
   同仓 `test/worktree-junction-fail-loud.test.mjs` 已有同款既定解法，按同一口径对齐。

2. **`test/feedback-batch2-hardening.test.mjs`⑥**：把大小写断言拆成平台分叉。实现口径
   （`src/verify-postcheck.js` 的 `pathKey`：`foldCase = win32 || darwin`）是有意为之——
   大小写敏感文件系统上全局折叠会替**写错的**路径放水（②类假阴性），故测试只能按同一口径
   断言：win32/darwin 钉「折叠命中」，linux 钉「如实落②类不放水」。`./` 前缀 + 尾部注记归一
   与 `NEW:` 未建拦阻两项跨平台恒真，保持原断言。原测试把 windows 行为写成跨平台预期，
   属首轮上 CI 的适配欠账，非被测逻辑缺陷（改测试不碰逻辑：实现零改动）。

3. **`src/verify-postcheck.js` 裸 NUL 字节**（FR-06）：该文件 2 处复合键分隔符写成**裸 0x00**
   而非 `\u0000` 转义，导致 grep/rg 视其为二进制、全部命中被静默吞掉（本轮实证：
   `grep -n foldCase src/verify-postcheck.js` 零输出，是排查该⑥段口径时的真实致盲点）。
   字节级替换为 6 字节转义序列，运行时字符串值逐字节相等（`'\0' === '\u0000'`）。

4. **`src/run/shared.js` quick 审计 EOL 假 M 探测改 `--numstat -z`**（FR-07，容器门捞出的真实
   缺陷 + 收口评审 P2 整改）：原探测用 `git diff --name-only --ignore-cr-at-eol HEAD`，而
   `--name-only` **不吃** `--ignore-cr-at-eol`——git ≤2.43 仍把纯行尾重写文件列进名单（Debian 12
   git 2.39.5 与 Ubuntu 24.04 git 2.43.0 实测；git ≥2.54 才听话，CI runner 是 2.55 所以全绿看不
   出来），即「gen:types 行尾重写制造假 M」坑（2026-09-12 修复）在这些主流环境静默复活。改走
   `--numstat`（同 `src/verify-postcheck.js` reconcileActualFiles 的 eolOnlyFiles 既定口径，该处
   注释早已记载此怪癖）。**再进一步带 `-z`**：非 -z 的 `old => new` 文本形态与「文件名里字面含
   ` => `」不可区分——评审实测 `sub/a => b.js` 的真实内容变更被误判 rename、取错新名而剔出
   changedFiles（审计放宽）。`-z` 记录文法（od 实测 git 2.39.5/2.54 同形）为普通条目
   `<A>\t<D>\t<path>\0`、rename `<A>\t<D>\t\0<old>\0<new>\0`，按位置取新名且不做引号/C 转义。
   配一条**源码钉**（行为测试在 CI 的新 git 上抓不到该版本差，钉住 `--numstat -z` 形态才有 CI
   可见的回归锁）+ 一条非 windows 行为用例（字面 ` => ` 文件名真实修改不许被剔）。

5. **`test/backlog-batch-a.test.mjs` 根因叙述更正 + `test/worktree-junction-fail-loud.test.mjs`
   同款注释更正**（收口评审 P2-1 整改）：原叙述称「windows 上 `fs.constants` 为 writable:true
   所以不炸」——**实测该叙述不成立**：`Object.getOwnPropertyDescriptor(require('node:fs'),
   'constants')` 在 windows(24.15) 与 linux(24.22) 同形 `{writable:false, configurable:false}`
   （早前的「writable:true」读的是 **ESM 命名空间**的合成描述符，不是 CJS 导出）。真机制：
   `cjsMockModuleLoad` 在 mock exports 含 `default`（spread 命名空间必带）时把键 define 到
   `moduleExports.default`（真实 CJS 导出对象）上，descriptor 取自我们给的 plain 对象
   （configurable:true）→ 目标属性不可重定义则抛。四象限最小复现实测：node 24.15（win/linux）
   不炸、node 24.22（linux）炸——**分叉轴是 node 版本不是平台**（22.23 亦炸）。修法（剔键）
   与承诺不变，仅把注释/文档改成本实证口径，避免后人按错误轴排查。

**本地 Linux 复现能力**（本变更的方法论交付，含三条踩坑修正）：
`docker run -d --init --name ssx-run -v <仓>:/work:ro -w /work node:24-slim sleep infinity`
+ `apt-get install -y git procps`，随后**容器内克隆到原生 FS 再跑**（`git clone /work /run &&
npm ci && npm test`）——① `--init`（tini 回收）必带：否则容器 PID 1 是不回收孤儿的
`sleep infinity`，被杀子进程留僵尸让 `kill(pid,0)` 恒真，进程树回收类用例假红（本项目
`verify-concurrency-fixes` ①b 实测）；② 用 Debian 系（dash + procps）而非 alpine：BusyBox
的 `ps` 不支持 `-x`、`ps -axo` 与 ash 的 command-not-found 文案都与 ubuntu runner 不同
（alpine 上 `verify-concurrency-fixes`/`verify-gate-command-missing` 假红，Debian 上自然绿）；
③ 挂载卷直跑 I/O 慢（全量 713s vs 原生 FS 75s，并诱发 120s 超时假红）——克隆进容器原生 FS。
失败面先容器内复现（一字不差复现 CI 的 TypeError 与 ⑥段 missing），修完在容器里跑全量池——
把「盲推等 CI」换成「本地 Linux 门」（本变更最终以容器全量 817 文件 0 失败收口）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 产品侧接口零变化：无 CLI 命令/配置/文件格式/导出签名改动。
- `src/quicklog.js`：零改动（其 fs 使用面 openSync/closeSync/unlinkSync/statSync/mkdirSync/
  existsSync/readFileSync/writeFileSync/writeSync/readdirSync/renameSync/appendFileSync/rmSync
  不含 `constants`，mock 剔键对其无影响）。
- `src/verify-postcheck.js`：文件字节变化、行为零变化——`normalizeReviewChangedFile`/`pathKey`/
  `reconcileTargetFiles`/`foldCase` 语义与平台判定逐字不变；仅字符串字面量的书写形态
  （裸 NUL → `\u0000`）变化。
- 测试侧：`test/backlog-batch-a.test.mjs`③b 的 mock exports 由「全量 spread」变为
  「全量 spread \ constants」；`test/feedback-batch2-hardening.test.mjs`⑥ 段断言按平台分叉
  （新增 `writeTask01` 辅助与 `caseInsensitiveFs` 判定），其余段零改动；
  `test/quick-audit-foreign-residue.test.mjs` 新增源码钉一条（`--numstat` 形态）。
- `src/run/shared.js`：`auditQuickCompletion` 的 EOL 探测命令由
  `diff --name-only --ignore-cr-at-eol HEAD` 改为 `diff --numstat --ignore-cr-at-eol HEAD`
  + numstat 行解析（`numstatNewPath` 局部函数）。对外结果语义不变（eolOnlyFiles/changedFiles
  口径相同），仅在 git ≤2.43 环境把「静默全列」修回「正确过滤」；失败路径仍 fail-open
  （safeGit 错误 → null → 不过滤，与改前一致）。

## 文件变更清单

| 文件 | 变更 |
|---|---|
| `test/backlog-batch-a.test.mjs` | ③b mock exports 剔 `constants`（node ≥24.21/22.23 上不可重定义炸整文件）+ 根因叙述更正（评审 P2-1） |
| `test/worktree-junction-fail-loud.test.mjs` | 同款 `constants` 注释根因更正（原写「Node ≥26」，实为版本分叉的 mock 装载路径） |
| `test/feedback-batch2-hardening.test.mjs` | ⑥ 段大小写断言随平台分叉 + task-01 声明写法辅助 |
| `test/quick-audit-foreign-residue.test.mjs` | EOL 用例保留 + 新增源码钉（`--numstat -z` 形态）+ 字面 ` => ` 名回归用例（非 windows） |
| `src/verify-postcheck.js` | 裸 NUL → `\u0000` 转义（诊断面卫生，行为零变） |
| `src/run/shared.js` | EOL 假 M 探测 `--name-only` → `--numstat -z` + `numstatZPaths` 流解析（评审 P2-2） |
| `.sillyspec/changes/2026-10-16-ci-linux-residual-fix/*` | 四件套（proposal/requirements/design/tasks）+ 勾选台账 + change.patch/review.json |

未纳入本变更的仓内未提交文件：`quicklog/tmp-fix-review.mjs`（他者在途产物，非本变更交付；
按 `--accept-dirty-gap` 如实留审计缺口，不冒领）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

1. **乱序/迟到到达**：不涉及时序——三处均为确定性静态判定（mock 键集合、平台常量、字节形态）。
   CI 与容器的 node 小版本差（24.21/24.22）不影响：`constants` 描述符形态由平台分支决定
   （linux writable:false），非小版本行为。
2. **并发写**：多会话共享仓下，本变更触碰的两个测试文件与其他在途变更（probe7-prefill-noise-fix）
   文件零交集；提交用显式 pathspec + 同清单，不扫共享暂存区。容器挂载为只读共享面之外的独立
   进程，容器内跑测试写 TEMP（容器 /tmp），不写仓工作树（run-tests 已做套件级 TEMP/HOME 隔离）。
3. **切换/生命周期**：测试文件是进程级消费，无状态残留；⑥段新增的 `writeTask01` 每轮重写同一
   task-01.md（幂等），task-02 的 NEW 断言前先把 task-01 还原为可命中形态，避免上一轮的分叉态
   泄漏成下一轮的第二变量。容器是开发期工具（`docker rm -f ssx-ci` 即弃），不进入仓内产物。
4. **作用域**：库 zone 内 grep 假设不成立（勿依赖），故容器验证以 `node`/`npm` 实跑为准；
   ⑥段平台分叉用 `process.platform`（与实现同源），windows 侧本机实测、linux 侧容器实测，
   无跨机串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **最大风险：删 `constants` 键后 quicklog 图内若有代码读 `fs.constants`** → 运行期取到
  `undefined` 而静默错行为。核验：`grep -n constants src/quicklog.js src/git-helper.js` 零命中，
  且容器/本机双端该文件 12/12 全绿（③b 走的就是 mock 后的真实 quicklog 调用链）。
- **次风险：⑥段分叉把 linux 侧断言写成「永远绿」的空断言**（假验证）。缓解：linux 分支断言
  `missing.length === 1 && /Src\/Foo\.js/`（对具体路径形态断言，不是仅判 `!== 0`），且第一段
  断言（`./` 前缀 + 注记命中）在双端恒真——linux 侧若归一/匹配链真坏，第一段先红。
- **NUL 字节替换风险：把内容改坏**（文件 337KB，含中文注释）。缓解：字节级替换只动 2 个
  0x00 → 12 字节 `\u0000`，改前改后以 node 对比两处字符串值与 `node --check`、全量池零失败。
- **EOL 探测改 numstat 的风险：rename 形态被误判 EOL-only 剔出**（numstat 文本形态
  `old => new` / `pre{old => new}post` 若不解析新名，`real` 集对不上 porcelain 路径 →
  重命名被当纯行尾踢出 changedFiles，审计静默放宽）。缓解：改走 `-z` 流（按位置取新名，
  与文本形态无关）——评审实测的字面 ` => ` 文件名误剔路径随之消失，并锁非 windows 回归用例；
  另注意 `git diff --numstat` 在纯 EOL 变更上整条不输出（容器 git 2.39.5 实证）。
- **版本差在 CI 上不可见**（CI runner git 2.55 会过滤，行为测试恒绿）：故 FR-07 配源码钉而非
  仅行为断言——源码钉是唯一在 CI 可见的回归锁；行为面另由容器 git 2.39.5 / WSL git 2.43.0 /
  Windows 三端各跑一次兜住。
- 试过但放弃：
  a) **改实现让 linux 也折叠大小写**——会在敏感文件系统上替写错路径放水（②类假阴性），实现
     口径明确写着「Linux 保持敏感」，属设计意图而非缺陷；
  b) **⑥段整段 skip 非 win32**——CI 上的 linux 面就失去回归保护（⑥段正是被本变更修正的断言面），
     分叉断言比 skip 多钉住反向行为；
  c) **`Object.defineProperty(fsExports, 'constants', {configurable:true})` 后再 spread**——
     多此一举且语义含糊，`delete` 与兄弟文件同款、一眼可审；
  d) **仅靠 CI 迭代（继续盲推）**——本轮每轮往返 3-4 分钟且失败面要等跑完才知，容器本地门把
     往返压到秒级且可反复复现（已实证一字不差复现）；
  e) **EOL 探测逐文件 `git diff --quiet --ignore-cr-at-eol HEAD -- <path>`**——版本无关但 N 次
     调用（脏仓几十文件即几十次进程 spawn），且偏离 verify-postcheck 的既有单次 numstat 口径；
  f) **只报不改 EOL 缺陷**（CI 绿、非本轮原范围）——主流用户环境（Debian 12 / Ubuntu 24.04
     默认 git）下坑是活的，且修法与同仓既定口径一致、改动单函数局部，故随本变更一并清偿。

## 收口评审整改（findings 逐条处置）

评审 verdict=PASS（无 P1），两条 P2 均当场整改、三条 P3 两条接受一条随推送消解：

- **P2-1 根因叙述失实 → 已整改**：`test/backlog-batch-a.test.mjs` /
  `test/worktree-junction-fail-loud.test.mjs` 注释 + requirements FR-01 + 本记录第 5 条改为
  四象限实测口径（分叉轴 = node 版本：24.15 双端不炸、24.22/24.21/22.23 炸；ESM 命名空间
  合成描述符 writable:true 不是 CJS 导出形态）。
- **P2-2 字面 ` => ` 文件名误剔（审计放宽）→ 已整改**：EOL 探测改 `--numstat -z` 流解析
  （`numstatZPaths`：普通 `A\tD\t<path>\0`、rename `A\tD\t\0<old>\0<new>\0` 按位置取新名），
  字面 ` => ` 名原样保留；补非 windows 回归用例 + 源码钉断言 `-z` 在场。
- **P3-1 change.patch 含他变更 hunk（probe7 的 _module-map 登记）→ 接受**：基线..HEAD 区间
  一并冻结的共享仓事实，scopeAudit 已标 unplanned，非本变更交付面。
- **P3-2 最后两提交未推 → 已整改**：随本次整改一并推送，CI 复跑覆盖。
- **P3-3 change.patch 自身含 2 个裸 NUL 判二进制 → 接受**：删除 NUL 的诚实 diff 必然（旧行
  删除侧），冻结件不可直接检索但可转义读取。
