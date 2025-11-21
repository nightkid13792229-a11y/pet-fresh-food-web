import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试多个可能的 .env 文件路径
const possiblePaths = [
  path.resolve(__dirname, '../../.env'),  // 从 env.js 位置向上两级
  path.resolve(process.cwd(), '.env'),     // 从当前工作目录
  path.resolve(__dirname, '../../../.env'), // 备用路径
];

let envPath = null;
for (const possiblePath of possiblePaths) {
  if (existsSync(possiblePath)) {
    envPath = possiblePath;
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath, override: false });
} else {
  // 如果找不到 .env 文件，尝试默认位置（dotenv 会自动查找）
  dotenv.config();
}

export default process.env;
