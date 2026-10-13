---
author: flow-machine-draft
created_at: 2026-10-13T12:26:51.888Z
---
# 决策记录（Decisions）— 2026-10-13-commit-guard-s3

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：CRLF/clean filter 形态下「假不一致」——add 与 pathspec 提交构造临时索引都走同一 clean filter，理论恒等；实验仓有 CRLF warning 未干扰。若真仓出现 filter 假阳性（理论上仅 .gitattributes 变更窗口内），fail-open 只多一条警告不阻断，噪声可控。次风险：GIT_INDEX_FILE 语义随 git 版本漂移（实验锚定当前 git 2.x 行为：pathspec 提交设临时索引、全量提交不设或设真索引）——两形态都有跳过护栏，语义漂移最坏退化为零告（漏报不误报）。试过放弃的方案：①比对工作树文件 mtime/hash 与暂存区——绕远且 filter 归一化要自己做，直接比索引 blob 更贴近提交语义；②S3 升格阻断——与 fail-open 硬约束冲突（守卫挂全会话共享 .husky，绝不能拦人提交），升格是策略决策另行裁决；③收口侧检测——信息窗口已过（外来 hunk 已进库），实证无效。均否。
