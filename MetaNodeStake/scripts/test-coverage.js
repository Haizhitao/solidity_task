const { execSync } = require('child_process');
const fs = require('fs');

try {
  // 清理之前的覆盖率报告
  if (fs.existsSync('coverage')) {
    console.log('清理之前的覆盖率报告...');
    // 使用Node.js内置方法删除目录（跨平台）
    fs.rmSync('coverage', { recursive: true, force: true });
  }

  // 运行覆盖率测试
  console.log('运行覆盖率测试...');
  execSync('npx hardhat coverage', { stdio: 'inherit' });

} catch (error) {
  console.error('\n测试覆盖率分析失败:', error.message);
  process.exit(1);
}
