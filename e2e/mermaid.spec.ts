import { test, expect } from '@playwright/test';

test.describe('Mermaid Rendering & Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/test-page.html');
    await page.waitForFunction(() => (window as any).__mio_e2e_ready__ === true);
  });

  test('should render basic flowchart diagram as SVG', async ({ page }) => {
    const mermaidCode = `\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
\`\`\``;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, mermaidCode);

    // 等待 Mermaid 渲染完成
    const mermaidContent = page.locator('.mermaid-diagram-content');
    await expect(mermaidContent).toBeVisible();

    const svg = mermaidContent.locator('svg');
    await expect(svg).toBeVisible();

    // 检查 Mermaid flowchart 生成的节点内容
    await expect(svg).toContainText('Start');
    await expect(svg).toContainText('Is it working?');
    await expect(svg).toContainText('Great!');
    await expect(svg).toContainText('Debug');
  });

  test('should render sequence diagram correctly', async ({ page }) => {
    const sequenceCode = `\`\`\`mermaid
sequenceDiagram
    autonumber
    Alice->>Bob: Hello John, how are you?
    loop Healthcheck
        Bob->>Bob: Checking health
    end
    Bob-->>Alice: I am good thanks!
\`\`\``;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, sequenceCode);

    const mermaidContent = page.locator('.mermaid-diagram-content');
    await expect(mermaidContent).toBeVisible();

    const svg = mermaidContent.locator('svg');
    await expect(svg).toBeVisible();
    await expect(svg).toContainText('Alice');
    await expect(svg).toContainText('Bob');
    await expect(svg).toContainText('Hello John, how are you?');
  });

  test('should support zoom in and reset zoom', async ({ page }) => {
    const mermaidCode = `\`\`\`mermaid
graph LR
    A --> B
\`\`\``;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, mermaidCode);

    const diagram = page.locator('.mermaid-diagram');
    await expect(diagram.locator('svg')).toBeVisible();

    const zoomIndicator = page.locator('.zoom-indicator');
    await expect(zoomIndicator).toHaveText('100%');

    // 模拟滚轮放大 (deltaY < 0 放大)
    await diagram.dispatchEvent('wheel', { deltaY: -100, clientX: 200, clientY: 200 });

    // 缩放比例应发生变化
    await expect(zoomIndicator).not.toHaveText('100%');

    // 点击重置按钮
    const resetBtn = page.locator('.control-btn[title="重置缩放"]');
    await resetBtn.click();

    // 缩放比例重置为 100%
    await expect(zoomIndicator).toHaveText('100%');
  });

  test('should handle syntax error gracefully in non-streaming mode', async ({ page }) => {
    const brokenMermaid = `\`\`\`mermaid
graph INVALID_SYNTAX???
    A --- broken ---
\`\`\``;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text, false);
    }, brokenMermaid);

    const errorBox = page.locator('.mermaid-error');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText('Mermaid 渲染错误');
  });

  test('should suppress error in streaming mode until complete', async ({ page }) => {
    const incompleteMermaid = `\`\`\`mermaid
graph T`;

    // 处于流式传输中，不应展示大红报错框
    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text, true);
    }, incompleteMermaid);

    const errorBox = page.locator('.mermaid-error');
    await expect(errorBox).not.toBeVisible();
  });
});
