//khai báo thư viện
const { test, expect } = require('@playwright/test');
const markDoneFileIn = require('./apiMarkDoneFileIn');
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
    test.setTimeout(120000);
    assertRequiredEnv();
//Login vào FFM

    await page.goto('/login');

    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();

    await usernameInput.fill(process.env.FFM_USERNAME);//nhập username
    await passwordInput.fill(process.env.FFM_PASSWORD);//nhập password
    await loginButton.click();//click vào button login

    await expect(page).toHaveURL(/\/a\/orders/);//kiểm tra url có chứa /a/orders
    await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();//kiểm tra heading có chứa Orders

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
      await expect(unfulfilledLabel).toBeVisible({ timeout: 10000 });//kiểm tra unfulfilledLabel có hiển thị
      await unfulfilledLabel.click();//click vào unfulfilledLabel
      await page.waitForTimeout(1000);//chờ 1 giây
    })

    // Click vào order đầu tiên trong danh sách
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

        // Mở supplier filter
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

    // Click button Split packages
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

    // Click Mark processing (Mark 1/1 packages to processing)
    await test.step('Mark packages to processing', async () => {
      const markProcessingBtn = page.locator("//button[.//span[contains(normalize-space(.), 'Mark 1/1 packages to processing')]]");
      await expect(markProcessingBtn).toBeVisible({ timeout: 15000 });
      await markProcessingBtn.scrollIntoViewIfNeeded();
      await markProcessingBtn.click();
      await page.waitForTimeout(1000);
    });

    //chạy api để done filein
    await page.waitForSelector('h1.PageTitle.OrderNumber', {timeout: 15000})
    const orderNumberElement = page.locator('h1.PageTitle.OrderNumber');
    const orderNumberText = (await orderNumberElement.textContent()).replace("#", "");
    console.log(orderNumberText)
    await markDoneFileIn(orderNumberText, page)
    
    
    // Reload page before pushing
    await test.step('Reload page before Push', async () => {
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
      } catch (e) {
        // Fallback if the app never reaches network idle due to long polling/websockets
        await page.evaluate(() => location.reload());
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      }
    });
    await page.waitForTimeout(5000)
    
    // Click Push buttons
    await test.step('Click Push (btn)', async () => {
      const pushBtn = page.locator("//button[contains(@class, 'btn') and contains(text(), 'Push')]");
      await expect(pushBtn).toBeVisible({ timeout: 10000 });
      await pushBtn.click();
      await expect(page.locator('button.btn.btn-success.ml-3', { hasText: 'Push' })).toBeVisible({ timeout: 20000 });
    });
    
    await page.waitForTimeout(1000)

    // Click tiếp
    await test.step('Click Push (btn-success ml-3)', async () => {
      const pushSuccessBtn = page.locator('button.btn.btn-success.ml-3', { hasText: 'Push' });
      await expect(pushSuccessBtn).toBeVisible({ timeout: 10000 });
      await pushSuccessBtn.click();
    });
    await page.pause()
  });
});
