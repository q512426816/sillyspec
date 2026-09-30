---
author: flow-machine-draft
created_at: 2026-09-30T08:16:13.084Z
---
# 决策记录（Decisions）— 2026-09-30-quality-scan-passed-idempotent

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：幂等闸吞真实重测需求。三层防线：①passedKey 内容敏感（dedupKey 的文件集口径对同文件未提交修改是盲的——开发中被既有 noAI 动作测试当场抓住：fixture 同文件翻转失败版，dedupKey 全等闸误命中；内容键正是为此存在，测试第五轮钉死）②lint failed 记录不入闸（保 lint 阻断发声）③RERUN=1/force 逃生阀与失败闸同阀。已放弃方案：a) 闸键直接用 dedupKey——同文件未提交内容修改盲区会吞真实代码修改（实证如上），弃；b) 闸键用 rerunSignature——其内容敏感面只覆盖 test/ 目录（computeTestFaceDigest(join(cwd,'test'))），仓根/子目录源文件同文件修改仍盲，弃；c) execute 侧复用 loadReusableQualityScan（--done 读侧）——它只校验 fingerprint（文件集口径），同盲区，弃。已知残留：git() 缺省 trim 吃 porcelain 首行前导空格是既有全局行为（影响所有经 porcelainCodeLines 的路径解析首行），本变更只在自己调用点传 trim:false 修正，未动 git-helper 公共行为（影响面大，若修应独立变更）。
