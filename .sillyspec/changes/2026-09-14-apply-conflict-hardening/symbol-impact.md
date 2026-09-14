# 符号影响面报告

> tasks.md 内容指纹（生成时）: 按当前 tasks.md 实测——重入本步时若指纹一致且结论完整直接沿用。
> 调用点扫描实测（2026-09-14，grep src/ 全量）：

- task-01: 无签名级变更。mergeDirtyOverlapThreeWay（worktree-apply.js:111）返回结构不变，内部写回后追加 safeGit add（行为增强非签名变化）；新增内部函数 writeApplyManifest（新导出面：内部使用，若 export 则新符号无既有调用点）；generateRescueCommands（:157）输出追加文案行，返回结构（commands/warnings）不变，调用方 index.js 展示面零影响。
- task-02: 新导出 collectActiveQuickGuardFiles（quicklog.js，新符号无既有调用点）；applyWorktree（worktree-apply.js）opts 增量字段 force/autoApply——既有调用点 index.js:2759（CLI apply）与 :2902 区域（assess 自动）均在任务范围内同步接线；withMainRepoLock 签名不变（预检为锁内调用非包装层改动）；预检抛错路径为新增行为（fail-closed exit 1），无既有消费者依赖被改语义。
- task-03: doctor-diagnostics.js dimensions 数组追加检查项（既有形态增量，无签名变化）； ROADMAP/troubleshooting 纯文档。
- task-04: 新测试文件+三模块卡纯文档，无符号变更。
