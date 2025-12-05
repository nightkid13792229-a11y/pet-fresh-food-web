import { success } from '../../utils/response.js';
import logger from '../../utils/logger.js';
import path from 'path';
import { RECIPE_COVERS_DIR } from '../../utils/upload.js';

/**
 * 上传食谱封面照片
 */
export const uploadRecipeCoverController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未上传文件'
      });
    }

    // 获取文件信息
    const file = req.file;

    // 构建文件URL
    // file.path 是完整路径，例如：/path/to/backend/uploads/recipe-covers/filename.jpg
    // 我们需要提取相对路径：recipe-covers/filename.jpg
    const relativePath = path.relative(
      path.join(RECIPE_COVERS_DIR, '..'),
      file.path
    ).replace(/\\/g, '/'); // Windows路径转换为Unix风格

    // 构建访问URL
    const fileUrl = `/uploads/${relativePath}`;

    logger.info(`[uploadRecipeCoverController] 文件上传成功: ${file.originalname} -> ${fileUrl}`);
    logger.info(`[uploadRecipeCoverController] 文件路径: ${file.path}`);
    logger.info(`[uploadRecipeCoverController] 相对路径: ${relativePath}`);

    return success(res, {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (error) {
    logger.error('[uploadRecipeCoverController] 上传失败:', error);
    return res.status(500).json({
      success: false,
      message: '上传失败: ' + (error.message || '未知错误')
    });
  }
};

