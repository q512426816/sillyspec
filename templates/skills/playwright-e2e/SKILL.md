---
name: playwright-e2e
description: Playwright E2E 测试编写参考。当任务涉及编写端到端测试、浏览器自动化测试、Playwright 测试用例时自动读取，不要凭记忆编写 Playwright API。
---

# Playwright E2E 测试编写参考

> ⚠️ 执行 E2E/测试任务时必须先读取此文件，不要凭训练数据记忆编写 Playwright API。

## 测试基本结构

```typescript
import { test, expect } from '@playwright/test';

test.describe('功能名称', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('具体场景', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

## 选择器优先级

```typescript
// ✅ 最推荐：data-testid（最稳定）
await page.locator('[data-testid="submit-btn"]').click();

// ✅ 推荐：role-based（语义化）
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');

// ✅ 推荐：文本匹配
await page.getByText('Sign in').click();
await page.getByText(/welcome back/i).click();

// ✅ 可用：语义 HTML
await page.locator('button[type="submit"]').click();
await page.locator('input[name="email"]').fill('test@test.com');

// ❌ 避免：CSS 类名和 ID（重构易变）
// await page.locator('.btn-primary').click();
// await page.locator('#submit').click();
```

## 断言

```typescript
// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/.*dashboard/);

// 文本
await expect(page.locator('h1')).toHaveText('Welcome');
await expect(page.locator('.message')).toContainText('success');
await expect(page.locator('.items')).toHaveText(['Item 1', 'Item 2']);

// 可见性
await expect(page.locator('.modal')).toBeVisible();
await expect(page.locator('.spinner')).toBeHidden();
await expect(page.locator('button')).toBeEnabled();
await expect(page.locator('input')).toBeDisabled();

// 数量
await expect(page.locator('.item')).toHaveCount(3);

// 输入值
await expect(page.locator('input')).toHaveValue('test@example.com');
```

## 表单操作

```typescript
// 文本输入
await page.getByLabel('Email').fill('user@example.com');
await page.getByPlaceholder('Enter your name').fill('John Doe');

// 清空再输入
await page.locator('#username').clear();
await page.locator('#username').type('newuser', { delay: 100 });

// 复选框
await page.getByLabel('I agree').check();
await page.getByLabel('I agree').uncheck();

// 单选按钮
await page.getByLabel('Option 2').check();

// 下拉选择
await page.selectOption('select#country', 'usa');
await page.selectOption('select#country', { label: 'United States' });

// 多选下拉
await page.selectOption('select#colors', ['red', 'blue']);

// 文件上传
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');
await page.setInputFiles('input[type="file"]', ['file1.pdf', 'file2.pdf']);
```

## 鼠标与键盘

```typescript
// 点击
await page.click('button');
await page.click('button', { button: 'right' });  // 右键
await page.dblclick('button');                     // 双击

// 悬停
await page.hover('.menu-item');

// 拖拽
await page.dragAndDrop('#source', '#target');

// 键盘
await page.keyboard.type('Hello', { delay: 100 });
await page.keyboard.press('Control+A');
await page.keyboard.press('Enter');
await page.keyboard.press('Tab');
```

## 测试数据准备

```typescript
// ⚠️ E2E 测试不能因为"没有数据"就跳过！必须确保测试数据存在。

// 方案 1：通过 API 创建前置数据（推荐）
test.beforeEach(async ({ request }) => {
  // 调用项目 API 创建测试所需数据
  const resp = await request.post('/api/test/setup', {
    data: { createUser: true, createOrder: true }
  });
  expect(resp.ok()).toBeTruthy();
});

// 方案 2：使用 storageState 复用认证状态
// 先登录一次保存状态，后续测试直接复用
test.use({ storageState: 'tests/auth/user.json' });

// 生成认证状态的脚本：
// npx playwright codegen --save-storage=tests/auth/user.json http://localhost:3000/login

// 方案 3：通过数据库 MCP 直接插入数据（有数据库 MCP 时）
// 在 beforeEach 中调用数据库 MCP 执行 INSERT 语句准备数据

// 方案 4：API Mock（不需要真实数据）
test('显示用户列表', async ({ page }) => {
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Test User' }])
    });
  });
  await page.goto('/users');
  await expect(page.locator('.user-name')).toHaveText('Test User');
});

// 清理：测试后清理数据，避免影响其他测试
test.afterEach(async ({ request }) => {
  await request.post('/api/test/cleanup');
});
```

**铁律：E2E 测试禁止因"没有数据"跳过。** 必须通过以上任一方案准备数据，确保测试可独立运行。

## 弹窗与 iframe

```typescript
// 新窗口/弹窗
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('button.open-popup'),
]);
await popup.waitForLoadState();

// iframe
const frame = page.frameLocator('#my-iframe');
await frame.locator('button').click();
```

## 截图

```typescript
// 全页截图
await page.screenshot({ path: 'screenshot.png', fullPage: true });

// 元素截图
await page.locator('.chart').screenshot({ path: 'chart.png' });

// 视觉回归对比（首次生成基线，后续对比）
await expect(page).toHaveScreenshot('homepage.png');

// ⚠️ playwright.config.ts 中配置失败自动截图：
// screenshot: 'only-on-failure'（已包含在上方 config 模板中）
```

## 等待策略

```typescript
// ✅ 推荐：自动等待（Playwright 内置）
await expect(page.locator('.loaded')).toBeVisible();

// ✅ 推荐：等待 URL 变化
await page.waitForURL('**/dashboard');

// ✅ 推荐：等待网络响应
const responsePromise = page.waitForResponse('**/api/users');
await page.click('button#load-users');
const response = await responsePromise;

// ❌ 避免：硬编码 sleep
// await page.waitForTimeout(3000);
```

## Page Object Model

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('登录成功', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

## API Mock（隔离后端）

```typescript
test('显示用户列表', async ({ page }) => {
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Test User' }])
    });
  });

  await page.goto('/users');
  await expect(page.locator('.user-name')).toHaveText('Test User');
});
```

## 常见错误

### ❌ 用 CSS 类名选择元素
```typescript
await page.click('.btn-primary');  // 脆弱！重构就坏
```

### ✅ 用 data-testid
```typescript
await page.click('[data-testid="submit-btn"]');  // 稳定
```

### ❌ 测试之间有依赖
```typescript
test('步骤1：登录', async ({ page }) => { /* ... */ });
test('步骤2：需要先登录', async ({ page }) => { /* 依赖步骤1，脆弱 */ });
```

### ✅ 每个测试独立
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

### ❌ 不处理异步状态
```typescript
await page.click('[data-testid="submit"]');
await expect(page.locator('.result')).toBeVisible();  // 可能还没加载完
```

### ✅ 等待操作完成
```typescript
await page.click('[data-testid="submit"]');
await expect(page.locator('.result')).toBeVisible({ timeout: 10000 });
```

## playwright.config.ts 模板

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',  // ⚠️ 根据项目实际端口调整
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',           // ⚠️ 根据项目实际命令调整
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## 调试命令

```bash
npx playwright test --headed       # 有头模式
npx playwright test --debug         # 调试模式（带 inspector）
npx playwright test --slowmo=1000   # 慢放
npx playwright show-report          # 查看报告
npx playwright codegen URL          # 录制生成代码
```
