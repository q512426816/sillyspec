---
author: flow-machine-draft
created_at: 2026-10-21T15:07:47.078Z
---
# 提案书（Proposal）— 2026-10-21-deps-batch-runner-flags

## 动机

任务原话转写：deps 批保留运行器尾随 flag（并行恢复）

动机（dsh 会话 0ff6f1c8 补充诊断 22:53 转写）：multi-agent-platform verify 单轮 26.5 分钟中，deps(auto-py) 批把 124 个后端测试文件（2081 用例）拼成单进程串行 pytest 命令——src/verify-postcheck.js buildDepsBatches 的运行器提取正则（:2904 懒惰匹配到 pytest 一词为止）把 local.yaml 显式配置的 -q --no-cov -n auto 全部静默丢弃，单核串行 1183 秒；同仓全量 4771 例带 -n auto 仅 357 秒（local.yaml ql-20260822-003 实测）——同规模本该 ~2 分钟，实际差 6-10 倍。叠加优先面豁免帽（:2881-2886 变更自身+FR 绑定整跑不裁）批规模只靠超时兜底，600s 上限截在 69% 判失败白跑 12.7 分钟，六轮验证累计空耗约 1 小时。

成功标准：
- buildDepsBatches 的 pytest 运行器提取保留模块命令中 runner 之后的尾随 flag（如 -n auto、--no-cov、-q、--cov-report=xml；含吃值 flag -n/-k/-m 等的值一并保留），原命令的位置参数（文件/目录路径）仍被丢弃由批文件面替代
- 批命令形态钉死：cd backend && uv run pytest -q --no-cov -n auto <批文件…>；无尾随 flag 的既有配置零变化（缺省不加 -n auto——尊重显式配置，不引入意外并行）
- extractRunnerTrailingFlags 纯函数导出 + buildDepsBatches 直测：断言含 -n auto 命令的批命令保留该 flag、无 flag 命令逐字不变、位置参数不混入
- 既有受影响测试面全绿（verify-postcheck 相关既有用例）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. buildDepsBatches 的 pytest 运行器提取保留模块命令中 runner 之后的尾随 flag（如 -n auto、--no-cov、-q、--cov-report=xml；含吃值 flag -n/-k/-m 等的值一并保留），原命令的位置参数（文件/目录路径）仍被丢弃由批文件面替代
2. 批命令形态钉死：cd backend && uv run pytest -q --no-cov -n auto <批文件…>；无尾随 flag 的既有配置零变化（缺省不加 -n auto——尊重显式配置，不引入意外并行）
3. extractRunnerTrailingFlags 纯函数导出 + buildDepsBatches 直测：断言含 -n auto 命令的批命令保留该 flag、无 flag 命令逐字不变、位置参数不混入
4. 既有受影响测试面全绿（verify-postcheck 相关既有用例）

## 成功标准（可验证）

1. buildDepsBatches 的 pytest 运行器提取保留模块命令中 runner 之后的尾随 flag（如 -n auto、--no-cov、-q、--cov-report=xml；含吃值 flag -n/-k/-m 等的值一并保留），原命令的位置参数（文件/目录路径）仍被丢弃由批文件面替代
2. 批命令形态钉死：cd backend && uv run pytest -q --no-cov -n auto <批文件…>；无尾随 flag 的既有配置零变化（缺省不加 -n auto——尊重显式配置，不引入意外并行）
3. extractRunnerTrailingFlags 纯函数导出 + buildDepsBatches 直测：断言含 -n auto 命令的批命令保留该 flag、无 flag 命令逐字不变、位置参数不混入
4. 既有受影响测试面全绿（verify-postcheck 相关既有用例）
