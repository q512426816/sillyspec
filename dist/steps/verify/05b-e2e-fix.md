**自动修复循环（选了策略 1 或 2 时）：**

```
ROUND = 1
MAX_ROUNDS = 策略1时为5，策略2时为50

while ROUND <= MAX_ROUNDS:
    1. 运行失败测试，捕获完整输出
    2. 全部通过 → 跳出循环，标记 ✅
    3. 对每个失败测试：
       a. fixAttempts >= MAX_ROUNDS → 跳过，标记 ❌ MAX_REACHED
       b. 否则 → 调用修复工具，prompt 必须包含失败测试路径、测试名、完整错误信息、相关源文件路径
       c. 修复后重跑确认
       d. 通过 → fixAttempts 不变；仍失败 → fixAttempts + 1
    4. 写入 .sillyspec/local.yaml
    5. ROUND++
    6. 本轮无任何修复 → 跳出循环
```

**禁止行为：**
- ❌ 只看错误摘要就修复（必须看完整输出）
- ❌ 跳过 fixAttempts 计数
- ❌ 一次修复多个不相关的失败（逐个修复，每次修复后重跑确认）
- ❌ 直接修改代码（verify 阶段禁止改代码）

**更新测试结果到 `.sillyspec/local.yaml`：**
```yaml
e2e:
  {变更名}:
    {测试文件名}:
      status: passed/failed
      fixAttempts: 0
```
