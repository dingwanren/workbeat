import { Command } from 'commander';
import { analyzeRepository } from '../core/analyzer.js';
import { AuthorMetrics } from '../types/metrics.js';
import { GitReader } from '../core/git-reader.js';
import { CommitData } from '../types/commit.js';
import open from 'open';
import { WebServer, ServerOptions } from '../server/index.js';

/**
 * 统一的 Git 数据获取逻辑
 */
async function analyzeRepositoryData(
  repoPath: string, 
  logCallback?: (message: string) => void
): Promise<{ commits: CommitData[], metrics: AuthorMetrics[] }> {
  
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
 * 控制台输出模式 - 优化为简洁输出
 */
function consoleOutputMode(commits: CommitData[], metrics: AuthorMetrics[]) {
  console.log('\n📊 分析结果摘要:');
  console.log('='.repeat(40));
  
  // 核心统计数据
  console.log(`📈 提交总数: ${commits.length}`);
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
  const analysisResult = {
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
  .name('git-rhythm-analyzer')
  .description('分析Git仓库工作节奏')
  .version('1.2.0')
  .argument('<repo-path>', '仓库路径')
  .option('-s, --serve', '启动Web可视化服务')
  .option('-p, --port <number>', 'Web服务端口', '3000')
  .option('-q, --quiet', '安静模式，仅输出必要信息')
  .action(async (repoPath: string, options: { 
    serve?: boolean; 
    port?: string; 
    quiet?: boolean; 
  }) => {
    try {
      // 获取数据
      const logCallback = options.quiet ? undefined : console.log;
      const { commits, metrics } = await analyzeRepositoryData(repoPath, logCallback);
      
      // 根据模式选择输出方式
      if (options.serve) {
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