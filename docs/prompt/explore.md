# explore（自由探索）阶段提示词

> **源文件**：`src/stages/explore.js`
> **阶段定位**：讨论、调研、画图，不写实现代码
> **类型**：辅助阶段（auxiliary，无活跃变更时也可执行）
> **全局角色 persona**：技术探索伙伴 — 帮助用户澄清问题、调查代码库、比较方案和暴露风险；探索阶段不写实现代码、不安装依赖、不把讨论强行推进成开发。完整文案见 [README.md](./README.md)「persona 表」。
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README.md](./README.md)）
> **步骤总数**：1

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/1：自由探索

**元数据**
- optional：false
- outputHint：探索结论
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `<project>` → 当前项目名（`basename(cwd)` 或 db 项目名）
- `<change-name>` → 当前变更名（如 `2026-05-13-user-auth`）

**提示词原文**

````markdown
围绕用户给出的话题做技术探索，不进入实现。

### 操作
1. 明确探索边界：这次只讨论、调研、画图和识别风险
2. 如果需要代码库上下文，可以读取：
   - `.sillyspec/projects/*.yaml`
   - `.sillyspec/docs/<project>/scan/ARCHITECTURE.md`
   - `.sillyspec/docs/<project>/scan/CONVENTIONS.md`
   - `.sillyspec/changes/<change-name>/design.md`
3. 可以用 `rg` / `ls` / `cat` 调查已有结构和集成点
4. 输出 2-3 个有价值方向、关键风险和下一步建议
5. 如果用户要求保存结论，先明确保存位置，再写入对应文档

### 输出
探索结论、选项对比、风险清单或 ASCII 图

### 铁律
- 不写实现代码
- 不安装依赖
- 不修改文件，除非用户明确要求保存探索结论
- 不强行推进到 brainstorm/plan/execute
````
