import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: './videos',
    size: { width: 1280, height: 720 }
  }
});

const page = await context.newPage();
await page.goto('http://localhost:8765/demo-site.html');
await page.waitForTimeout(1000);

// Type the name slowly so it's visible in the video
await page.locator('#nameInput').click();
await page.locator('#nameInput').type('Lars', { delay: 150 });
await page.waitForTimeout(500);

// Click the button
await page.locator('#greetBtn').click();
await page.waitForTimeout(2000);

// Get the video path before closing
const videoPath = await page.video().path();
await context.close();
await browser.close();

console.log('Video saved to:', videoPath);
