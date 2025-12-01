import { Command } from 'commander';
import { analyzeRepository } from '../core/analyzer.js';
import { AuthorMetrics } from '../types/metrics.js';
import { GitReader } from '../core/git-reader.js';
import { DataExporter } from '../visualizer/data-exporter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import open from 'open';
import { WebServer } from '../server/index.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('git-rhythm-analyzer')
  .description('分析Git仓库工作节奏')
  .version('1.0.0')
  .argument('<repo-path>', '仓库路径')
  .option('-s, --serve', '启动Web可视化服务')
  .option('-p, --port <number>', 'Web服务端口', '3000')
  .option('-o, --output <path>', '输出JSON文件路径', 'analysis-result.json')
  .action(async (repoPath: string, options: { serve?: boolean; port?: string; output?: string }) => {
    if (options.serve) {
      // 分析仓库数据
      console.log(`正在分析仓库: ${repoPath}`);

      try {
        // 获取完整提交记录用于分析
        const gitReader = new GitReader(repoPath);
        const commits = await gitReader.getCommitLog(1000); // 获取更多提交数据

        // 获取作者指标
        const metrics = await analyzeRepository(repoPath);

        console.log('数据分析完成，正在导出数据...');

        // 导出分析结果为JSON文件 (use a standard name for the web API)
        const dataFilePath = path.join(process.cwd(), 'analysis-data.json');
        const exporter = new DataExporter(repoPath, metrics, commits);
        await exporter.exportToFile(dataFilePath);

        console.log('准备启动可视化服务器...');
        console.log('当前工作目录:', process.cwd());
        console.log('启动Express服务器...');

        // 启动Express服务器
        const server = new WebServer({
          port: parseInt(options.port || '3000'),
          dataFile: dataFilePath  // dataFilePath 已经是基于当前工作目录的完整路径
        });

        // Start the server and then open the browser
        await server.start();

        const url = `http://localhost:${options.port || '3000'}`;
        console.log(`正在打开浏览器访问: ${url}`);
        try {
          await open(url);
        } catch (err) {
          console.log(`自动打开浏览器失败，请手动访问: ${url}`);
        }

      } catch (error) {
        console.error('分析仓库时发生错误:', error);
        process.exit(1);
      }
    } else {
      // 控制台输出模式
      console.log(`开始分析仓库: ${repoPath}`);

      try {
        const metrics = await analyzeRepository(repoPath);

        console.log(`\n仓库分析完成！`);
        console.log(`作者数量: ${metrics.length}`);

        // 显示作者指标表格
        if (metrics.length > 0) {
          console.log(`\n作者基础指标:`);
          console.log('----------------------------------------');

          // 表头
          console.log(
            '作者'.padEnd(20) +
            '提交数'.padEnd(10) +
            '新增行'.padEnd(12) +
            '删除行'.padEnd(12) +
            '净变更'.padEnd(12) +
            '首次提交'.padEnd(20) +
            '最后提交'
          );
          console.log('----------------------------------------');

          // 显示每个作者的指标
          metrics.forEach((metric: AuthorMetrics) => {
            const authorName = `${metric.author.name.substring(0, 18)}`;
            const firstCommitDate = metric.firstCommitDate.toISOString().substring(0, 19).replace('T', ' ');
            const lastCommitDate = metric.lastCommitDate.toISOString().substring(0, 19).replace('T', ' ');

            console.log(
              authorName.padEnd(20) +
              metric.commitCount.toString().padEnd(10) +
              metric.totalInsertions.toString().padEnd(12) +
              metric.totalDeletions.toString().padEnd(12) +
              metric.netChanges.toString().padEnd(12) +
              firstCommitDate.padEnd(20) +
              lastCommitDate
            );
          });
        } else {
          console.log('该仓库没有找到任何提交记录');
        }
      } catch (error) {
        console.error('分析仓库时发生错误:', error);
        process.exit(1);
      }
    }
  });

program.parse();