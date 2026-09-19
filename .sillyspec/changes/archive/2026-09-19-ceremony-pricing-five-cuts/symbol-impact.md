# 符号影响面报告

> tasks.md 内容指纹（生成时）: d41fe59c3ebd735a——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（sillyspec symbol-impact --change <变更名>，gate 失败时也会自动落一份）。

- task-01: 新增导出无既有签名变更——NEW:src/blast-surface.js 四导出（resolveBlastSurfaces / loadBlastDeclarations / blastPrefixMatches / BLAST_NO_HIT_TIER，全新模块零调用点破坏）；src/modules.js rebuildModuleMap 发射体内部增顶层段回插（签名不变，export async function rebuildModuleMap(cwd, {force}) 原样）；src/config-schema.js SCHEMA 常量 ceremony 段增 blast_surfaces 键行（数据扩展，消费面为 config 校验/文档渲染，无签名级变更）。
- task-02: 新增导出 resolveChangeRisk（src/change-risk-profile.js，全新函数零调用点破坏）；RISK_TO_TIER 为既有导出原样复用；本 task 禁删既有导出（删除收口归 task-03）——无既有签名变更。
- task-03: ①detectChangeRisk 删除（既有导出，breaking——受影响调用点八处全部在本 task 范围内切换：src/stage-contract.js:385/:658/:1382/:1662、src/run/gates.js:632、src/review-tier.js:118、src/run/verify-quality-scan.js:531、src/verify-postcheck.js:3082）；②computeCeremonyTier 签名增可选入参 blastTier（向后兼容，既有调用点 gates.js:640 / review-tier / verify-postcheck:3077 在本 task 同批切换）；③新增导出 applyDeclarationCatchUp（src/ceremony-tier.js，零调用点破坏）；④reconcileDualRun 返回 severity 取值域扩 warn（返回结构零新增字段，消费点 verify-postcheck runCeremonyDualRunCheck 本 task 同批适配）；⑤verify-postcheck 模块私有 readCeremonyFactContent 与 CEREMONY_FACT_CONTENT_* 常量删除（模块私有零外部调用点）；⑥stage-contract-spec.js 仅注释。
- task-04: 无签名级变更（src/stages/verify.js 教学段文案、模块文档、验收流程）。
