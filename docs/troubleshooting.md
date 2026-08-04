---
author: qinyi
created_at: 2026-07-24
updated_at: 2026-08-04
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

- **方向 A（治本 / 侵入）**：加 `.gitattributes`（`* text=auto eol=lf`）+ `.editorconfig`，把现有 CRLF 文件一次性规范化为 LF。代价：大面积行尾 diff 噪声、Windows `git autocrlf` 需全员评估、需走 quick / 完整流程防回归。
- **方向 B（治标 / 窄）**：给 agent 一个 CRLF 感知的 `applyEdit` 助手 / 测试 helper。代价：只服务 dogfood 维护、非产品功能、本质绕过 Edit 工具（上面的行级 `split("\r\n")` 已够用）。

> 关联：[[memory: prompt-edit-crlf-quote-trap]]（改 prompt 的引号 / CRLF / 反引号坑）。
