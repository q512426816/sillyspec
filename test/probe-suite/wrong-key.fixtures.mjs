/**
 * 错键探针套件 fixtures（task-04，2026-09-21-r5-efficiency-batch1 / FR-04 / D-002@v1）。
 *
 * 锚定 R4 对撞实验「错键生产 no-op、测试全绿掩护」硬缺陷的三类真实错键形态，每类配
 * 正确对照组——敏感性有方向：错键判不匹配 / 正确键判匹配，防「什么都不匹配」的假绿。
 * 纯字符串素材零 IO；wrong-key.test.mjs 按 src/verify-probes.js 既有键原语的真实
 * 输入输出契约喂给：
 *   - extractPayloadKeys（src/verify-probes.js:186）：请求调用行后 8 行窗口对象键 → Set<原键>；
 *   - extractFrontendPayloadFields（src/verify-probes.js:521）：文件路径+全文 → 归一
 *     （snake→lowerCamel）字段数组 + fieldLines + urlsByCall；
 *   - isSegmentSuffix（src/verify-probes.js:497）：前端归一 URL × 后端完整 path →
 *     段边界后缀布尔判定。
 *
 * 契约键（contractKeys / backendPath）模拟对撞故事里「另一侧」的实际形态：后端契约/
 * 响应侧原键不经前端归一化直接进比对（comparePayloadFields 的 beFields 原样消费，
 * src/verify-probes.js:866——前端归一仅 camel 向，snake 原键不被吸收，正是漂移可判的机制）。
 */

/** 形态①：键名单复数错配——载荷嵌套 data 下送 tokens（复数），契约键为 token（单数） */
export const PLURAL_MISMATCH = {
  id: 'plural-mismatch',
  story: '键名单复数错配：送 data.tokens，契约键为 data.token（错键上送即 no-op）',
  primitive: 'extractPayloadKeys',
  wrong: {
    // 载荷送复数 tokens；值用字面量（原语键值首字符契约：引号/数字/{/[tfn-/null/undefined）
    source: [
      '// R4 形态①：嵌套 data 下送 tokens（复数），契约键为 token（单数）',
      'export function bindDevice() {',
      '  return fetch(\'/v1/auth/bind\', {',
      '    method: \'POST\',',
      '    body: {',
      '      data: {',
      '        tokens: \'tok-abc123\',',
      '      },',
      '    },',
      '  })',
      '}',
    ].join('\n'),
    contractKeys: ['token'],
  },
  correct: {
    // 对照组：同一契约键，载荷送单数 token——判匹配
    source: [
      '// 对照：嵌套 data 下送 token（单数），与契约键一致',
      'export function bindDevice() {',
      '  return fetch(\'/v1/auth/bind\', {',
      '    method: \'POST\',',
      '    body: {',
      '      data: {',
      '        token: \'tok-abc123\',',
      '      },',
      '    },',
      '  })',
      '}',
    ].join('\n'),
    contractKeys: ['token'],
  },
}

/** 形态②：前后端 payload 键漂移——请求送 { userId }，端点契约/响应侧键为 user_id */
export const PAYLOAD_KEY_DRIFT = {
  id: 'payload-key-drift',
  story: '前后端 payload 键漂移：请求送 { userId }，契约/响应侧键为 user_id（线格式不兼容 → 静默丢弃 no-op）',
  primitive: 'extractFrontendPayloadFields',
  filePath: 'src/services/session.js',
  wrong: {
    // R4 原形：请求 DTO 起始键 userId（camel 上送）；DTO 族只收 { 与键同行的起始键
    source: [
      '// R4 形态②：请求送 { userId }，端点契约键为 user_id——错键漂移',
      'export function createSession(form) {',
      '  return post(\'/api/sessions/create\', { userId: form.uid, trace: \'on\' })',
      '}',
    ].join('\n'),
    contractKeys: ['user_id'], // 契约侧原键（snake，进比对不归一）
  },
  correct: {
    // 对照组：与 wrong 同一份前端源，只把契约变量换成拼写一致的 userId——判匹配。
    // （对照组只动契约键：漂移形态本身就是「两侧拼写错开」，固定契约 user_id 时
    // 任何前端拼写归一后都不命中、无绿面——故绿面在契约拼写一致侧构造。）
    source: [
      '// 对照：请求送 { userId }，契约键同为 userId——拼写一致判匹配',
      'export function createSession(form) {',
      '  return post(\'/api/sessions/create\', { userId: form.uid, trace: \'on\' })',
      '}',
    ].join('\n'),
    contractKeys: ['userId'],
  },
  bridge: {
    // 桥形对照：前端 snake 构造（payload.user_id）经 snake→camel 归一命中驼峰契约——
    // 约定配对不误报（归一化的设计意图：JS snake ↔ Java camel 惯例桥接）
    source: [
      '// 桥形对照：payload.user_id 归一 camel 后命中驼峰契约',
      'export function createSession(form) {',
      '  const payload = {}',
      '  payload.user_id = form.uid',
      '  return post(\'/api/sessions/create\', payload)',
      '}',
    ].join('\n'),
    contractKeys: ['userId'],
  },
}

/** 形态③：路径段后缀错配——前端调 /sessions/:id/turn，后端端点为 /sessions/:id/turns */
export const PATH_SEGMENT_SUFFIX_MISMATCH = {
  id: 'path-segment-suffix-mismatch',
  story: '路径段后缀错配：前端调 /sessions/:id/turn，后端端点为 /sessions/:id/turns（缺尾 s → 打错端点 no-op）',
  primitive: 'isSegmentSuffix',
  wrong: {
    frontendUrl: '/sessions/:id/turn',
    backendPath: '/v1/sessions/:id/turns',
    // 真实接线形态：请求调用首参 URL → urlsByCall 归一 → isSegmentSuffix（端点关联同消费）
    wiringFilePath: 'src/services/session-turn.js',
    wiringSource: [
      '// R4 形态③：URL 段后缀缺尾 s，打不到后端 turns 端点',
      'export function endTurn(sessionId) {',
      '  return fetch(\'/api/sessions/42/turn\', { method: \'POST\' })',
      '}',
    ].join('\n'),
    wiringBackendPath: '/v1/sessions/42/turns',
  },
  correct: {
    frontendUrl: '/sessions/:id/turns',
    backendPath: '/v1/sessions/:id/turns',
    wiringFilePath: 'src/services/session-turn.js',
    wiringSource: [
      '// 对照：URL 段后缀完整对齐后端端点',
      'export function endTurn(sessionId) {',
      '  return fetch(\'/api/sessions/42/turns\', { method: \'POST\' })',
      '}',
    ].join('\n'),
    wiringBackendPath: '/v1/sessions/42/turns',
  },
}

/** 三类形态合集（R5 验收硬门重放入口） */
export const WRONG_KEY_SHAPES = [PLURAL_MISMATCH, PAYLOAD_KEY_DRIFT, PATH_SEGMENT_SUFFIX_MISMATCH]
