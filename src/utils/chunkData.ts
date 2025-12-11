/**
 * Utility function to inject chunked data into HTML to prevent oversized script tags
 * Used for large datasets that could exceed 40-50MB when serialized
 * Uses Base64 encoding for safe injection
 */

// Import Buffer explicitly for TypeScript/Node.js compatibility
import { Buffer } from 'buffer';

interface ChunkedInjectionOptions {
  maxChunkSize?: number; // Maximum size of each chunk in bytes (default: 3MB for Base64 efficiency)
}

// Check if data is already injected in HTML
function hasInjectedData(html: string): boolean {
  return html.includes('__GIT_ANALYSIS_DATA__') || html.includes('__GIT_DATA_CHUNKS__');
}

export function injectChunkedData(
  html: string,
  data: any,
  options: ChunkedInjectionOptions = {}
): string {
  // Check if data is already injected to prevent double injection
  if (hasInjectedData(html)) {
    return html; // Data already present, return unchanged
  }

  const { maxChunkSize = 3 * 1024 * 1024 } = options; // 3MB default for Base64 efficiency
  const jsonStr = JSON.stringify(data);
  const chunks = [];

  // Safe splitting: split by characters to avoid breaking UTF-8 sequences
  for (let i = 0; i < jsonStr.length; i += maxChunkSize) {
    chunks.push(jsonStr.slice(i, i + maxChunkSize));
  }

  // Build chunked injection content
  let injected = `
    <script>
      window.__GIT_DATA_CHUNKS__ = [];
      console.log('📦 准备加载 ${chunks.length} 个数据分块...');
    </script>
  `;

  // Safe injection: Base64 encoding to avoid inline JS strings
  chunks.forEach((chunk, i) => {
    const b64Chunk = Buffer.from(chunk, 'utf-8').toString('base64');
    // Properly escape the Base64 string to prevent injection issues
    const safeB64Chunk = b64Chunk
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
    injected += `
      <script>
        (function() {
          try {
            var chunkData = atob("${safeB64Chunk}");
            window.__GIT_DATA_CHUNKS__.push(chunkData);
            console.log('📥 分块 ${i + 1}/${chunks.length} 已解码');
          } catch (e) {
            console.error('❌ 分块 ${i + 1} 解码失败', e);
          }
        })();
      </script>
    `;
  });

  // Finally: concatenate + parse
  injected += `
    <script>
      try {
        console.time('⏱️ 数据解析耗时');
        var fullJson = window.__GIT_DATA_CHUNKS__.join('');
        window.__GIT_ANALYSIS_DATA__ = JSON.parse(fullJson);
        console.timeEnd('⏱️ 数据解析耗时');
        console.log('✅ 数据加载成功！commits:', window.__GIT_ANALYSIS_DATA__.cs?.length);
        delete window.__GIT_DATA_CHUNKS__;
      } catch (e) {
        console.error('❌ 最终解析失败:', e);
      }
    </script>
  `;

  // Only replace the first </head> tag to avoid multiple replacements
  const headCloseIndex = html.indexOf('</head>');
  if (headCloseIndex !== -1) {
    return html.slice(0, headCloseIndex) + injected + html.slice(headCloseIndex);
  } else {
    // Fallback: if no </head> tag exists, return original HTML
    return html;
  }
}