import { Command } from 'commander';
import { analyzeRepository } from '../core/analyzer.js';
import { AuthorMetrics } from '../types/metrics.js';
import { VisualizationServer } from '../visualizer/server.js';
import open from 'open';

const program = new Command();

program
  .name('git-rhythm-analyzer')
  .description('分析Git仓库工作节奏')
  .version('1.0.0')
  .argument('<repo-path>', '仓库路径')
  .option('-s, --serve', '启动Web可视化服务')
  .option('-p, --port <number>', 'Web服务端口', '3000')
  .action(async (repoPath: string, options: { serve?: boolean; port?: string }) => {
    if (options.serve) {
      // 分析仓库数据
      console.log(`正在分析仓库: ${repoPath}`);

      try {
        const metrics = await analyzeRepository(repoPath);
        console.log('数据分析完成，启动可视化服务...');

        // 启动Web可视化服务并传入数据
        const port = parseInt(options.port || '3000');
        const server = new VisualizationServer(port, repoPath, metrics);
        // 启动服务器并等待其准备就绪
        await server.start();

        const url = `http://localhost:${port}`;
        console.log(`服务器已启动，访问地址: ${url}`);
        console.log('正在打开浏览器...');
        open(url).catch((err: Error) => {
          console.log(`自动打开浏览器失败，请手动访问: ${url}`);
        });

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