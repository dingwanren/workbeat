import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

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
      staticDir: options.staticDir || path.join(__dirname, '../../../dist/static'),
      dataFile: options.dataFile || path.join(__dirname, '../../../analysis-data.json'),
    };

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

    // Serve static files from the specified directory
    this.app.use(express.static(this.options.staticDir));

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

    // Catch-all route to serve the Vue app for client-side routing
    this.app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(this.options.staticDir, 'index.html'));
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