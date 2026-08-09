---
id: task-05
title: 新增 test/git-helper-injection.test.mjs（空格不拆词 / $(touch) 副作用锚点证明不经 shell / 三语义回归 / grep 反向断言无字符串拼接 git）（覆盖：FR-07）
title_zh: 新增 git 调用入口的注入与空格回归测试
author: qinyi
created_at: 2026-08-09 11:19:03
priority: P0
depends_on: [task-02, task-03, task-04]
blocks: [task-06]
requirement_ids: [FR-07]
allowed_paths:
  - test/git-helper-injection.test.mjs
goal: >
  一句话：新增 git 调用入口的注入与空格回归测试，用副作用文件锚点证明不经 shell、含空格文件名不拆词、三 helper 语义回归、grep 反向断言无字符串拼接残留。
implementation:
  - 新建 test/git-helper-injection.test.mjs，遵循项目惯例——node:assert strict 断言，失败 console.error 后 process.exit(1) 致非零 exit，runner 按 exit code 判通过
  - 空格不拆词用例——在临时目录构造含空格文件名，经 git helper 数组调用，断言该文件名作为独立 argv 元素传递不被切词、git 操作命中正确文件
  - 不经 shell 锚点用例——构造含命令替换元字符（美元符加括号、反引号、分号）的文件名经数组调用后，断言标记副作用文件未被创建（若经 shell 会执行命令产生副作用，文件不存在即证明不经 shell）
  - 三 helper 语义回归——safeGit 返回对象带 value 与 error 字段、git 失败抛异常返回字符串、gitQuiet 失败返回 null，各自 trim 与失败语义分别断言
  - 反向断言用例——读取 src/ 下 worktree.js、worktree-apply.js、index.js、run/shared.js 源码文本，grep 断言不再存在字符串拼接形式的 git 调用模板串
acceptance:
  - node test/git-helper-injection.test.mjs 退出码为 0，全用例通过
  - 含命令替换元字符的文件名经调用后副作用标记文件不存在，证明不经 shell
  - 含空格文件名作为独立 argv 元素不拆词，git 操作命中正确文件
  - 三 helper 各自返回值与失败语义回归断言全部命中
  - 反向断言确认 src/ 无字符串拼接形式的 git 调用残留
verify:
  - node test/git-helper-injection.test.mjs
  - node test/run-tests.mjs
constraints:
  - 仅新增本测试文件，不改动 src/ 任何实现代码
  - 副作用锚点与临时目录均在隔离 temp 目录构造，测试结束清理不污染环境
  - 依赖 task-02、03、04 已完成公共入口收口，测试才具备被测对象
  - 用例失败一律非零 exit，不用 console.assert 这类不抛错自报成功的写法
---
