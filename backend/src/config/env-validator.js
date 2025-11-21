/**
 * 环境变量验证模块
 * 在应用启动前验证必要的环境变量是否存在
 */

const requiredEnv = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET'
];

const optionalEnv = {
  'DB_PORT': '3306',
  'PORT': '3000',
  'NODE_ENV': 'production',
  'CORS_ORIGIN': '*',
  'JWT_EXPIRES_IN': '24h',
  'BCRYPT_ROUNDS': '10',
  'LOG_LEVEL': 'info'
};

/**
 * 验证环境变量
 * @throws {Error} 如果缺少必要的环境变量，会抛出错误并退出进程
 */
export function validateEnv() {
  const missing = requiredEnv.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ 环境变量验证失败');
    console.error('缺少必要的环境变量:', missing.join(', '));
    console.error('\n请确保 .env 文件存在并包含以下变量:');
    requiredEnv.forEach(key => {
      console.error(`  - ${key}`);
    });
    process.exit(1);
  }

  // 设置可选环境变量的默认值
  Object.entries(optionalEnv).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  });

  console.log('✅ 环境变量验证通过');
  console.log(`   数据库: ${process.env.DB_HOST}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME}`);
  console.log(`   端口: ${process.env.PORT || '3000'}`);
  console.log(`   环境: ${process.env.NODE_ENV || 'production'}`);
}

