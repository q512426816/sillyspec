---
author: flow-machine-draft
created_at: 2026-10-16T10:20:18.913Z
---
# 决策记录（Decisions）— 2026-10-16-ci-linux-residual-fix

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- **最大风险：删 `constants` 键后 quicklog 图内若有代码读 `fs.constants`** → 运行期取到 `undefined` 而静默错行为。核验：`grep -n constants src/quicklog.js src/git-helper.js` 零命中， 且容器/本机双端该文件 12/12 全绿（③b 走的就是 mock 后的真实 quicklog 调用链）。 - **次风险：⑥段分叉把 linux 侧断言写成「永远绿」的空断言**（假验证）。缓解：linux 分支断言 `missing.length === 1 && /Src\/Foo\.js/`（对具体路径形态断言，不是仅判 `!== 0`），且第一段 断言（`./` 前缀 + 注记命中）在双端恒真——linux 侧若归一/匹配链真坏，第一段先红。 - **NUL 字节替换风险：把内容改坏**（文件 337KB，含中文注释）。缓解：字节级替换只动 2 个 0x00 → 12 字节 `\u0000`，改前改后以 node 对比两处字符串值与 `node --check`、全量池零失败。 - **EOL 探测改 numstat 的风险：rename 形态被误判 EOL-only 剔出**（numstat 文本形态 `old => new` / `pre{old => new}post` 若不解析新名，`real` 集对不上 porcelain 路径 → 重命名被当纯行尾踢出 changedFiles，审计静默放宽）。缓解：改走 `-z` 流（按位置取新名， 与文本形态无关）——评审实测的字面 ` => ` 文件名误剔路径随之消失，并锁非 windows 回归用例； 另注意 `git diff --numstat` 在纯 EOL 变更上整条不输出（容器 git 2.39.5 实证）。 - **版本差在 CI 上不可见**（CI runner git 2.55 会过滤，行为测试恒绿）：故 FR-07 配源码钉而非 仅行为断言——源码钉是唯一在 CI 可见的回归锁；行为面另由容器 git 2.39.5 / WSL git 2.43.0 / Windows 三端各跑一次兜住。 - 试过但放弃： a) **改实现让 linux 也折叠大小写**——会在敏感文件系统上替写错路径放水（②类假阴性），实现 口径明确写着「Linux 保持敏感」，属设计意图而非缺陷； b) **⑥段整段 skip 非 win32**——CI 上的 linux 面就失去回归保护（⑥段正是被本变更修正的断言面）， 分叉断言比 skip 多钉住反向行为； c) **`Object.defineProperty(fsExports, 'constants', {configurable:true})` 后再 spread**—— 多此一举且语义含糊，`delete` 与兄弟文件同款、一眼可审； d) **仅靠 CI 迭代（继续盲推）**——本轮每轮往返 3-4 分钟且失败面要等跑完才知，容器本地门把 往返压到秒级且可反复复现（已实证一字不差复现）； e) **EOL 探测逐文件 `git diff --quiet --ignore-cr-at-eol HEAD -- <path>`**——版本无关但 N 次 调用（脏仓几十文件即几十次进程 spawn），且偏离 verify-postcheck 的既有单次 numstat 口径； f) **只报不改 EOL 缺陷**（CI 绿、非本轮原范围）——主流用户环境（Debian 12 / Ubuntu 24.04 默认 git）下坑是活的，且修法与同仓既定口径一致、改动单函数局部，故随本变更一并清偿。
