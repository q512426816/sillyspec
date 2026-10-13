---
author: flow-machine-draft
created_at: 2026-10-13T02:46:21.712Z
---
# 需求规格（Requirements）— 2026-10-13-thin-empty-face-crosscheck

## 功能需求

### FR-01: 空冻结面 + design 声明清单非空（剔除 .sillyspec/ 前缀与已带 repo 标注条目后仍有未标注条目）时 flow done patch 子步阻断收口（exit 1 不归档），文案一次给全三处置路径；跨仓嫌疑条目点名三种正确写法（段头/子段/cross-repo: 前缀）

- flow done patch 子步 MUST 在冻结面为空且声明清单（剔除 `.sillyspec/` 前缀条目与带 e.repo 标注条目）仍有未标注条目时阻断收口（reportMidFail + exit 1，不标 done 不归档）；阻断文案 MUST 一次给全三处置路径（①主仓交付先提交后重跑 ②跨仓交付按规范标注后重跑 ③纯文档/裁剪清单或显式签收 --accept-empty-face），禁止依赖二跑定位；跨仓嫌疑条目 MUST 点名三种正确写法。

#### 场景：跨仓前缀形态命中阻断（实证形态复现）

Given thin 变更实现代码交付在 local.yaml 注册仓（主仓仅治理件提交、冻结面为空），design 文件变更清单裸写「仓目录名/路径」前缀形态
When flow done 执行 patch 子步
Then exit 1、change 保持 active，文案含「声明」「冻结面为空」矛盾点名、该条目（首段命中注册仓）与三种正确写法（段头「## <注册key> 仓变更」/子段「### <注册key>」/cross-repo:<key>: 前缀）

### FR-02: planEntries 解析与「疑似跨仓声明未按规范标注」告警在空冻结面也执行；嫌疑判定放宽为「路径主仓不存在即点名」（首段命中注册仓的额外标注 key）——非空冻结面分支行为零回归（既有测试全绿）

- planEntries 解析与防呆告警 MUST 在 ownFiles 判空之前执行（空/非空两分支共享同一份代码）；嫌疑判定 MUST 从「首段命中注册仓」放宽为「声明路径在主仓不存在即点名」，首段命中注册仓的条目 MUST 额外标注命中的 key；非空冻结面分支 MUST 行为零回归（同一实现位置前移，既有测试全绿）。

#### 场景：仓根相对路径盲区（放宽判定）

Given 空冻结面 + design 清单写仓根相对路径（首段不命中注册仓别名，如 src/routes/…）
When flow done 执行 patch 子步
Then 该条目按「主仓不存在」进嫌疑面被点名（不再因首段不命中而漏报），阻断与三处置文案同 FR-01

### FR-03: --accept-empty-face 显式签收放行并留痕（flow-state accept_empty_face 持久化，重跑不再阻断）；清单全部规范标注（e.repo）的纯跨仓空面不阻断，出空面跨仓冻结缺口 advisory

- `--accept-empty-face` MUST 放行空面门并在 flow-state.yaml 持久化 accept_empty_face 留痕（by/at/declaredCount），重跑（不带 flag）MUST 不再阻断；清单全部条目带 e.repo 规范标注的纯跨仓空面 MUST NOT 阻断，MUST 出「空面分支不做跨仓冻结」advisory 点名缺口。

#### 场景：签收留痕与免重拦

Given 空面门阻断后带 --accept-empty-face 重跑
Then 放行并在 flow-state 落 accept_empty_face；随后不带 flag 再跑 flow done（如评审修正后重入）不再被空面门拦

### FR-04: flow start 横幅在 local.yaml repos 注册非空时输出一行跨仓清单写法提示；注册为空时横幅输出逐字节不变

- flow start 横幅 MUST 在 local.yaml repos 注册非空时输出一行跨仓清单写法提示（段头「## <注册key> 仓变更」段内仓根相对路径 + 禁止裸写仓目录名前缀）；注册仓为空时横幅输出 MUST 与改动前逐字节一致（零回归）。

#### 场景：两态横幅

Given local.yaml 注册 1+ 仓 → 横幅含跨仓写法行；Given 无注册仓 → 横幅与旧版逐字节一致

### FR-05: 治理面-only 零声明清单的空面变更行为不变（空面跳过提示照旧，close-trace-freeze-integrity FR-01 ② 既有断言全绿）

- design 无文件变更清单（或清单剔除后为空）的治理面-only 空面变更 MUST 保持既有行为（空面跳过提示 + patchOk + 不落 patch 两件），close-trace-freeze-integrity 既有断言 MUST 全绿。

#### 场景：回归锚

Given 工件-only 面（无交付面改动、无声明清单）变更收口
Then 行为与 3.32.7 完全一致（空面提示、归档成功、无 patch 两件）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-empty-face-crosscheck.test.mjs「空面+声明清单未标注条目 → 阻断三处置」（含跨仓前缀形态命中与三种正确写法点名）
FR-02: test/thin-empty-face-crosscheck.test.mjs「仓根相对路径盲区放宽点名」＋「非空面防呆告警仍在（零回归）」
FR-03: test/thin-empty-face-crosscheck.test.mjs「--accept-empty-face 签收留痕免重拦」＋「纯跨仓规范标注空面 advisory 不阻断」
FR-04: test/thin-empty-face-crosscheck.test.mjs「flow start 横幅两态：注册仓非空出跨仓行/为空逐字节一致」
FR-05: test/close-trace-freeze-integrity.test.mjs「工件-only 面输出空面提示不落 patch」（既有回归锚，零改动跑绿）
