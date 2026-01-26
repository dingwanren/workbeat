import express, { Request, Response, Application } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { shortenFieldNames, compactParentHashesAndTimestamps } from '../utils/shortenFieldNames';
import { injectChunkedData } from '../utils/chunkData';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 服务器选项接口
export interface ServerOptions {
  port: number;
  staticDir?: string;
  analysisData?: any; // 嵌入式数据
}

// 默认服务器选项
interface InternalServerOptions {
  port: number;
  staticDir: string;
  analysisData: any;
}

export class WebServer {
  private app: Application;
  private options: InternalServerOptions;

  constructor(options: ServerOptions) {
    // 确定静态文件目录（优先使用包内静态文件，其次使用当前工作目录）
    const packageStaticDir = path.resolve(__dirname, '..', 'static');
    const staticDir = options.staticDir || 
      (existsSync(packageStaticDir) ? packageStaticDir : path.resolve(process.cwd(), 'dist', 'static'));
    
    // 验证静态文件目录
    if (!existsSync(staticDir)) {
      console.error(`❌ 静态文件目录不存在: ${staticDir}`);
      console.log('💡 请确保已构建前端项目: pnpm run build');
      throw new Error(`静态文件目录不存在: ${staticDir}`);
    }
    
    this.options = {
      port: options.port || 3000,
      staticDir: staticDir,
      analysisData: options.analysisData || null
    };
    
    // 初始化 Express 应用
    this.app = express();
    
    this.initializeServer();
    this.setupRoutesAndMiddleware();
  }
  
  private initializeServer(): void {
    // 验证静态文件目录存在
    if (!existsSync(this.options.staticDir)) {
      throw new Error(`静态文件目录不存在: ${this.options.staticDir}`);
    }
  }
  
private setupRoutesAndMiddleware(): void {

  // ==================== 第一步：设置请求日志中间件 ====================
  this.app.use((req: Request, res: Response, next) => {
    next();
  });

  // ==================== 第二步：设置根路由（注入数据） ====================
  this.app.get('/', (req: Request, res: Response): void => {
    this.serveIndexWithData(res);
  });

  // ==================== 第三步：设置静态文件中间件 ====================
  const staticOptions = {
    etag: false,
    lastModified: false,
    setHeaders: (res: Response) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  };

  // 静态文件服务（处理 /assets/ 等静态资源）
  // 注意：这会在路由之后执行，所以不会拦截根路由
  this.app.use(express.static(this.options.staticDir, staticOptions));

  // ==================== 第四步：设置智能客户端路由回退 ====================
  this.app.get('*', (req: Request, res: Response, next): void => {
    const url = req.path;

    // 跳过有扩展名的请求（这些应该由静态文件中间件处理）
    if (url.match(/\.\w+$/)) {
      return next(); // 让静态文件中间件处理
    }

    // 跳过已处理的路由
    if (url === '/') {
      return next();
    }

    this.serveIndexWithData(res);
  });
}
  
  /**
   * 辅助方法：注入数据并返回 index.html
   */
  private serveIndexWithData(res: Response): void {
    const indexPath = path.join(this.options.staticDir, 'index.html');

    if (!existsSync(indexPath)) {
      res.status(404).send('index.html not found');
      return;
    }

    try {
      // 读取 HTML 文件
      let html = readFileSync(indexPath, 'utf-8');

      // 检查是否已有数据注入
      const hasInjectedData = html.includes('__GIT_ANALYSIS_DATA__');

      // 注入嵌入式数据
      if (this.options.analysisData && !hasInjectedData) {
        // 使用缩短的字段名并转换时间戳和哈希值
        const compacted = this.shortenFieldNames(this.options.analysisData);
        const finalData = this.compactParentHashesAndTimestamps(compacted);

        // 使用分块注入以处理大型数据集
        html = injectChunkedData(html, finalData, { maxChunkSize: 4 * 1024 * 1024 }); // 4MB/块
      }

      // 发送响应
      res.setHeader('Content-Type', 'text/html');
      res.send(html);

    } catch (error) {
      console.log(error)
      res.status(500).send('服务器内部错误');
    }
  }
  
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.options.port, () => {
        console.log(`\n✅ 服务器启动成功: http://localhost:${this.options.port}`);
        console.log('💡 按 Ctrl+C 停止服务器\n');
        resolve();
      });
      
      server.on('error', (error) => {
        console.error('❌ 服务器启动失败:', error);
        reject(error);
      });
    });
  }
  
  public getExpressApp(): Application {
    return this.app;
  }

  /**
   * Helper method to shorten field names
   */
  private shortenFieldNames(data: any) {
    return shortenFieldNames(data);
  }

  /**
   * Helper method to compact parent hashes and timestamps
   */
  private compactParentHashesAndTimestamps(data: any) {
    return compactParentHashesAndTimestamps(data);
  }
}