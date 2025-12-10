import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { shortenFieldNames, compactParentHashesAndTimestamps } from '../utils/shortenFieldNames';

/**
 * HtmlReportGenerator类负责生成独立的HTML报告文件
 * 将分析数据、CSS和JS内联到一个单独的HTML文件中
 */
export class HtmlReportGenerator {
  private static readonly DIST_STATIC_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../dist/static'
  );

  /**
   * 生成独立的HTML报告文件
   * @param analysisData - 分析数据
   * @param outputPath - 输出文件路径，默认为当前目录下的 workbeat-report.html
   */
  async generateReport(analysisData: any, outputPath?: string): Promise<string> {
    // 确定输出路径
    const outputFilePath = outputPath || path.join(process.cwd(), 'workbeat-report.html');

    // 读取基础HTML模板
    const templatePath = path.join(HtmlReportGenerator.DIST_STATIC_PATH, 'index.html');
    let htmlContent = await fs.readFile(templatePath, 'utf-8');

    // 注入分析数据到HTML中
    htmlContent = this.inlineData(htmlContent, analysisData);

    // 内联CSS
    htmlContent = await this.inlineStyles(htmlContent);

    // 内联JavaScript
    htmlContent = await this.inlineScripts(htmlContent);

    // 清理可能的外部资源引用
    htmlContent = this.cleanupExternalResources(htmlContent);

    // 写入最终的HTML文件
    await fs.writeFile(outputFilePath, htmlContent, 'utf-8');

    return outputFilePath;
  }

  /**
   * 将分析数据内联到HTML中
   * @param htmlContent - HTML内容
   * @param analysisData - 分析数据
   * @returns 更新后的HTML内容
   */
  private inlineData(htmlContent: string, analysisData: any): string {
    // 使用缩短的字段名并转换时间戳和哈希值 (优化大数据量)
    const compacted = shortenFieldNames(analysisData);
    const finalData = compactParentHashesAndTimestamps(compacted);

    // 使用 JSON.stringify 并处理特殊字符以避免 XSS
    const jsonString = JSON.stringify(finalData, null, 2)
      .replace(/</g, '\\u003c')  // Prevent script tag injection
      .replace(/>/g, '\\u003e')  // Prevent script tag injection
      .replace(/&/g, '\\u0026'); // Prevent other injection issues

    const dataScript = `<script>
      // Git 仓库分析数据 - 嵌入式注入 (已压缩字段名和数据)
      window.__GIT_ANALYSIS_DATA__ = ${jsonString};
    </script>`;

    // 将数据注入到 <head> 标签中
    return htmlContent.replace(/(<head>)/i, `$1\n    ${dataScript}`);
  }

  /**
   * 内联CSS文件内容
   * @param htmlContent - HTML内容
   * @returns 更新后的HTML内容
   */
  private async inlineStyles(htmlContent: string): Promise<string> {
    // 匹配 <link> 标签引用的CSS文件
    const cssLinkRegex = /<link[^>]*href=["']([^"']*(?:\.css))["'][^>]*>/gi;

    let match;
    while ((match = cssLinkRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const cssPath = match[1];

      // 解析CSS文件路径
      const absCssPath = path.join(HtmlReportGenerator.DIST_STATIC_PATH, cssPath);
      const cssContent = await fs.readFile(absCssPath, 'utf-8');

      // 创建内联样式标签替换 <link> 标签
      const inlineStyle = `<style>\n${cssContent}\n</style>`;
      htmlContent = htmlContent.replace(fullMatch, inlineStyle);
    }

    return htmlContent;
  }

  /**
   * 内联JavaScript文件内容
   * @param htmlContent - HTML内容
   * @returns 更新后的HTML内容
   */
  private async inlineScripts(htmlContent: string): Promise<string> {
    // 匹配 <script type="module" src="..."> 标签
    const scriptRegex = /<script[^>]*type=["']module["'][^>]*src=["']([^"']*(?:\.js))["'][^>]*><\/script>/gi;

    let scriptTags: string[] = [];
    let match;

    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const scriptPath = match[1];

      // 解析JS文件路径
      const absScriptPath = path.join(HtmlReportGenerator.DIST_STATIC_PATH, scriptPath);
      let scriptContent = await fs.readFile(absScriptPath, 'utf-8');

      // For ES modules, we need to convert them to work in a non-module context
      // Replace dynamic imports and module-specific syntax that might cause circular references
      let processedScriptContent = scriptContent
        .replace(/import\.meta\.url/g, 'window.location.href')
        // Comment out import statements
        .replace(/\bimport\s+/g, '// import ')
        // Comment out export default statements
        .replace(/\bexport\s+default\s+/g, '/* export default */ ')
        // Comment out export statements with curly braces
        .replace(/\bexport\s+{([^}]*)}/g, '/* export { $1 } */ ')
        // Comment out export declarations (export const, export let, export var)
        .replace(/\bexport\s+(let|var|const)\b/g, '/* export */ $1 ')
        // Add window global if needed by the app
        .replace(/process\.env/g, '{}'); // Replace process.env references

      // Wrap in IIFE to avoid module system conflicts and ensure proper initialization
      // Also add a check to ensure DOM is ready before initializing the app
      const wrappedScript = `(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      try {
${processedScriptContent}
      } catch(e) {
        console.error('Error in inlined script:', e);
      }
    });
  } else {
    try {
${processedScriptContent}
    } catch(e) {
      console.error('Error in inlined script:', e);
    }
  }
})();`;

      scriptTags.push(`<script>\n${wrappedScript}\n</script>`);

      // Remove original <script> tag from HTML
      htmlContent = htmlContent.replace(fullMatch, '');
    }

    // Insert all script contents before the </body> tag
    const bodyCloseTag = '</body>';
    if (htmlContent.includes(bodyCloseTag)) {
      htmlContent = htmlContent.replace(
        bodyCloseTag,
        `\n    ${scriptTags.join('\n    ')}\n  ${bodyCloseTag}`
      );
    } else {
      // If no body tag, add to end of document
      htmlContent += `\n${scriptTags.join('\n')}`;
    }

    return htmlContent;
  }

  /**
   * 清理可能的外部资源引用
   * @param htmlContent - HTML内容
   * @returns 清理后的HTML内容
   */
  private cleanupExternalResources(htmlContent: string): string {
    // 移除或注释掉可能的CDN链接
    // 例如：移除Google Fonts等外部CSS
    const externalResourceRegex = /<link[^>]*href=["']https?:\/\/[^"']*["'][^>]*>/gi;

    htmlContent = htmlContent.replace(externalResourceRegex,
      (match) => `<!-- External resource removed: ${match} -->`);

    // 移除外部脚本引用
    const externalScriptRegex = /<script[^>]*src=["']https?:\/\/[^"']*["'][^>]*><\/script>/gi;

    htmlContent = htmlContent.replace(externalScriptRegex,
      (match) => `<!-- External script removed: ${match} -->`);

    return htmlContent;
  }
}