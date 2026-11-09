---
author: flow-machine-draft
created_at: 2026-11-09T16:31:07.483Z
---
# 需求规格（Requirements）— 2026-11-10-ci-platform-test-fixes

## 功能需求

### FR-01: 两个失败用例改为平台无关后，Windows 本地复跑全绿（fr-regress-cap 3/3、eval-knowledge-runner 39/39）

- **必须**：`fr-regress-cap.test.mjs` ③ 的仓根 local.yaml 断言改为在场才断言「无键」（缺席不抛 ENOENT）；`eval-knowledge-runner.test.mjs` Test9 重复标签夹具改用多字标签（不撞盘符分支）。两文件在 Windows 本地复跑必须 0 失败。

#### 场景：主路径

- Given Windows 本仓（`.sillyspec/local.yaml` 在场）/ When 复跑两文件 / Then 全绿（3/3、39/39）。

#### 场景：边界——CI checkout 态

- Given 仓根无 local.yaml（gitignored，CI checkout 缺席）/ When 跑 `fr-regress-cap` ③ / Then 不抛 ENOENT，缺省 off 断言（readFrRegressCap=0）照常成立。

### FR-02: POSIX 形态输入行为正确——GitHub Actions test job 转绿

- **必须**：POSIX 路径形态下行为与 Windows 一致：local.yaml 缺失走条件跳过分支仍断言缺省 off；eval 夹具重复标签走 label:path 正则分支照常抛「仓标签冲突」。终验收为推送后 GitHub Actions `test` job 全绿。

#### 场景：主路径

- Given Linux CI runner（POSIX 路径 `/home/runner/...`、无 local.yaml）/ When 跑全量测试面 / Then 除两处修复点外零回归，test job exit 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-regress-cap.test.mjs「③ 本仓缺省断言与消费点单一源锚」（在场态断言；缺席态由同文件 ②「不可读 fail-soft=0」覆盖）
FR-01: test/eval-knowledge-runner.test.mjs「重复标签抛错（不静默覆盖）」（多字标签夹具，两平台同判）
FR-02: 不适用：Linux CI 进程本地无法实例化，逻辑分支已由 FR-01 两用例的平台无关实现覆盖，终验收=推送后 GitHub Actions test job 全绿（实证留痕于收口与提交信息）
