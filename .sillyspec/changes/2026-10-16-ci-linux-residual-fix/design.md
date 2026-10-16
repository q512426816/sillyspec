---
author: flow-machine-draft
created_at: 2026-10-16T08:28:38.146Z
---
# 设计记录（Design Record）— 2026-10-16-ci-linux-residual-fix

## 做法概述

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

4. **`src/run/shared.js` quick 审计 EOL 假 M 探测改 `--numstat`**（FR-07，容器门捞出的真实缺陷）：
   原探测用 `git diff --name-only --ignore-cr-at-eol HEAD`，而 `--name-only` **不吃**
   `--ignore-cr-at-eol`——git ≤2.43 仍把纯行尾重写文件列进名单（Debian 12 git 2.39.5 与
   Ubuntu 24.04 git 2.43.0 实测；git ≥2.54 才听话，CI runner 是 2.55 所以全绿看不出来），
   即「gen:types 行尾重写制造假 M」坑（2026-09-12 修复）在这些主流环境静默复活。改走
   `--numstat`（同 `src/verify-postcheck.js` reconcileActualFiles 的 eolOnlyFiles 既定口径，
   该处注释早已记载此怪癖）+ numstat 行解析取新路径（rename 两形态 `old => new` /
   `pre{old => new}post` 落到新名，避免重命名被误判 EOL-only 剔出）。配一条**源码钉**：
   行为测试在 CI 的新 git 上抓不到该版本差，钉住 `--numstat` 形态才有 CI 可见的回归锁。

**本地 Linux 复现能力**（本变更的方法论交付）：`docker run -d --name ssx-ci -v <仓>:/work
-w /work node:24-alpine sleep infinity` + `apk add git`，仓直接挂载（工作树全 LF，
`.gitattributes` `* text=auto eol=lf`，与 CI checkout 同字节）。失败面先容器内复现（首轮即
一字不差复现 CI 的 TypeError 与 ⑥段 missing），修完在容器里跑全量池——把「盲推等 CI」换成
「本地 Linux 门」。

## 接口契约

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

## 边界与并发（盲维四问——每问必答）

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

- **最大风险：删 `constants` 键后 quicklog 图内若有代码读 `fs.constants`** → 运行期取到
  `undefined` 而静默错行为。核验：`grep -n constants src/quicklog.js src/git-helper.js` 零命中，
  且容器/本机双端该文件 12/12 全绿（③b 走的就是 mock 后的真实 quicklog 调用链）。
- **次风险：⑥段分叉把 linux 侧断言写成「永远绿」的空断言**（假验证）。缓解：linux 分支断言
  `missing.length === 1 && /Src\/Foo\.js/`（对具体路径形态断言，不是仅判 `!== 0`），且第一段
  断言（`./` 前缀 + 注记命中）在双端恒真——linux 侧若归一/匹配链真坏，第一段先红。
- **NUL 字节替换风险：把内容改坏**（文件 337KB，含中文注释）。缓解：字节级替换只动 2 个
  0x00 → 12 字节 `\u0000`，改前改后以 node 对比两处字符串值与 `node --check`、全量池零失败。
- **EOL 探测改 numstat 的风险：rename 形态被误判 EOL-only 剔出**（numstat 的
  `old => new` / `pre{old => new}post` 形态若不解析新名，`real` 集对不上 porcelain 路径 →
  重命名被当纯行尾踢出 changedFiles，审计静默放宽）。缓解：`numstatNewPath` 显式解析两形态，
  并以容器内实测（staged `a.js → b.js` 叠加行尾重写 → changedFiles 含 b.js、eolOnlyFiles 空）
  核验；另注意 `git diff --numstat` 在纯 EOL 变更上整行不输出（容器 git 2.39.5 实证）。
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
