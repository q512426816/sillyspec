# 决策记录

## D-001@v1 r5-wiring-three 前史红豁免机器本位处理，根修另立变更
收口实测拦下 r5-wiring-three TDZ（stages/index.js 循环引用）。归属判别：基线 b195fe1f 原地 A/B 复现同错（Cannot access 'execute' before initialization），非本变更引入；execute.js:19-21 注释记载该坑形态曾专门防过（prompt.js→stages/index.js→execute.js 既有方向，叶子约束被后续依赖边破坏）。处置：local.yaml known_failures 锚定豁免（机器本位、注释留痕），根修（找反向边/断环）另立变更，不在本交付面夹带
