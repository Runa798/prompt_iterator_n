const { chromium } = require('playwright');

(async () => {
  console.log('🧪 验证已修复的问题...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1️⃣ 访问应用 (端口 3002)...');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    console.log('✅ 应用加载成功\n');

    // 测试表单宽度
    console.log('2️⃣ 测试表单宽度是否全宽...');
    await page.fill('textarea[placeholder*="描述"]', '帮我写一个测试计划');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);

    // 检查表单宽度
    const formCards = await page.locator('.border-primary\\/20').all();
    if (formCards.length > 0) {
      const box = await formCards[0].boundingBox();
      console.log(`   表单宽度: ${box?.width}px`);
      console.log(`   ${box && box.width > 1000 ? '✅ 全宽显示' : '❌ 仍然较窄'}\n`);
    }

    console.log('📝 请手动检查:');
    console.log('   1. 表单是否占据全宽');
    console.log('   2. 附件显示是否正常\n');

    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await browser.close();
    console.log('\n🎉 测试完成!');
  }
})();
