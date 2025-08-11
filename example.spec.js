const { test, expect } = require('@playwright/test');
require('dotenv').config();

function assertRequiredEnv() {
  const required = ['FFM_USERNAME', 'FFM_PASSWORD'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing ${key} in environment. Add it to .env or set the variable before running tests.`);
    }
  }
}

test.describe('Auth', () => {
  test('Login FFM Staging', async ({ page }) => {
    assertRequiredEnv();

    await page.goto('/login');

    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();

    await usernameInput.fill(process.env.FFM_USERNAME);
    await passwordInput.fill(process.env.FFM_PASSWORD);
    await loginButton.click();

    await expect(page).toHaveURL(/\/a\/orders/);
    await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();

    // Search supplier: open select and choose first item using provided XPath
    // await test.step('Select first supplier from dropdown', async () => {
    //   await page.click("//div[@class='Supplier']//div[@class='ant-select-selection-overflow']");
    //   const firstOption = page.locator("//div[@class='rc-virtual-list-holder-inner']/div[1]");
    //   await expect(firstOption).toBeVisible();
    //   await firstOption.click();
    //   await page.waitForTimeout(1000)
    // });

    // Search Number: choose Unfulfilled radio
    await test.step('Filter by Unfulfilled status', async () => {
      // Tìm label chứa chữ Unfulfilled
      const unfulfilledLabel = page.locator('//label[.//span[text()="Unfulfilled"]]');
      await expect(unfulfilledLabel).toBeVisible({ timeout: 10000 });
      await unfulfilledLabel.click();
      await page.waitForTimeout(1000);
    })

    // Open first OrderCode link in the table
    await test.step('Open first OrderCode', async () => {
      const firstOrderCode = page.locator('(//td[@class="OrderCode"]/a[1])[1]');
      await firstOrderCode.click();
      await page.waitForTimeout(5000);
    });

    // Đếm và lặp qua tất cả nút "Select product", thực hiện map product cho từng dòng
    await test.step('Map products for all Select product buttons', async () => {
      const items = page.locator("//button[normalize-space(text())='Select product']");
      const count = await items.count();

      for (let i = 0; i < count; i++) {
        const item = items.nth(i);
        await item.scrollIntoViewIfNeeded();
        await item.click();

        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 15000 });

        // Mở supplier filter trong modal (AntD): click vào .ant-select-selector bên trong .supplierFilter
        const supplierSelect = page.locator('//div[contains(@class,"supplierFilter")]//div[contains(@class,"ant-select-selector")]').first();
        await supplierSelect.waitFor({ state: 'visible', timeout: 15000 });
        await supplierSelect.click();
        await page.waitForTimeout(1000)

        // Chọn supplier đầu tiên trong dropdown
        const firstSupplier = page.locator("//div[@class='rc-virtual-list-holder-inner']/div[1]");
        await expect(firstSupplier).toBeVisible({ timeout: 10000 });
        await firstSupplier.click();
        await page.waitForTimeout(1000)

        // Chọn product đầu tiên
        const firstProduct = dialog.locator("//div[@class='ProductLineItems']//div[contains(@class, 'ProductLineItem')][1]");
        await expect(firstProduct).toBeVisible({ timeout: 15000 });
        await firstProduct.scrollIntoViewIfNeeded();
        await firstProduct.click();
        await page.waitForTimeout(1000)

        // Chọn size đầu tiên
        const firstSizeCell = dialog.locator("//td[contains(@class,'ProductLineVariantAttribute')]").first();
        await expect(firstSizeCell).toBeVisible({ timeout: 20000 });
        await firstSizeCell.scrollIntoViewIfNeeded();
        await firstSizeCell.click();
        await page.waitForTimeout(1000)

        // Chờ 
        await page.waitForTimeout(300);
      }
    });

    // Click Split packages link
    await test.step('Click Split packages', async () => {
      const splitPackagesLink = page.locator("//a[contains(@class, 'btn-primary') and contains(normalize-space(.), 'Split packages')]");
      await expect(splitPackagesLink).toBeVisible({ timeout: 10000 });
      await splitPackagesLink.scrollIntoViewIfNeeded();
      await splitPackagesLink.click();
    });

    // Split packages: Search supplier and pick the first item
    await test.step('Split packages - select first supplier', async () => {
      const supplierSelect = page.locator('.ant-select.split-package__supplier-select.mr-3.ant-select-single.ant-select-show-arrow.ant-select-show-search .ant-select-selector');
      await supplierSelect.waitFor({ state: 'visible', timeout: 15000 });
      await supplierSelect.click();

      const firstOption = page.locator('//div[@class="rc-virtual-list-holder-inner"]/div[1]');
      await expect(firstOption).toBeVisible({ timeout: 10000 });
      await firstOption.click();
    });
  });
});
