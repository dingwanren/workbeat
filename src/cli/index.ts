import { Command } from 'commander';
import { analyzeRepository } from '../core/analyzer.js';
import { AuthorMetrics } from '../types/metrics.js';
import { GitReader } from '../core/git-reader.js';
import { CommitData } from '../types/commit.js';
import open from 'open';
import { WebServer, ServerOptions } from '../server/index.js';
import { HtmlReportGenerator } from '../visualizer/html-report-generator.js';

/**
 * 统一的 Git 数据获取逻辑
 */
async function analyzeRepositoryData(
  repoPath: string,
  includeAllBranches: boolean = false,
  parseFileDetails: boolean = false,
  gitArgs?: string,
  logCallback?: (message: string) => void
): Promise<{ commits: CommitData[], metrics: AuthorMetrics[] }> {

  logCallback?.('🚀 开始分析仓库...');
  const gitReader = new GitReader(repoPath, {
    includeAllBranches,
    parseFileDetails
  });

  logCallback?.('📖 正在读取 Git 提交历史...');
  const commits = await gitReader.getCommitLog(0, gitArgs ? parseGitArgs(gitArgs) : undefined);
  logCallback?.(`✅ 获取到 ${commits.length} 条提交记录（已排除合并提交）`);

  logCallback?.('📊 正在分析作者贡献指标...');
  const metrics = await analyzeRepository(commits, logCallback);
  logCallback?.(`✅ 完成 ${metrics.length} 位作者的分析`);

  return { commits, metrics };
}

/**
 * 解析并验证git参数
 * 只允许时间范围相关的参数
 */
function parseGitArgs(gitArgs: string): string[] {
  const allowedArgs = ['--since', '--until', '--after', '--before'];
  const args = gitArgs.trim().split(/\s+/);
  const result: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // 检查是否为允许的参数
    if (allowedArgs.some(allowedArg => arg === allowedArg || arg.startsWith(allowedArg + '='))) {
      if (arg.includes('=')) {
        // 参数和值在同一个字符串中，如 --since=2023-01-01
        result.push(arg);
      } else {
        // 参数和值在不同位置，如 --since 2023-01-01
        result.push(arg);
        // 如果还有下一个参数且不是另一个选项，则它应该是值
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result.push(args[i + 1]);
          i++; // 跳过下一个参数，因为它已被使用
        }
      }
    }
  }

  return result;
}

/**
 * 控制台输出模式 - 优化为简洁输出
 */
function consoleOutputMode(commits: CommitData[], metrics: AuthorMetrics[]) {
  console.log('\n📊 分析结果摘要:');
  console.log('='.repeat(40));

  // 核心统计数据
  console.log(`📈 提交总数: ${commits.length} (已排除合并提交)`);
  console.log(`👥 作者总数: ${metrics.length}`);

  const totalChanges = commits.reduce((sum, commit) =>
    sum + (commit.totalInsertions || 0) + (commit.totalDeletions || 0), 0);
  console.log(`✏️  代码变更: ${totalChanges.toLocaleString()} 行`);
  
  // 时间范围
  if (commits.length > 0) {
    const firstCommit = new Date(commits[commits.length - 1].timestamp);
    const lastCommit = new Date(commits[0].timestamp);
    console.log(`📅 时间范围: ${firstCommit.toLocaleDateString('zh-CN')} - ${lastCommit.toLocaleDateString('zh-CN')}`);
  }
  
  // 顶部作者
  if (metrics.length > 0) {
    console.log('\n🏆 贡献前三:');
    const topAuthors = [...metrics]
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, 3);
    
    topAuthors.forEach((metric, index) => {
      const netChanges = metric.totalInsertions - metric.totalDeletions;
      const changeSign = netChanges >= 0 ? '+' : '';
      console.log(`  ${index + 1}. ${metric.author.name}: ${metric.commitCount} 次提交, ${changeSign}${netChanges.toLocaleString()} 行`);
    });
  }
  
  console.log('\n✨ 分析完成! 使用 --serve 启动可视化界面');
}

/**
 * 创建分析结果对象
 * @param repoPath 仓库路径
 * @param commits 提交数据
 * @param metrics 指标数据
 * @returns 分析结果对象
 */
function createAnalysisResult(
  repoPath: string,
  commits: CommitData[],
  metrics: AuthorMetrics[]
) {
  return {
    repositoryPath: repoPath,
    analysisDate: new Date().toISOString(),
    authorMetrics: metrics,
    commits: commits,
    summary: {
      totalCommits: commits.length,
      totalAuthors: metrics.length,
      totalInsertions: commits.reduce((sum, commit) => sum + (commit.totalInsertions || 0), 0),
      totalDeletions: commits.reduce((sum, commit) => sum + (commit.totalDeletions || 0), 0),
      timeRange: commits.length > 0 ? {
        start: commits[commits.length - 1].timestamp,
        end: commits[0].timestamp
      } : { start: null, end: null }
    }
  };
}

/**
 * Web 可视化模式 - 改为嵌入式数据方案
 */
async function webVisualizationMode(
  repoPath: string,
  commits: CommitData[],
  metrics: AuthorMetrics[],
  port: number
) {
  console.log('🌐 准备启动可视化服务...');

  // 构建分析结果对象
  const analysisResult = createAnalysisResult(repoPath, commits, metrics);

  console.log('✅ 数据准备完成');

  const serverOptions: ServerOptions = {
    port: port,
    analysisData: analysisResult
  };

  const server = new WebServer(serverOptions);

  try {
    await server.start();

    const url = `http://localhost:${port}`;
    console.log(`🌐 服务器已启动: ${url}`);
    console.log('📖 正在打开浏览器...');

    await open(url);
  } catch (error) {
    console.error('❌ 启动服务失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('workbeat')
  .description('分析Git仓库工作节奏')
  .version('1.2.0')
  .argument('<repo-path>', '仓库路径')
  .option('-s, --serve', '启动Web可视化服务')
  .option('-p, --port <number>', 'Web服务端口', '3000')
  .option('-q, --quiet', '安静模式，仅输出必要信息')
  .option('-r, --report [path]', '导出HTML报告到指定路径，如果不指定则默认为当前目录下的workbeat-report.html')
  .option('-a, --all', '包含所有分支的提交记录，默认为false')
  .option('-d, --detail', '解析详细的文件变更信息，默认为false')
  .option('--git-args <args>', '透传给git log的参数（只支持--since, --until, --after, --before）')
  .action(async (repoPath: string, options: {
    serve?: boolean;
    report?: string | boolean;
    port?: string;
    quiet?: boolean;
    all?: boolean;
    detail?: boolean;
    gitArgs?: string;
  }) => {
    try {
      // 检查 --serve 和 --report 是否同时使用
      if (options.serve && options.report !== undefined) {
        console.error('❌ 错误: --serve 和 --report 选项不能同时使用');
        process.exit(1);
      }

      // 获取数据
      const logCallback = options.quiet ? undefined : console.log;
      const { commits, metrics } = await analyzeRepositoryData(
        repoPath,
        options.all || false,
        options.detail || false,
        options.gitArgs,
        logCallback
      );

      // 根据选项决定输出方式
      if (options.report !== undefined) {
        // 导出HTML报告
        const analysisResult = createAnalysisResult(repoPath, commits, metrics);
        const generator = new HtmlReportGenerator();
        const reportPath = typeof options.report === 'string' ? options.report : undefined;
        const outputPath = await generator.generateReport(analysisResult, reportPath);
        console.log(`📄 HTML报告已生成: ${outputPath}`);
      } else if (options.serve) {
        await webVisualizationMode(repoPath, commits, metrics, parseInt(options.port || '3000'));
      } else {
        consoleOutputMode(commits, metrics);
      }
    } catch (error) {
      console.error('❌ 分析失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();