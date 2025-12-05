import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 上传目录配置
const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');
const RECIPE_COVERS_DIR = path.join(UPLOAD_BASE_DIR, 'recipe-covers');

// 确保上传目录存在
const ensureUploadDirs = () => {
  if (!fs.existsSync(UPLOAD_BASE_DIR)) {
    fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
  }
  if (!fs.existsSync(RECIPE_COVERS_DIR)) {
    fs.mkdirSync(RECIPE_COVERS_DIR, { recursive: true });
  }
};

// 初始化目录
ensureUploadDirs();

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据文件类型选择目录
    const fileType = req.body.type || 'default';
    let uploadDir = UPLOAD_BASE_DIR;
    
    if (fileType === 'recipe-cover') {
      uploadDir = RECIPE_COVERS_DIR;
    }
    
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    // 清理文件名，只保留字母数字和连字符
    const cleanBasename = basename.replace(/[^a-zA-Z0-9-]/g, '-');
    cb(null, `${cleanBasename}-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器：只允许图片
const fileFilter = (req, file, cb) => {
  // 允许的MIME类型
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持图片格式：JPG, JPEG, PNG, GIF, WEBP'), false);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
  }
});

// 导出配置
export {
  upload,
  UPLOAD_BASE_DIR,
  RECIPE_COVERS_DIR
};

