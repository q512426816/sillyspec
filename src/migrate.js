import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';

/**
 * Migrate old .sillyspec/ structure to unified docs/<project>/ structure
 * @param {string} projectDir - Path to the project directory
 */
export function migrateDocs(projectDir) {
  const sillyspecDir = join(projectDir, '.sillyspec');
  if (!existsSync(sillyspecDir)) {
    console.error('❌ .sillyspec/ 目录不存在');
    process.exit(1);
  }

  // Determine project name from projects/*.yaml or directory name
  let projectName = projectDir.split('/').pop();
  const projectsDir = join(sillyspecDir, 'projects');
  if (existsSync(projectsDir)) {
    const yamlFiles = readdirSync(projectsDir).filter(f => f.endsWith('.yaml'));
    if (yamlFiles.length > 0) {
      projectName = yamlFiles[0].replace('.yaml', '');
    }
  }

  console.log(chalk.cyan(`📦 迁移项目: ${projectName}`));
  console.log('');

  const docsBase = join(sillyspecDir, 'docs', projectName);
  let migrated = 0;

  // 1. codebase/ → docs/<project>/scan/
  const codebaseDir = join(sillyspecDir, 'codebase');
  if (existsSync(codebaseDir)) {
    const targetDir = join(docsBase, 'scan');
    mkdirSync(targetDir, { recursive: true });
    const files = readdirSync(codebaseDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const src = join(codebaseDir, file);
      const dest = join(targetDir, file);
      if (!existsSync(dest)) {
        copyFileSync(src, dest);
        console.log(chalk.green('  ✅') + ` scan/${file}`);
        migrated++;
      } else {
        console.log(chalk.yellow('  ⏭️') + ` scan/${file} (已存在)`);
      }
    }
  }

  // 2. specs/ is deprecated — designs live in changes/<变更名>/design.md

  // 3. changes/archive/ → docs/<project>/archive/
  const archiveDir = join(sillyspecDir, 'changes', 'archive');
  if (existsSync(archiveDir)) {
    const targetDir = join(docsBase, 'archive');
    mkdirSync(targetDir, { recursive: true });
    const entries = readdirSync(archiveDir);
    for (const entry of entries) {
      const src = join(archiveDir, entry);
      const dest = join(targetDir, entry);
      if (!existsSync(dest)) {
        copyFileSync(src, dest);
        console.log(chalk.green('  ✅') + ` archive/${entry}`);
        migrated++;
      } else {
        console.log(chalk.yellow('  ⏭️') + ` archive/${entry} (已存在)`);
      }
    }
  }

  // 4. knowledge/ → docs/<project>/archive/ (append knowledge files)
  const knowledgeDir = join(sillyspecDir, 'knowledge');
  if (existsSync(knowledgeDir)) {
    const targetDir = join(docsBase, 'archive');
    mkdirSync(targetDir, { recursive: true });
    const files = readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const src = join(knowledgeDir, file);
      const dest = join(targetDir, `knowledge-${file}`);
      if (!existsSync(dest)) {
        copyFileSync(src, dest);
        console.log(chalk.green('  ✅') + ` archive/knowledge-${file}`);
        migrated++;
      } else {
        console.log(chalk.yellow('  ⏭️') + ` archive/knowledge-${file} (已存在)`);
      }
    }
  }

  // 5. quicklog/ → docs/<project>/quicklog/
  const quicklogDir = join(sillyspecDir, 'quicklog');
  if (existsSync(quicklogDir)) {
    const targetDir = join(docsBase, 'quicklog');
    mkdirSync(targetDir, { recursive: true });
    const files = readdirSync(quicklogDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const src = join(quicklogDir, file);
      const dest = join(targetDir, file);
      if (!existsSync(dest)) {
        copyFileSync(src, dest);
        console.log(chalk.green('  ✅') + ` quicklog/${file}`);
        migrated++;
      } else {
        console.log(chalk.yellow('  ⏭️') + ` quicklog/${file} (已存在)`);
      }
    }
  }

  console.log('');
  if (migrated > 0) {
    console.log(chalk.green(`  ✅ 迁移完成，共迁移 ${migrated} 个文件`));
    console.log(chalk.dim('  旧文件保留在原位，确认无误后可手动删除'));
  } else {
    console.log(chalk.yellow('  没有需要迁移的文件'));
  }
}
