# R7 薄跑烟测提示词（贴给一个全新 agent 会话；30min 级小任务）

你是一个开发会话，任务：在下面的演示项目里完成一个小功能。本项目接入了一套新的
「2-调用」开发协议（flow），你是它的第一批真实用户——按协议干活即可，协议没让你做的事
就不要做。

【环境】
- 工作目录：C:\Users\qinyi\IdeaProjects\sillyspec\r7-test-env\demo-project（所有命令在此执行）
- CLI 入口（R7 版）：cmd //c ..\sillyspec-r7.cmd <命令...>
  （Git Bash 形态；PowerShell/cmd 形态：..\sillyspec-r7.cmd <命令...>）
- 会话标识：先执行 export SILLYSPEC_SESSION_ID=r7-smoke-1
- 项目现状：lib/calc.js 有 add；test.js 用断言风格测试；测试命令 node test.js

【任务】
给 calc 库增加两个函数并配套测试：
1. sub(a,b) 减法——成功标准：sub(5,3)=2 有测试
2. div(a,b) 除法，除零抛 Error('div by zero')——成功标准：div(6,3)=2 与除零抛错都有测试
既有 add 测试不得回归。

【协议契约——只有 2 次协议调用】
1. 第一次：cmd //c ..\sillyspec-r7.cmd flow start --change r7-smoke-add-sub-div --input "<把上面任务原话贴进去>"
   ——它会告诉你材料在哪、怎么干活。治理文档（提案/需求/任务清单）由 CLI 自动起草，你不要手写。
2. 中间：正常开发。改代码、写测试、git 提交（git add -A && git commit -m "..."）。
   不要跑任何 sillyspec run <stage> 命令；progress show 等只读命令也不必用——保持最小。
   如果你觉得自动起草的文档里机器写的部分说错了，唯一合法修改通道是 flow amend-draft
   （命令形态在上面输出里找）；不想改就直接忽略，不影响验收。
3. 第二次：干完并提交后 cmd //c ..\sillyspec-r7.cmd flow done --change r7-smoke-add-sub-div
   ——它是唯一裁决点：会真跑测试，失败会整单 FAIL（修好重跑同一条命令即可，断点自动续）。

【边界】
- 全程协议类调用只许上述 2 次（这是被测量的数字）。
- 不要读 sillyspec 的源码或它的变更文档（.sillyspec/changes/archive/**）——你是用户不是评审。
- .sillyspec/ 目录里不要手写任何文件（这也是被测量的面）。
- 测试必须真实通过；node test.js 自己先跑绿再 flow done。

【完成后汇报（务必按此格式，这是测试数据）】
1. 协议调用清单：每条 sillyspec 命令原文+次数
2. .sillyspec 写入清单：你亲手写过的文件（应为零；若用了 amend-draft 如实列出）
3. 摩擦记录：协议该给你而没给的信息/你想做但被拦的事，逐条列（没有写「无」）
4. flow done 是否一次通过；若失败过，失败原因与重入体验
5. 一句话：这个流程 compared 于你平时用的开发流程，最不习惯的一点是什么
