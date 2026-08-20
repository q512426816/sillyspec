# Baseline Checkpoint 边界测试

| # | Case | 期望 | 结果 | 问题 |
|---|------|------|------|------|
| 1 | 删除文件 | task diff 包含 delete | ✅ PASS | diff:D b.txt → applyOk:true, b.txt 已删除 |
| 2 | 文件重命名 | apply 后正确重命名 | ❌ FAIL | 详见下方分析 |
| 3 | 同文件 staged+unstaged | 工作区版本正确 | ✅ PASS | worktree a.txt="unstaged-version", baselineCommit 存在, apply 正常 |
| 4 | .gitignore 文件 | 不纳入 checkpoint | ✅ PASS | baselineFiles 不含 debug.log, worktree 内也无 debug.log |
| 5 | 二进制文件 | 正确 overlay | ❌ FAIL | 详见下方分析 |
| 6 | apply conflict | 失败且不污染主工作区 | ✅ PASS | apply 失败 (base hash 不一致), 主工作区保持 MAIN-VERSION |

结论：4 PASS / 2 FAIL (4/6)

---

## 失败 Case 详细分析

### Case 2: 文件重命名 — ❌ FAIL

**错误信息：**
```
patch 生成/应用异常: Command failed: git add -- meta.json -- new.txt
致命错误：路径规格 '--' 未匹配任何文件
```

**根因分析：**

在 `worktree-apply.js` 中，`applyWorktree` 计算 untracked 文件时使用：
```js
const untrackedRaw = gitQuiet(worktreePath, `ls-files --others --exclude-standard`);
const untrackedFiles = untrackedRaw
  ? untrackedRaw.split('\n').filter(Boolean).filter(f => !f.startsWith('.sillyspec/') && f !== 'meta.json')
  : [];
```

但后续生成 patch 时，判断 tracked vs untracked 的逻辑是：
```js
const trackedFiles = patchFiles.filter(f => {
  return gitQuiet(worktreePath, `cat-file -e ${diffBase}:${f}`) !== null;
});
const untrackedPatchFiles = patchFiles.filter(f => !trackedFiles.includes(f));
```

对于 rename `old.txt → new.txt`，`git diff --name-status` 显示 `R100 old.txt new.txt`（即 rename）。`changedFiles` 列表中 `new.txt` 被视为 tracked 文件（通过 git diff 获得），**理论上应该归入 trackedFiles**。

但问题出在 `git diff --name-only ${diffBase}` 只返回了 `new.txt`（rename 目标），而 `meta.json` 也被 baseline checkpoint commit 创建后被标记为 untracked（因为 ls-files --others 可能包含了它）。过滤逻辑 `f !== 'meta.json'` 理论上应该排除它，但实际崩溃说明 `meta.json` 混入了 untrackedPatchFiles 列表，导致 `git add -- meta.json -- new.txt` 失败（meta.json 已在 worktree 的 index 中）。

**更准确的原因：** 在 apply 阶段，如果 `changedFiles` 中的 `new.txt` 被分类为 untracked（因为它在 baselineCommit 中不存在），同时 `meta.json` 也没有被正确排除，就会导致 `git add -- meta.json -- new.txt` 这样的混合命令中 meta.json 已在 index 中，`--` 分隔符后面的路径被误读。

**修复建议：** 在 `applyWorktree` 中更严格地过滤 `meta.json` 和 `.sillyspec/` 前缀文件，或改用单独的 `git add` 命令而非合并路径参数。

---

### Case 5: 二进制文件 — ❌ FAIL

**现象：**
```
原文件 hex: 89504e470d0a1a0a (PNG 签名, 8 bytes)
worktree hex: efbfbd504e470d0a1a0a (10 bytes)
```

`\x89` 被替换为 `\xEF\xBF\xBD`（UTF-8 replacement character U+FFFD）。

**根因分析：**

`_overlayBaseline` 方法中使用 `execSync('git diff --cached --binary', { encoding: 'utf8' })` 获取 patch 内容。`encoding: 'utf8'` 会对 stdout 进行字符串解码，导致 patch 中的二进制 literal（binary diff 部分）被 UTF-8 解码时损坏（`\x89` 是无效 UTF-8 起始字节，被替换为 replacement character）。

虽然使用了 `--binary` flag 让 git 生成二进制 patch，但 Node.js 的 `execSync` 的 `encoding: 'utf8'` 在输出层面破坏了二进制数据。

**修复建议：** 对二进制文件，不应通过 `git diff + git apply` 的文本 patch 路径，而应使用 `git diff --binary` 并以 **Buffer 模式**（不指定 encoding）读取，再用 `git apply` 处理。或对已知二进制文件改用直接文件复制（`readFileSync` + `writeFileSync` 使用 Buffer）。

---

### 总结

| Bug | 位置 | 严重度 | 类型 |
|-----|------|--------|------|
| rename 导致 meta.json 混入 untracked 列表 | worktree-apply.js untracked 过滤 | 🟡 Medium | 逻辑遗漏 |
| 二进制文件 overlay UTF-8 损坏 | worktree.js _overlayBaseline execSync encoding | 🔴 High | 数据损坏 |
