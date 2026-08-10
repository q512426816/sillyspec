/**
 * readMcpConfig — SillyHub MCP 凭据共享 helper（design §7.2 / §6 mcp 凭据数据流）。
 *
 * 统一读源，供三处消费点：① client.js 构造函数（_url/_token/_configured/_endpoint）
 * ② dispatch/probe.js configFingerprint（缓存 key）+ no-config 快速路径 ③ execute.js
 * getDispatchMode hasConfig（派发三态判定）。
 *
 * 优先级：local.yaml mcp 段（mcp.url + mcp.token 两键齐全）>
 *         process.env.SILLYHUB_MCP_URL/TOKEN fallback；
 *         mcp 段缺或任一键缺才回退 env。env 也缺 → 返回 null。
 *
 * 读法参考 src/dispatch/probe.js readProbeTtlFromLocalYaml 的 best-effort 风格：
 * join(cwd,'.sillyspec','local.yaml') → existsSync 守卫 → jsYaml.load(readFileSync) → 取 doc.mcp。
 *
 * 铁律（design R-07）：
 * - best-effort 绝不抛：文件不存在 / jsYaml.load 抛 / doc 非对象 全 try/catch 回退 env
 * - 纯 fs + env 读，绝不发网络（保 probe no-config 快速路径「不发网络」零回归）
 * - 不引新依赖（js-yaml 复用 dispatch/probe.js:17 已引）
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import jsYaml from 'js-yaml';

/**
 * 读 SillyHub MCP 凭据（local.yaml mcp 段 + env fallback，best-effort 不抛不发网络）。
 * @param {string} cwd - 主仓库根（local.yaml 在 <cwd>/.sillyspec/local.yaml）
 * @returns {{url: string, token: string} | null}
 *   凭据齐全 → { url（尾斜杠归一）, token }；local.yaml mcp 段缺/缺键 + env 缺 → null
 */
export function readMcpConfig(cwd) {
  // 1. local.yaml mcp 段优先
  try {
    const p = join(cwd, '.sillyspec', 'local.yaml');
    if (existsSync(p)) {
      const doc = jsYaml.load(readFileSync(p, 'utf8'));
      if (doc && typeof doc === 'object') {
        const mcp = doc.mcp;
        if (mcp && typeof mcp === 'object') {
          const u = typeof mcp.url === 'string' ? mcp.url : '';
          const t = typeof mcp.token === 'string' ? mcp.token : '';
          // 两键齐全才视为有效源（design §7.2「缺键 → 回退 env」）
          if (u && t) {
            return { url: u.replace(/\/+$/, ''), token: t };
          }
        }
      }
    }
  } catch {
    // best-effort：文件读 / js-yaml 解析失败 → 继续回退 env
  }

  // 2. env fallback（兼容旧部署 / 现有测试不设 env 场景，design §9）
  const eu = process.env.SILLYHUB_MCP_URL;
  const et = process.env.SILLYHUB_MCP_TOKEN;
  if (typeof eu === 'string' && eu && typeof et === 'string' && et) {
    return { url: eu.replace(/\/+$/, ''), token: et };
  }

  // 3. local.yaml mcp 段缺/缺键 + env 缺 → null（调用方 _configured=false 降级不发网络）
  return null;
}
