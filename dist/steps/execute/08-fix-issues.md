如果测试失败或子代理返回 BLOCKED，主代理处理修复。

**测试失败修复循环：**

```
ROUND = 1
MAX_ROUNDS = 5

while ROUND <= MAX_ROUNDS:
    1. 运行失败测试，捕获完整输出
    2. 全部通过 → 跳出循环，标记 ✅
    3. 对每个失败测试：
       a. 读取 .sillyspec/local.yaml 中当前变更的 fixAttempts
       b. fixAttempts >= MAX_ROUNDS → 跳过，标记 ❌ MAX_REACHED
       c. 否则 → 重新 dispatch 子代理修复，prompt 包含：
          - 失败的测试文件路径和测试名
          - 完整错误信息（含期望值 vs 实际值）
          - 相关源文件路径
          - "只修复这个测试失败，不要改其他代码"
       d. 修复后重跑确认
       e. 通过 → fixAttempts 不变；仍失败 → fixAttempts + 1
    4. 写入 .sillyspec/local.yaml
    5. ROUND++
    6. 本轮无任何修复 → 跳出循环
```

**BLOCKED 处理：**
- AskUserQuestion 三选一：重试 / 跳过 / 停止
