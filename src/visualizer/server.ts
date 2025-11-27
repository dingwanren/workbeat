/**
 * Web可视化服务
 * 使用Express和EJS提供Git分析数据的可视化界面
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitReader } from '../core/git-reader.js';
import { analyzeRepository } from '../core/analyzer.js';
import { generateChartData } from './chart-data.js';
import { CommitData } from '../types/commit.js';
import { AuthorMetrics } from '../types/metrics.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VisualizationServer {
  private app: express.Application;
  private port: number;
  private repoPath: string;
  private metrics: AuthorMetrics[];
  private commits: CommitData[];
  private chartData: any;
  private dataReady: boolean;

  constructor(port: number = 3000, repoPath: string, metrics: AuthorMetrics[]) {
    this.app = express();
    this.port = port;
    this.repoPath = repoPath;
    this.metrics = metrics;
    this.commits = []; // 初始化为空数组
    this.chartData = {}; // 初始化为空对象
    this.dataReady = false; // 标记数据是否已准备就绪

    // 设置EJS模板引擎
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../../templates'));

    // 静态文件服务
    this.app.use('/static', express.static('static'));
    this.app.use('/public', express.static('public'));

    // 路由设置
    this.setupRoutes();
  }

  /**
   * 异步初始化数据
   */
  public async initializeData(): Promise<void> {
    try {
      // 初始化提交数据
      const gitReader = new GitReader(this.repoPath);
      this.commits = await gitReader.getCommitLog(1000); // 获取更多提交日志用于趋势分析

      // 生成图表数据
      this.chartData = generateChartData(this.metrics, this.commits);

      // 调试日志 - 输出关键数据信息
      console.log(`数据初始化完成`);
      console.log(`作者数量: ${this.metrics.length}`);
      console.log(`提交数量: ${this.commits.length}`);
      console.log(`图表数据 - 作者名: ${JSON.stringify(this.chartData.authorNames)}`);
      console.log(`图表数据 - 提交计数: ${JSON.stringify(this.chartData.commitCounts)}`);
      console.log(`图表数据 - 日期: ${JSON.stringify(this.chartData.dates)}`);
      console.log(`图表数据 - 趋势提交: ${JSON.stringify(this.chartData.commitTrends)}`);

      // 标记数据已准备就绪
      this.dataReady = true;
    } catch (error) {
      console.error('初始化数据时发生错误:', error);
      throw error;
    }
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 主仪表板页面 - 现在使用预加载的数据
    this.app.get('/', (req: Request, res: Response) => {
      if (this.dataReady) {
        try {
          res.render('dashboard', {
            metrics: this.metrics,
            chartData: this.chartData,
            repoPath: this.repoPath
          });
        } catch (error) {
          console.error('渲染页面时发生错误:', error);
          res.status(500).render('dashboard', {
            metrics: [],
            chartData: {},
            repoPath: this.repoPath,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      } else {
        // 如果数据还未准备好，返回加载页面或等待
        res.render('dashboard', {
          metrics: [],
          chartData: {},
          repoPath: this.repoPath,
          loading: true,
          message: '正在加载数据，请稍候...'
        });
      }
    });

    // API端点，用于获取最新数据 - 现在返回预加载的数据
    this.app.get('/api/data', (req: Request, res: Response) => {
      if (this.dataReady) {
        try {
          res.json({
            metrics: this.metrics,
            chartData: this.chartData,
            repoPath: this.repoPath
          });
        } catch (error) {
          console.error('获取数据时发生错误:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      } else {
        res.status(500).json({
          error: '数据尚未准备就绪'
        });
      }
    });
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    try {
      // 首先初始化数据
      await this.initializeData();

      // 然后启动服务器
      this.app.listen(this.port, () => {
        console.log(`可视化服务已启动，访问地址: http://localhost:${this.port}`);
      });
    } catch (error) {
      console.error('启动服务器时发生错误:', error);
      throw error;
    }
  }

  /**
   * 获取服务器端口
   */
  public getPort(): number {
    return this.port;
  }
}