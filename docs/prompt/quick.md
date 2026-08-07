# quick（快速任务）阶段提示词

> **源文件**：`src/stages/quick.js`
> **阶段定位**：跳过完整流程，直接做
> **类型**：辅助阶段（auxiliary，无活跃变更时也可执行）
> **全局角色 persona**：全栈老兵 — 实战经验丰富的全栈工程师，不纠结架构和流程，理解需求就直接干；问题排查思路开阔，解决方案实用接地气。完整文案见 [README.md](./README.md)「persona 表」。
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README.md](./README.md)）
> **步骤总数**：3

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/3：理解任务

**元数据**
- optional：false
- outputHint：任务理解
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `<quick-session-id>` → quick 会话 ID（= changeName = `quick-<uuid8>`），跨进程靠 `--change` 传递。**quick 专有**
- `<linked-changes>` → 从 `.runtime/quick-sessions/<sessionId>/guard.json` 读关联变更列表（无则 `（无）`）。**quick 专有**
- `<quicklog-id>` → 从 guard.json 读 `quicklogId`（未分配则 `(未分配)`），由 CLI 启动时分配。**quick 专有**
- `<git-user>` → `git config user.name`（失败为 `unknown`）
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 specRoot
- `<project>` → 当前项目名（`basename(cwd)` 或 db 项目名）

> quick 专有占位符（`<quick-session-id>` / `<quicklog-id>` / `<linked-changes>`）均由 `src/run/prompt.js` 在 quick 阶段注入，来源于 guard.json 与当前会话状态；完整映射见 [README.md](./README.md)「占位符总表」。

**提示词原文**

````markdown
解析任务参数，加载项目上下文。

### 📌 本 quick 会话 sessionId: <quick-session-id>
- CLI 是短进程，run 与 done 是独立进程，sessionId 靠 --change 跨进程传递
- **完成每个 step 必须带 --change <quick-session-id>**（命令由 CLI 在下方注入）；多会话并发时不带会命中他者会话状态

### 操作
1. 检查关联变更（`<linked-changes>`，逗号分隔的变更名列表；显示「（无）」= 不关联变更），确定记录方式
2. 理解任务：模糊则问一个问题确认
3. 加载项目信息：`cat {SPEC_ROOT}/projects/*.yaml 2>/dev/null`（了解项目结构和技术栈）
4. 加载上下文：`cat {SPEC_ROOT}/docs/<project>/scan/CONVENTIONS.md 2>/dev/null`
5. 加载本地配置：`cat {SPEC_ROOT}/local.yaml 2>/dev/null`（构建命令、测试命令、环境变量等）
6. 若有关联变更，加载每个变更的设计文档：`cat {SPEC_ROOT}/changes/<c>/design.md 2>/dev/null`（理解设计意图）
7. 如有需要，查询知识库：`cat {SPEC_ROOT}/knowledge/INDEX.md 2>/dev/null`

### 模块文档加载
8. 读取 `{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml`（不存在则跳过以下步骤）
9. 根据任务描述初步判断可能涉及的模块
10. 读取匹配到的 `{SPEC_ROOT}/docs/<project>/modules/<module>.md`

### QUICKLOG 记录（CLI 已接管，无需你手动创建）
本 quick 会话的 ql-ID 由 CLI 在启动时分配，已注入为 `<quicklog-id>`。CLI 同时已自动：
- 在 `{SPEC_ROOT}/quicklog/QUICKLOG-<git-user>.md` 写入「进行中」条目（含关联变更与预估文件）
- 对每个关联变更 `<c>`：在 `{SPEC_ROOT}/changes/<c>/tasks.md` 追加未勾选 task `- [ ] <quicklog-id> <任务描述>`

**你不要创建或修改任何 QUICKLOG 的条目骨架 / tasks.md 记录**——ql-ID 分配、「进行中」条目、状态翻转、task 勾选、轮转全由 CLI 接管，你无需手写。<quicklog-id> 可用于 design.md / plan.md / archive / 模块变更索引引用。

> ⚠️ 例外：step 3 --done 之后，CLI 落盘的 QUICKLOG 只是简版骨架，**你必须手动精修正文成丰富格式**（标题语义化 + 文件多行带括注 + 四段充实），详见 step 3「QUICKLOG 正文精修」。这是 quick 交付质量的一部分，不可跳过。

### 输出
任务理解 + 上下文摘要
````

---

## Step 2/3：实现并验证

**元数据**
- optional：false
- outputHint：实现摘要
- 等待配置：无（可直接 --done）

**提示词原文**

````markdown
直接在主工作区实现任务。

### 边界声明（quick 不校验 design.md）
关联变更的 design.md 仅供理解意图，**不作为验收基准**——quick 不 enforce design 一致性。需要 design 一致性保证 → 走完整流程（plan + verify）。发现 design 本身有错时，可 Reverse Sync 回写（见下方铁律）。

### 操作
1. 先读后写：调用已有方法前 `cat` 源文件确认签名，`grep` 确认方法存在
2. 写代码完成任务
3. 如涉及逻辑变更，建议写单元测试验证（不强制，纯配置/文档/小改动可跳过）
4. **不要做无谓的全量编译/构建。** 但——跑针对性的单元测试始终允许且鼓励（见 step3）；若本任务就是修测试/构建/基础设施本身，跑测试/构建即验收，应当跑，不算"编译"

### 输出
实现摘要 + 修改文件列表

### 铁律
- 不要修改无关文件
- 不要编造不存在的 CLI 子命令
- **Reverse Sync**：如果发现 Bug 是 design.md 遗漏导致的，先修 design.md 再修代码
````

---

## Step 3/3：暂存和更新记录

**元数据**
- optional：false
- outputHint：暂存和记录确认
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 specRoot
- `<project>` → 当前项目名（`basename(cwd)` 或 db 项目名）
- `<quicklog-id>` → 从 guard.json 读 `quicklogId`（未分配则 `(未分配)`）。**quick 专有**

**提示词原文**

````markdown
Git 暂存并更新任务记录。

### 📌 收尾确认
- 本步骤是最后一步，完成后 quick 会话即结束（--change 传递见首步 sessionId 说明）

### ⚠️ 结果摘要模板（必填，CLI 会校验结构）
`--output` 是 QUICKLOG「结果：」归档的唯一来源，**必须按此结构给全四项**（逐项一句话，不可用「见前述」替代）：

```
需求：用户/任务要什么
根因：为什么这样改（若纯新增/配置/样式无根因，写「无，纯新增/纯样式」）
方案：怎么改的
结果：验证情况（测试数 / lint / typecheck / 部署状态）
```

缺任一项，`--done` 会被拒并提示缺失字段，补全后重跑即可（不丢进度）。

### 操作
1. 查看 `git status --porcelain`，确认只包含本次 quick 相关文件
2. 使用 `git add -- <file...>` 暂存本次 quick 实际修改的文件（不要 commit，由用户通过统一提交工具处理）
   - 禁止使用 `git add -A`
   - 不要暂存 quick 开始前就已存在的无关改动
3. QUICKLOG / tasks.md 记录由 CLI 在本 step 完成时自动收尾（翻「已完成」+ 勾选 task + 轮转），你无需手动建/翻骨架——但**正文精修必做**（见下方「QUICKLOG 正文精修」）
4. 如果发现项目特有的坑，追加到 `{SPEC_ROOT}/knowledge/uncategorized.md`
5. 任务比预期复杂 → 建议用完整流程

### 模块文档同步
6. 读取 `{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml`（不存在则跳过以下步骤）
7. 对比本次修改的文件（`git diff --name-only HEAD`）与模块映射
8. 如果命中模块 → 直接同步模块文档：
   - 读取对应的 `{SPEC_ROOT}/docs/<project>/modules/<module>.md`（如不存在则新建）
   - 根据本次改动内容更新模块文档（正文描述当前状态，底部变更索引追加本步骤预注入的 ql-ID）
   - 变更索引格式：`- <quicklog-id> | <一句话描述>`
   - 写入模块文档
   - 使用 `git add -- <module-doc>` 暂存更新的模块文件
9. 未命中任何模块 → 跳过，不做额外操作

### 输出
暂存确认 + 记录路径 + 模块文档同步结果（如有）

### 📝 QUICKLOG 正文精修（--done 之后必做，不可跳过）
sillyspec run quick --done 成功后，CLI 已在 {SPEC_ROOT}/quicklog/QUICKLOG-<git-user>.md 落盘本次 <quicklog-id> 条目的简版骨架：状态翻「已完成」、「文件：」是单行逗号路径、正文是 --output 的四字段。骨架是机械产物不达标，你必须立即编辑该条目手动精修成丰富格式，三项必改：

1. 标题：把 ## <quicklog-id> | <时间> | <标题> 中的 <标题> 改为真实需求摘要（如「登录加 IP 限流（5 次/分）+ 失败 3 次滑块验证」）。禁止保留 CLI 兜底的 (quick 任务) 或一句话笼统描述。
2. 文件：把 CLI 写的单行「文件：a.js, b.js」改写为多行 bullet，每个文件带关键改动括注；禁止「（见实际改动）」或无括注纯路径单行。示例：
   文件：
   - backend/app/modules/auth/router.py（登录端点串 check_rate_limit→assert_captcha_if_needed）
   - backend/app/modules/auth/captcha_service.py（新建：限流 INCR + 失败计数 + Pillow 滑块生成/校验）
3. 正文：核对 需求： 根因： 方案： 结果： 四段逐项充实（--output 已写、CLI 原样插入，按需扩写），不允许只留一段「结果：」。

一条 quick = 一条独立 ql 条目；精修只动本次 <quicklog-id> 条目，不追加到旧条目。QUICKLOG 在 .sillyspec/（gitignore），精修不影响 --done 已通过的边界审计。
````
