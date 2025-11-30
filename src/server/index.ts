import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, readdirSync, readFileSync } from 'fs';

// Get the current file's directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the Express server type
interface ServerOptions {
  port: number;
  staticDir?: string;
  dataFile?: string;
}

// Define the internal server options to ensure required fields are present
interface InternalServerOptions {
  port: number;
  staticDir: string;
  dataFile: string;
}

export class WebServer {
  private app: express.Application;
  private options: Required<ServerOptions>;

  constructor(options: ServerOptions) {
    this.options = {
      port: options.port || 3000,
      staticDir: options.staticDir || path.resolve(process.cwd(), 'dist', 'static'),
      dataFile: options.dataFile || path.join(__dirname, '../../../analysis-data.json'),
    };

    // 静态文件调试信息
    console.log('🔍 调试信息:');
    console.log('当前工作目录:', process.cwd());
    console.log('静态文件绝对路径:', this.options.staticDir);
    console.log('路径是否存在:', existsSync(this.options.staticDir));

    if (existsSync(this.options.staticDir)) {
      const files = readdirSync(this.options.staticDir);
      console.log('静态目录内容:', files);
    } else {
      console.log('❌ 静态文件目录不存在！');
    }

    this.app = express();

    // Middleware to parse JSON
    this.app.use(express.json());

    // Enable CORS for all routes
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // 静态文件请求日志
    this.app.use('/assets', express.static(path.join(this.options.staticDir, 'assets'), {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      }
    }));
    this.app.use(express.static(this.options.staticDir, {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      }
    }));

    // 路由调试中间件
    this.app.use((req, res, next) => {
      console.log(`📨 请求: ${req.method} ${req.url}`);
      if (req.url.includes('.js') || req.url.includes('.css')) {
        const filePath = path.join(this.options.staticDir, req.url);
        console.log(`📄 请求文件: ${filePath}`);
        console.log(`📄 文件存在: ${existsSync(filePath)}`);
      }
      next();
    });

    // API route to serve analysis data
    this.app.get('/api/analysis-data', async (req: Request, res: Response) => {
      try {
        const data = await fs.readFile(this.options.dataFile, 'utf8');
        res.json(JSON.parse(data));
      } catch (error) {
        console.error('Error reading analysis data:', error);
        res.status(500).json({ error: 'Failed to load analysis data' });
      }
    });

    // 根路由返回正确的index.html
    this.app.get('/', (req, res) => {
      const indexPath = path.join(this.options.staticDir, 'index.html');
      console.log('🏠 服务首页:', indexPath);
      console.log('🏠 首页存在:', existsSync(indexPath));

      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html not found');
      }
    });

    // Catch-all route to serve the Vue app for client-side routing
    this.app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(this.options.staticDir, 'index.html');
      console.log('🏠 服务首页:', indexPath);
      console.log('🏠 首页存在:', existsSync(indexPath));

      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html not found');
      }
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.options.port, () => {
        console.log(`Server running at http://localhost:${this.options.port}`);
        resolve();
      });
    });
  }

  public getExpressApp(): express.Application {
    return this.app;
  }
}