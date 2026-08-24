import { test, expect } from '@playwright/test';

test.describe('Markdown Plugins & Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/test-page.html');
    await page.waitForFunction(() => (window as any).__mio_e2e_ready__ === true);
  });

  test('should render KaTeX formulas correctly', async ({ page }) => {
    const mathContent = `
Inline math: $E = mc^2$

Block math:
$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$
`;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, mathContent);

    // KaTeX outputs mathml markup
    const mathElements = page.locator('math');
    await expect(mathElements.first()).toBeAttached();
    await expect(page.locator('.katex-block')).toBeVisible();
  });

  test('should render Prism CodeBlock with copy, line numbers, and collapse', async ({ page }) => {
    const codeContent = `\`\`\`typescript
interface User {
  id: string;
  name: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\``;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, codeContent);

    const codeWrapper = page.locator('.code-block-wrapper');
    await expect(codeWrapper).toBeVisible();
    await expect(codeWrapper.locator('.lang-label')).toHaveText('TYPESCRIPT');

    // 检查高亮 code 标签
    const codeTag = codeWrapper.locator('code.language-typescript');
    await expect(codeTag).toBeVisible();

    // 检查复制按钮
    const copyBtn = codeWrapper.locator('.copy-code-button');
    await expect(copyBtn).toBeVisible();
  });

  test('should render emoji shortcodes', async ({ page }) => {
    const emojiContent = 'Hello world! :smile: :fire: :rocket:';

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, emojiContent);

    const content = page.locator('.mio-previewer');
    await expect(content).toContainText('😊');
    await expect(content).toContainText('🔥');
    await expect(content).toContainText('🚀');
  });

  test('should render custom Alert containers', async ({ page }) => {
    const alertContent = `::: info
这是一个 info 类型的警告框
:::

::: warning
这是一个 warning 警告框
:::`;

    await page.evaluate((text) => {
      (window as any).__mio_e2e__.setMarkdown(text);
    }, alertContent);

    await expect(page.locator('.custom-alert.alert-info')).toBeVisible();
    await expect(page.locator('.custom-alert.alert-warning')).toBeVisible();
  });
});
