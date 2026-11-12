---
author: qinyi
created_at: 2026-07-24
updated_at: 2026-11-12
---

# 故障排查（Troubleshooting）

> sillyspec 是给 Agent 调用的 CLI。本页收录实际使用中撞过的环境/安装类故障及诊断步骤，供 Agent 或人类快速定位，不用从头摸索。

## sillyspec 命令报 `Cannot find module '.../node_modules/sillyspec/bin/sillyspec.js'`

### 症状
执行 `sillyspec`（或任意子命令）直接抛 Node 模块解析错误，sillyspec 代码**根本没机会运行**——报错发生在 npm shim 试图 require 入口文件时：

```
Error: Cannot find module 'C:\...\node_modules\sillyspec\bin\sillyspec.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:...)
```

### 根因
系统里存在**多份 sillyspec 全局安装**，PATH 优先解析到的那份是损坏的（`node_modules/sillyspec/` 只剩空壳，缺 `package.json` / `bin/sillyspec.js`），但 shim 文件还在并指向不存在的入口。常见于 **nvm 切换 Node 版本**：旧版本的全局 `node_modules` 残留了不完整的 sillyspec，新版本的 PATH 优先命中它。

> 关键：这个报错在 sillyspec 代码之外（npm shim 层），sillyspec 还没运行就报错了——所以给它加自检/容错救不了，真正的 fix 是清理损坏的那份安装。

### 诊断
```bash
# 1. sillyspec 当前解析到哪个 shim
which sillyspec
# → 例如 /c/nvm4w/nodejs/sillyspec

# 2. 那份的 bin 入口是否真的存在（缺失即损坏空壳）
ls "$(dirname "$(which sillyspec)")/node_modules/sillyspec/bin/sillyspec.js" 2>/dev/null \
  || echo "bin 缺失 → 当前解析到的是损坏空壳"

# 3. npm 全局前缀（通常含一份完整安装）
npm root -g

# 4. 找出所有 sillyspec 安装，逐份检查 bin/sillyspec.js
for d in /c/nvm4w/nodejs ~/AppData/Roaming/npm; do
  f="$d/node_modules/sillyspec/bin/sillyspec.js"
  [ -f "$f" ] && echo "✓ 可用: $f" || echo "✗ 损坏/缺失: $d/node_modules/sillyspec"
done
```

### 修复
保留**可用**的那份，删掉**损坏**的那份（shim + 空壳 node_modules）：

```bash
# 前置确认：可用的那份 shim 存在且其目录在 PATH（否则删完 sillyspec 命令会彻底丢失）
test -f ~/AppData/Roaming/npm/sillyspec \
  && echo "$PATH" | tr ':' '\n' | grep -qi "roaming/npm" \
  && echo "前置 OK，可安全清理损坏份"

# 删除损坏的那份（以 nvm4w 为例；按上面诊断结果替换路径）
rm -f /c/nvm4w/nodejs/sillyspec /c/nvm4w/nodejs/sillyspec.cmd /c/nvm4w/nodejs/sillyspec.ps1
rm -rf /c/nvm4w/nodejs/node_modules/sillyspec

# 清 shell 命令缓存并验证解析到可用份
hash -r
which sillyspec          # 应指向可用那份（如 ~/AppData/Roaming/npm/sillyspec）
sillyspec --version      # 应正常打印版本号
```

### 预防
- nvm 切换 Node 版本后，`sillyspec --version` 若报错，先按上面诊断是否多份安装冲突。
- 偏好 `npm uninstall -g sillyspec && npm install -g sillyspec` 在当前 Node 版本下重装，比手动 `rm` 更干净（前提是 npm 能识别到那份安装；空壳残留时 npm 可能识别不到，才需手动 `rm`）。

## 给 sillyspec 写测试 / 改 CRLF 文件时 Edit 工具失配

### 症状
用 Edit 工具改 CRLF 换行的文件（如 `test/revision-v1.test.mjs`、`src/run/complete.js`、`src/progress/stage-machine.js`、`src/stages/archive.js`）时，`old_string` 明明看起来对却报找不到匹配——因为 Edit 工具按 LF 匹配，文件却是 CRLF。临时 node patch 脚本若 anchor 写成 `"\n"` 同样失配。

### 根因
两层叠加：
1. **sillyspec 仓库源码 / 测试文件混用 CRLF / LF**（部分 CRLF、部分 LF），Edit 工具不感知。
2. **Edit 工具自身按 LF 匹配 `old_string`**，对 CRLF 文件失配——这是 agent 工具链行为，sillyspec 控不了。

### 诊断
```bash
# 看某文件是 CRLF 还是 LF（git bash 下）
file test/revision-v1.test.mjs                       # "with CRLF line terminators" = CRLF
grep -c $'\r' test/revision-v1.test.mjs              # >0 = 含 CR（即 CRLF）
```

### 当前绕过（已验证有效）
不改 Edit 行为，用 node 行级脚本绕开换行假设——按文件实际换行符 `split` / `join`，锚点按行内容匹配（不依赖换行符）：
```js
const lines = readFileSync(f, "utf8").split("\r\n")   // CRLF 文件按 \r\n 切
const idx = lines.findIndex(l => l.includes("<锚点文本>"))
lines.splice(idx + 1, 0, ...newBlockLines)            // 行级插入
writeFileSync(f, lines.join("\r\n"))                  // 按原换行写回
```
插入块本身也用 `"\r\n"` 拼接，保证写回后行尾一致、不混入 LF。

### 处置（2026-08-04，暂不立即做）
两个治本方向，**收益面窄**（仅 dogfood 维护场景，不影响 sillyspec 产品功能 / 传播），根因部分在 Edit 工具（sillyspec 控不了），暂记证据、不投入；撞到下次再评估升级：

> 轻度症状（2026-08-04 复盘 quick-③ 命中）：git 对 `.sillyspec/quicklog/`、`docs/` 提交时报「LF will be replaced by CRLF」刷屏噪音——同根（仓库 CRLF/LF 混用 + git autocrlf），下方方向 A 的 `.gitattributes` 一并治；无害，当前容忍。

- **方向 A（治本 / 侵入）**：加 `.gitattributes`（`* text=auto eol=lf`）+ `.editorconfig`，把现有 CRLF 文件一次性规范化为 LF。代价：大面积行尾 diff 噪声、Windows `git autocrlf` 需全员评估、需走 quick / 完整流程防回归。
- **方向 B（治标 / 窄）**：给 agent 一个 CRLF 感知的 `applyEdit` 助手 / 测试 helper。代价：只服务 dogfood 维护、非产品功能、本质绕过 Edit 工具（上面的行级 `split("\r\n")` 已够用）。

> 关联：[[memory: prompt-edit-crlf-quote-trap]]（改 prompt 的引号 / CRLF / 反引号坑）。

## 意图查询无法召回历史裁决（未修复 · 观察项）

### 症状
Agent 在「要不要做 X」的时点给出建议，而 X 早在历史变更中已被明确裁决否决或冻结——建议本身是错的，且**在任何自动注入面上都不会被拦下**。

实证（2026-11-12）：先输出「架构级立项：生成式当前行为契约快照」的完整建议，事后 grep `L3` 才命中 `.sillyspec/changes/archive/2026-10-15-fr-chain-l3-adjudication/decisions.md` 的 D-001@v1——该能力已于四周前（28 天）被证伪冻结。全程 `flow start` 的知识注入、`knowledge search` 均未提示。

### 根因
三层，第一层是主因（后两层在 D-001@v1 上被第一层遮蔽，但同样各自独立成立）。

**第一层：能力冻结类裁决根本不入库。**

入选裁决实际在 `src/decision-distill.js:100-106` 的 `dispositionOf`，值集来自 `src/decision-values.js`：

```js
if (s === 'rejected') return 'rejected'                            // 任意 type（含 scope）都留痕
if (IMPLEMENTED_TYPES.has(t) && IMPLEMENTED_STATUSES.has(s)) return 'implemented'
return null
// IMPLEMENTED_TYPES   = KNOWLEDGE_TYPES   = DECISION_TYPES.filter(t => t !== 'scope')  // decision-values.js:31
// IMPLEMENTED_STATUSES = ['confirmed', 'accepted', 'implemented']                      // decision-values.js:34
```

即 **scope 类型（status 非 rejected 时）不入库**；`decision-values.js:12-13` 明载「scope 刻意不入知识库——范围裁决」。注意 `decision-distill.js:20-22` 的头注仍是「五类 type」的旧描述（2026-10-20 已改为派生正典值集），引用时以 `decision-values.js` 为准。
另注：`scope + rejected` 因 rejected 分支优先**会**入库——被排除的只是「scope 且非 rejected」这一组合。

D-001@v1 的类型标为 `scope`，因此归档时 `flow-state` 虽记录 `distill: done`，该条目也从未进入 `knowledge/decisions/core-engine.md`——同变更的 3 条 FR 已正常入 `knowledge/fr/core-engine.md`（`grep -n "fr-chain-l3-adjudication"` 可证），唯独决策缺席。

设计假设是「范围裁决 = 不需要长期记住」。但「**冻结某个能力不建**」恰恰是未来最需要被召回的一类裁决：它不是范围取舍，是能力级的生死判定。**类型标注与情报价值错配，机制按设计正确执行，结果是决策永久沉默。**

**第二层：即使入库，意图查询也召不回。**

`matchKnowledge`（`src/knowledge-match.js:708`）在路由零命中后有两条词片兜底，都不足以救回 D-001@v1：

- `fallbackByQueryShingles`（`:390`）覆盖正常域文件，但要求词片在「标题 + 理由」中出现次数落在 `2 <= n <= ceil`（`:411`，`ceil = max(2, 条目数*5%)`）——单次词面命中不召回。
- 停车场兜底（`:713`）只对 `isParkingFile`（`decisions/unmapped.md` / `fr/unmapped.md`，`:335`）且 `status === 'rejected' || deathPath` 的条目生效——正常域的 `implemented` 决策（如 D-001@v1）不在覆盖范围。
- 两条通道都依赖字面词片（`queryShingles` `:308`，中文 2 字滑窗）：用户语言「生成式 / 快照 / 说明书」与内部术语「L3 / 活规格 / 证伪条款」零交集时同样失效。

**第三层：即使召回，防复潮注入面也只认 rejected / 死路。**

`flow start` 真正呈现给 agent 的「否决决策/死路注记」在 `src/flow.js:357` 过滤：

```js
const rejected = (km.decisionHits || []).filter((h) => h.deathPath || (h.status === 'rejected' && h.score > 0))
```

`implemented` 状态的决策（D-001@v1 正是）不满足任一条件——即便它已在知识库、也被词片召回，这个 agent 实际会看到的注入面仍然不会显示它。这是「裁决存在但永不露头」的最后一道闸。

### 诊断
```bash
# 1. 裁决本体仍在归档目录（数据没丢，只是没入库）
grep -n "冻结不建" .sillyspec/changes/archive/2026-10-15-fr-chain-l3-adjudication/decisions.md

# 2. 知识库中查无此条（四个关键词应全部零命中）
for kw in 冻结不建 活规格树 证伪条款 承接引用率; do
  printf "%-10s -> " "$kw"; grep -rl "$kw" .sillyspec/knowledge/ | tr '\n' ' '; echo
done

# 3. 确认为类型标注导致排除（应为「类型：scope」）
grep -n "类型：scope" .sillyspec/changes/archive/2026-10-15-fr-chain-l3-adjudication/decisions.md

# 4. 对照判定逻辑与正典值集（scope 不在 KNOWLEDGE_TYPES）
sed -n '100,106p' src/decision-distill.js
sed -n '20,34p' src/decision-values.js
```

### 处置
**未修复 · 观察项**——本条目仅登记，修复另立变更。候选方向（按收益排序）：

- **让「不做」有独立类型**：新增 `freeze` / `deprecate` 类（或对 `type=scope` 中带明确「不建 / 冻结 / 放弃」语义的条目开例外），使其强制入库并进入否决召回面。这是第一层根因的正解。
- **让静默变可见**：`flow done` 的 distill 摘要显式打印「N 条 scope 决策未入库」——不修召回也要让人知道有东西被丢弃。
- 第二层的词面/覆盖缺口收益较小：意图查询的语义匹配是检索架构问题，需独立设计，不宜与本次记录混做。

复核条件：下一次出现「提议做某个已被裁决否决/冻结的能力」时，若召回仍失效，本条目升级为必修。

> 关联：[[D-001@v1]]（`2026-10-15-fr-chain-l3-adjudication`——本轮被漏掉的裁决本体）。
