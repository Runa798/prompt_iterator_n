/**
 * Playwright GIF录制演示脚本
 * 用于在Vercel环境录制演示并生成GIF
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 配置
const CONFIG = {
  baseUrl: 'https://interactive-prompt-iterator.vercel.app',
  outputDir: path.join(__dirname, '../docs/screenshots'),
  viewport: { width: 1280, height: 800 },
  slowMo: 300, // 放慢操作速度
};

// 确保输出目录存在
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * 等待指定时间
 */
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 录制场景1：交互式提示词生成流程
 */
async function recordInteractiveFlow(page, context) {
  console.log('📹 场景1：交互式提示词生成流程');

  // 访问首页
  await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(2000);

  // 点击快速示例
  await page.click('text=AI 趋势分析文章');
  await wait(1000);

  // 点击发送
  await page.click('button[type="submit"]');
  await wait(3000);

  console.log('✅ 场景1录制完成');
}

/**
 * 主函数
 */
async function main() {
  console.log('🎬 开始录制GIF演示...\n');

  const browser = await chromium.launch({
    headless: true, // 无头模式录制
  });

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    recordVideo: {
      dir: CONFIG.outputDir,
      size: CONFIG.viewport,
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    await recordInteractiveFlow(page, context);

    console.log('✅ 录制完成！');
    console.log('📁 视频保存在:', CONFIG.outputDir);
    console.log('\n💡 提示: 使用 ffmpeg 将视频转换为 GIF:');
    console.log('   ffmpeg -i video.webm -vf "fps=10,scale=800:-1:flags=lanczos" output.gif');

  } catch (error) {
    console.error('❌ 录制出错:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);
