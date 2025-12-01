import { hashPassword } from '../src/utils/password.js';
import { query } from '../src/db/pool.js';
import { getPool } from '../src/db/pool.js';

async function resetAdminPasswords() {
  try {
    // 确保数据库连接
    const pool = await getPool();
    await pool.query('SELECT 1');
    console.log('数据库连接成功');

    const newPassword = 'admin123';
    const passwordHash = await hashPassword(newPassword);
    console.log('密码哈希生成成功');

    // 查询所有管理员账号
    const admins = await query(
      'SELECT id, email, name FROM users WHERE role = ?',
      ['admin']
    );

    if (admins.length === 0) {
      console.log('未找到管理员账号，创建默认管理员账号...');
      // 创建默认管理员账号
      await query(
        'INSERT INTO users (email, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?)',
        ['admin@petfresh.local', passwordHash, 'Admin User', 'admin', 'active']
      );
      console.log('✓ 已创建默认管理员账号: admin@petfresh.local');
    } else {
      // 重置所有管理员账号的密码
      for (const admin of admins) {
        await query(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [passwordHash, admin.id]
        );
        console.log(`✓ 已重置管理员账号密码: ${admin.email} (${admin.name})`);
      }
    }

    console.log('\n=== 管理员账号信息 ===');
    console.log('所有管理员账号的密码已重置为: admin123');
    console.log('\n可用的管理员账号:');
    const allAdmins = await query(
      'SELECT email, name, status FROM users WHERE role = ? ORDER BY id',
      ['admin']
    );
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. 邮箱: ${admin.email}`);
      console.log(`   姓名: ${admin.name}`);
      console.log(`   状态: ${admin.status}`);
      console.log(`   密码: admin123\n`);
    });

    console.log('密码重置完成！');
    process.exit(0);
  } catch (error) {
    console.error('重置密码失败:', error);
    process.exit(1);
  }
}

resetAdminPasswords();





