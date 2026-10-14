---
author: flow-machine-draft
created_at: 2026-10-14T02:59:54.447Z
---
# 需求规格（Requirements）— 2026-10-14-redomain-domain-arg-normalize

## 功能需求

### FR-01: 库层入参归一化

- `src/redomain.js` **必须**导出纯函数 `normalizeDomainArg(v)`（trim → 剥前导 `fr/`（不区分大小写）→ 剥尾随 `.md`，幂等）；`redomainFrEntries` 与 `planRedomain` **必须**在其它任何判定/IO 之前对 `from`/`to` 归一化，归一化后为空串**必须**抛出含「fr/ 前缀」用法提示的 `Error`（禁止以 `fr/.md` 路径误入 `existsSync` 或产生半态写盘）。

#### 场景：主路径

- Given 知识库 fixture，When 以 `from: 'fr/auto-backend'` / `from: 'auto-backend.md'` 调用 `planRedomain`/`redomainFrEntries`，Then 行为与裸名 `auto-backend` 完全一致。

### FR-02: CLI 口径统一

- CLI `tests --redomain` **必须**经同一 `normalizeDomainArg` 处理 `--from`/`--to` 后再做用法校验与透传；全部回显（预览/完成/删壳/建目标/INDEX 行）与报错**必须**显示裸域名（禁止出现 `fr/fr/`）；用法提示**必须**写明可带 `fr/` 前缀与 `.md` 后缀。

#### 场景：主路径

- Given `--from fr/auto-backend --to platform-sync`，When 干跑，Then 预览首行显示 `fr/auto-backend.md → fr/platform-sync.md`（无 `fr/fr/`）。

### FR-03: 两种形态等价

- `--from fr/auto-backend` 与 `--from auto-backend`（含 `.md` 后缀形态）**必须**产出完全一致的干跑预览与 `--write` 迁移结果（同一目标文件、同一迁移条目集、同一 INDEX 行为）；`fr-index.js` 伪域告警提示语**不必改动**（其给出的 `fr/` 前缀形态经本修复即为合法输入）。

#### 场景：主路径

- Given 同一 fixture 分别以两种形态 `--write`，Then 迁移后知识库文件内容逐字节一致。

### FR-04: 测试覆盖

- `test/redomain.test.mjs` **必须**新增用例覆盖：`fr/` 前缀形态、`.md` 后缀形态、裸名原样、`fr/` 剥空拒绝、归一化幂等，以及 CLI 端到端前缀形态（干跑 + `--write` 与裸名等价、回显无 `fr/fr/`）。

#### 场景：主路径

- Given 修改完成，When 运行 `node --test test/redomain.test.mjs`，Then 全部用例（新增 + 既有）通过。

### FR-05: 全量门禁

- `npm test` 与 `npm run lint` **必须**全绿（flow done 实测门亲自跑，不靠口头）。

#### 场景：主路径

- Given 收口，When flow done 实测，Then 两命令 EXIT=0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/redomain.test.mjs「⑥ 入参归一化：fr/ 前缀与 .md 后缀形态与裸名等价；剥空拒绝；幂等」
FR-02: test/redomain.test.mjs「⑦ CLI --from fr/ 前缀端到端：干跑/--write 与裸名等价且回显裸域名」
FR-03: test/redomain.test.mjs「⑦ CLI --from fr/ 前缀端到端：干跑/--write 与裸名等价且回显裸域名」
FR-04: test/redomain.test.mjs「⑥ 入参归一化：fr/ 前缀与 .md 后缀形态与裸名等价；剥空拒绝；幂等」（+⑦）
FR-05: 不适用：全量门禁由 flow done 实测（npm test + npm run lint），非单测用例面
