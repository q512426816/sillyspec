---
author: flow-machine-draft
created_at: 2026-11-23T15:58:38.796Z
---
# 需求规格（Requirements）— 2026-11-23-release-33410

## 功能需求

### FR-01: core-engine 模块文档补探针 1 方括号字面路径行为变更说明

- **必须**：`.sillyspec/docs/sillyspec/modules/core-engine.md` 新增一节，说明 2026-11-23-probe1-bracket-path-blind 的行为变更（字面路径优先扫描、未扫描面禁止全清结论）。

#### 场景：文档在场

Given 探针修复已归档
When 读 core-engine.md
Then 可见探针 1 行为变更说明节（含变更名锚）

### FR-02: _module-map.yaml core-engine 模块登记 verify-probes 同族测试文件

- **必须**：`_module-map.yaml` 的 `core-engine.paths` 补登记 `test/verify-probes*.test.mjs` 同族测试文件，消除「test 目录未登记模块图」advisory。

#### 场景：模块命中

Given 后续变更交付 verify-probes 同族测试文件
When 模块对账
Then 命中 core-engine 模块而非伪域 auto-*

### FR-03: package.json/package-lock 升 3.34.10，quick-retired R5 锚同步 3.34.10

- **必须**：`package.json` 与 `package-lock.json` 版本号 3.34.9 → 3.34.10（最小补丁位）。
- **必须**：`test/quick-retired.test.mjs` R5 断言锚同步为 3.34.10（当前停在 3.34.8，3.34.9 发版漏同步已红）。

#### 场景：版本一致

Given 版本面与锚同步完成
When 运行 quick-retired 测试
Then R5 断言通过

### FR-04: lint 绿、quick-retired 与 verify-probes 同族测试绿

- **必须**：`node test/check-syntax.mjs`（lint）exit 0；`test/quick-retired.test.mjs` 与 verify-probes 同族测试文件全绿。

#### 场景：发版前门

Given 版本面与文档改动完成
When 跑 lint 与相关测试
Then 全绿

### FR-05: npm publish 3.34.10 成功

- **必须**：`npm publish` 后 registry 上 sillyspec 最新版本为 3.34.10（`npm view sillyspec version` 验证）。

#### 场景：发布验证

Given 发版提交完成
When npm publish + npm view sillyspec version
Then 输出 3.34.10

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档段落补记，无行为可断言（验收靠规范与人工）
FR-02: 不适用：模块图登记为配置数据，收口模块对账消费即为验收
FR-03: test/quick-retired.test.mjs「R5 package.json 版本 3.34.10」
FR-04: test/quick-retired.test.mjs 整文件全绿＋test/verify-probes 同族 7 文件全绿
FR-05: 不适用：发布动作，以 npm registry 版本面为验收（npm view sillyspec version）
