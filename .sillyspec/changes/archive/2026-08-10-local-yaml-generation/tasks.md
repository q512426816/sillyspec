---
author: qinyi
created_at: 2026-08-10 22:01:44
change: 2026-08-10-local-yaml-generation
revision: 1
---

# 任务清单（Tasks）— local.yaml 配置体系改造（revision 1）

> 仅列任务名（骨架），细节在 plan 阶段展开（plan.md 合并/重排为执行 task 卡片）。按 Wave 划分（design §5：Wave1 detect 核验 → Wave2 MCP 迁移 → Wave3 platform 统一 → Wave4 scan 改造 → Wave5 消费侧兜底 → Wave6 修正与同步）。

## Wave 1：detect 核验增强（纯本地，可独立测）

- [ ] task-01: `src/local-detect.js` nodejs 分支读 `package.json` scripts 核验 build/test/lint 存在性，缺失不写键；gradle 核验 `gradlew` 决定 `./gradlew` vs `gradle` 前缀（maven/make/generic 维持）；JSON.parse 失败 throw 中文
- [ ] task-02: `test/local-detect.test.mjs` Case1 期望值改（空 scripts→无命令）+ Case3 改造补 gradlew 断言 `./gradlew` + 新增 Case3b 无 gradlew 断言 `gradle` + 新增 nodejs 有 scripts case

## Wave 2：MCP 凭据迁移（dispatch 子系统，revision 1 新增）

- [ ] task-03: 新增 `src/sillyhub-mcp/config.js` `readMcpConfig(cwd)` 共享 helper（js-yaml 读 local.yaml mcp 段 mcp.url/mcp.token + env fallback，best-effort 不抛不发网络）
- [ ] task-04: `src/sillyhub-mcp/client.js` 构造函数加 cwd 参数（默认 process.cwd()），读 mcp 段 via readMcpConfig；优先级：显式 url/token > local.yaml mcp 段 > env fallback；注释 :6-9 配置来源更新
- [ ] task-05: `src/dispatch/probe.js` `configFingerprint`(:64) 改读 local.yaml mcp.url（+ env fallback）；`probeSillyHub` no-config(:145) 改读 readMcpConfig；`new SillyHubMcpClient()`(:158) 传 cwd
- [ ] task-06: `src/stages/execute.js` `getDispatchMode`(:458) hasConfig 改 readMcpConfig + env fallback（三态语义不变）；dispatchSection(:602) 文案改
- [ ] task-07: `test/dispatch/path-a-probe.test.mjs` 5 处 `new SillyHubMcpClient({url,token})` 核验零回归（显式覆盖优先级最高）

## Wave 3：platform connect 统一（revision 1 新增）

- [ ] task-08: `src/sync.js` `connect`(:150-167) 写 platform 段 + mcp 段（同源假设，mcp.url/mcp.token 复用 platform）；已有 mcp 段则保留不覆盖（R-09 缓解）

## Wave 4：scan Step6 改造（原 + revision 1 扩展）

- [ ] task-09: `src/stages/scan.js` steps[5] Step6 prompt 加 agent 补策略字段引导（test_strategy/install/env/module_paths/known_failures）+ **platform/dispatch/mcp 段检查提示**（缺失分别提示 platform connect/手填 dispatch/手填 mcp 或设 env）+ 铁律段 + 同步示例 yaml（键视 scripts 存在而异）
- [ ] task-10: `src/stages/scan.js` steps[10] Step11 第 10 条「标记 unavailable」调整为复查 detect 核验结果

## Wave 5：消费侧兜底

- [ ] task-11: `src/stages/execute.js` 行121/240 读 local.yaml 加缺失兜底引导
- [ ] task-12: `src/stages/verify.js` 行69/167 读 local.yaml 加缺失兜底引导

## Wave 6：修正与文档同步

- [ ] task-13: `src/stages/doctor.js` 行353 `sillyspec init` → `sillyspec local detect`
- [ ] task-14: 跑 `node docs/prompt/_extract.mjs` 刷新 `docs/prompt/{scan,execute,verify,doctor}.md` 镜像
- [ ] task-15: `docs/sillyspec/file-lifecycle.md` 更新 local.yaml 生成逻辑（核验版）+ mcp 段描述 + updated_at
- [ ] task-16: `.claude/skills/` 对应 skill 检查同步（SKILL 对外纯净性）
- [ ] task-17: `npm test` + `npm run lint` 全量验证（含 test/dispatch/path-a-probe.test.mjs 5 处构造零回归）
