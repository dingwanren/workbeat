import { Command } from 'commander';
import { analyzeRepository } from '../core/analyzer.js';

const program = new Command();

program
  .name('git-rhythm-analyzer')
  .description('分析Git仓库工作节奏')
  .version('1.0.0')
  .argument('<repo-path>', '仓库路径')
  .action(async (repoPath: string) => {
    console.log(`开始分析仓库: ${repoPath}`);
    await analyzeRepository(repoPath);
  });

program.parse();