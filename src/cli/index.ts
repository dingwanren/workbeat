import { Command } from 'commander';
import { analyzeRepository } from '../core/analyzer.js';
import { AuthorMetrics } from '../types/metrics.js';
import { GitReader } from '../core/git-reader.js';
import { CommitData } from '../types/commit.js';
import { DataExporter } from '../visualizer/data-exporter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import { WebServer } from '../server/index.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 统一的 Git 数据获取逻辑
 */
async function analyzeRepositoryData(repoPath: string, logCallback?: (message: string) => void): Promise<{ commits: CommitData[], metrics: AuthorMetrics[] }> {
  logCallback?.('🚀 开始分析仓库...');

  const gitReader = new GitReader(repoPath);

  logCallback?.('📖 正在读取 Git 提交历史...');
  const commits = await gitReader.getCommitLog();
  logCallback?.(`✅ 获取到 ${commits.length} 条提交记录`);

  logCallback?.('📊 正在分析作者贡献指标...');
  const metrics = await analyzeRepository(commits, logCallback);
  logCallback?.(`✅ 完成 ${metrics.length} 位作者的分析`);

  return { commits, metrics };
}

/**
 * 控制台输出模式
 */
async function consoleOutputMode(repoPath: string, commits: CommitData[], metrics: AuthorMetrics[], quiet: boolean = false) {
  if (!quiet) {
    console.log('\n🏆 仓库分析结果:');
    console.log('===============================');
  }

  // 核心统计数据
  console.log(`\n📈 核心统计:`);
  console.log(`  提交总数: ${commits.length}`);
  console.log(`  作者总数: ${metrics.length}`);
  console.log(`  文件变更总数: ${commits.reduce((sum, commit) => sum + commit.fileChanges.length, 0)}`);

  // 作者排行榜
  if (metrics.length > 0) {
    console.log(`\n👥 作者贡献排行榜:`);
    const sortedMetrics = [...metrics].sort((a, b) => b.commitCount - a.commitCount);

    sortedMetrics.slice(0, 5).forEach((metric, index) => {
      console.log(`  ${index + 1}. ${metric.author.name} (${metric.commitCount} 次提交, +${metric.totalInsertions}/-${Math.abs(metric.totalDeletions)} 行)`);
    });

    if (metrics.length > 5) {
      console.log(`  ... 还有 ${metrics.length - 5} 位作者`);
    }
  }

  // 最近提交摘要
  if (commits.length > 0) {
    console.log(`\n🆕 最近提交摘要:`);
    const recentCommits = commits.slice(-5).reverse(); // 最近5条，倒序显示（最新在前）

    recentCommits.forEach(commit => {
      const shortHash = commit.hash.substring(0, 8);
      const commitDate = new Date(commit.timestamp).toLocaleDateString('zh-CN');
      console.log(`  ${shortHash} - ${commit.author.name}: ${commit.message.substring(0, 50)}${commit.message.length > 50 ? '...' : ''} (${commitDate})`);
    });
  }

  if (!quiet) {
    console.log('\n✨ 分析完成!');
  }
}

/**
 * Web 可视化模式
 */
async function webVisualizationMode(repoPath: string, commits: CommitData[], metrics: AuthorMetrics[], port: number, outputPath: string) {
  console.log('🌐 启动 Web 可视化服务...');
  console.log('📖 正在导出分析数据...');

  const dataFilePath = path.join(process.cwd(), outputPath);
  const exporter = new DataExporter(repoPath, metrics, commits);
  await exporter.exportToFile(dataFilePath);

  console.log('✅ 数据导出完成');
  console.log(`🌐 启动服务器 (端口: ${port})...`);

  const server = new WebServer({
    port: port,
    dataFile: dataFilePath
  });

  await server.start();

  const url = `http://localhost:${port}`;
  console.log(`🌐 服务器启动成功: ${url}`);
  console.log('📖 打开浏览器...');

  try {
    await open(url);
    console.log('✅ 浏览器已自动打开');
  } catch (err) {
    console.log(`⚠️  自动打开浏览器失败，请手动访问: ${url}`);
  }
}

const program = new Command();

program
  .name('git-rhythm-analyzer')
  .description('分析Git仓库工作节奏')
  .version('1.1.0')
  .argument('<repo-path>', '仓库路径')
  .option('-s, --serve', '启动Web可视化服务')
  .option('-p, --port <number>', 'Web服务端口', '3000')
  .option('-o, --output <path>', '输出JSON文件路径', 'analysis-data.json')
  .option('-q, --quiet', '安静模式，减少控制台输出')
  .action(async (repoPath: string, options: { serve?: boolean; port?: string; output?: string; quiet?: boolean }) => {
    try {
      // 获取数据（统一逻辑）
      const logCallback = options.quiet ? undefined : console.log;
      const { commits, metrics } = await analyzeRepositoryData(repoPath, logCallback);

      // 根据模式选择输出方式
      if (options.serve) {
        await webVisualizationMode(repoPath, commits, metrics, parseInt(options.port || '3000'), options.output || 'analysis-data.json');
      } else {
        await consoleOutputMode(repoPath, commits, metrics, options.quiet);
      }
    } catch (error) {
      console.error('❌ 分析仓库时发生错误:', error);
      process.exit(1);
    }
  });

program.parse();