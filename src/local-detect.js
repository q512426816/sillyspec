/**
 * Local Detect — 纯 fs 项目类型嗅探
 *
 * 把"生成本地配置"里的项目类型判定从 scan（半小时 + 大量 token）抽出来，
 * 变成纯 fs 同步读几秒可完成的独立探测。create/gate 只需 project.type +
 * commands，不该被迫跑完整 scan。
 *
 * 纯函数：不 spawn 任何子进程、不调用任何 AI/LLM、不消耗 token。
 * 不写 local.yaml 到磁盘——只返回数据结构，落盘由调用方（CLI 路由 / scan.js）负责。
 * 不引 yaml 依赖。
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * 从 Makefile 文本提取 test 目标的命令（轻量正则，与 verify-postcheck 同风格）。
 * 支持两种常见写法：
 *   - 同行命令：`test: pytest`            → 'pytest'
 *   - tab 续行：`test:\n\tpytest\n`        → 'pytest'（命令在下一 tab 开头行）
 * 边界：
 *   - 纯空目标（`test:` 无同行命令、无 tab 续行）→ 回退 'make test'
 *   - 命令行内 `#` 注释截断；取第一个非空命令行
 * @param {string} makefileText
 * @returns {string}
 */
function parseMakefileTestCommand(makefileText) {
  if (!makefileText) return 'make test'
  // 定位 `test:` 行；捕获 `:` 后同行内容（同行命令或空）
  const head = makefileText.match(/^test:\s*([^\n#]*?)\s*(?:#.*)?$/m)
  if (!head) return 'make test'
  const inline = (head[1] || '').trim()
  if (inline) return inline
  // 同行为空 → 找该行之后第一个 tab 续行命令（`\tcmd` 或 `    cmd`）
  const after = makefileText.slice(head.index + head[0].length)
  const cont = after.match(/^[ \t]+([^\n#]+?)\s*(?:#.*)?$/m)
  if (cont && cont[1]) return cont[1].trim()
  return 'make test'
}

/**
 * 嗅探 workdir 的项目类型与默认 commands（纯 fs，零 AI / 零 token）。
 *
 * 嗅探规则（按顺序，命中即返回）：
 *   - package.json → nodejs（npm run build / npm test / npm run lint）
 *   - pom.xml → maven（mvn compile / mvn test / mvn checkstyle:check）
 *   - build.gradle → gradle（./gradlew build / test / check）
 *   - Makefile → make（test 命令从 test: 目标解析；build/lint 无则不写）
 *   - 都没有 → generic（commands 为空对象）
 *
 * @param {string} workdir - 项目根目录
 * @returns {{
 *   project: { type: 'nodejs'|'maven'|'gradle'|'make'|'generic' },
 *   commands: { build?: string, test?: string, lint?: string }
 * }}
 */
export function detectLocalYaml(workdir) {
  // 1. nodejs
  if (existsSync(join(workdir, 'package.json'))) {
    return {
      project: { type: 'nodejs' },
      commands: {
        build: 'npm run build',
        test: 'npm test',
        lint: 'npm run lint',
      },
    }
  }

  // 2. maven
  if (existsSync(join(workdir, 'pom.xml'))) {
    return {
      project: { type: 'maven' },
      commands: {
        build: 'mvn compile',
        test: 'mvn test',
        lint: 'mvn checkstyle:check',
      },
    }
  }

  // 3. gradle
  if (existsSync(join(workdir, 'build.gradle'))) {
    return {
      project: { type: 'gradle' },
      commands: {
        build: './gradlew build',
        test: './gradlew test',
        lint: './gradlew check',
      },
    }
  }

  // 4. make（test 命令从 Makefile 解析；build/lint 无则省略）
  const makefilePath = join(workdir, 'Makefile')
  if (existsSync(makefilePath)) {
    const makefileText = readFileSync(makefilePath, 'utf8')
    const test = parseMakefileTestCommand(makefileText)
    return {
      project: { type: 'make' },
      commands: { test },
    }
  }

  // 5. generic
  return {
    project: { type: 'generic' },
    commands: {},
  }
}
