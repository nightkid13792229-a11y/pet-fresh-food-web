import { comparePassword } from '../src/utils/password.js';
import { query } from '../src/db/pool.js';
import { getPool } from '../src/db/pool.js';

async function testLogin() {
  try {
    const pool = await getPool();
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');

    const testEmail = 'admin@example.com';
    const testPassword = 'admin123';

    // 查询用户
    const users = await query(
      'SELECT id, email, password_hash, name, role, status FROM users WHERE email = ?',
      [testEmail]
    );

    if (users.length === 0) {
      console.log(`❌ 未找到用户: ${testEmail}`);
      process.exit(1);
    }

    const user = users[0];
    console.log('=== 用户信息 ===');
    console.log(`ID: ${user.id}`);
    console.log(`邮箱: ${user.email}`);
    console.log(`姓名: ${user.name}`);
    console.log(`角色: ${user.role}`);
    console.log(`状态: ${user.status}`);
    console.log(`密码哈希: ${user.password_hash.substring(0, 30)}...`);
    console.log('');

    // 测试密码验证
    console.log('=== 测试密码验证 ===');
    console.log(`测试密码: ${testPassword}`);
    const match = await comparePassword(testPassword, user.password_hash);
    console.log(`密码验证结果: ${match ? '✓ 成功' : '✗ 失败'}`);
    console.log('');

    if (match) {
      console.log('✅ 密码验证成功！可以使用以下信息登录：');
      console.log(`   邮箱: ${testEmail}`);
      console.log(`   密码: ${testPassword}`);
    } else {
      console.log('❌ 密码验证失败！');
      console.log('正在重新生成密码哈希...');
      
      const { hashPassword } = await import('../src/utils/password.js');
      const newHash = await hashPassword(testPassword);
      
      await query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, user.id]
      );
      
      console.log('✓ 密码已重新设置');
      
      // 再次验证
      const newMatch = await comparePassword(testPassword, newHash);
      console.log(`重新验证结果: ${newMatch ? '✓ 成功' : '✗ 失败'}`);
      
      if (newMatch) {
        console.log('\n✅ 密码已修复！现在可以使用以下信息登录：');
        console.log(`   邮箱: ${testEmail}`);
        console.log(`   密码: ${testPassword}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

testLogin();





