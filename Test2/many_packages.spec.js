const { test, expect } = require('@playwright/test');
const dragSlow = require('../helper/dragSlow.js');
require('dotenv').config();

function assertRequiredEnv() {
  const required = ['FFM_USERNAME', 'FFM_PASSWORD'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing ${key} in environment. Add it to .env or set the variable before running tests.`);
    }
  }
}

/**
 * Perform pointer-based drag-and-drop suitable for react-beautiful-dnd.
 * Falls back to using the source element itself if no explicit drag handle exists.
 */
async function dragAndDropByMouse(page, sourceLocator, targetLocator) {
  const handleCandidate = sourceLocator.locator('[data-rbd-drag-handle-draggable-id]');
  const hasHandle = await handleCandidate.count();
  const dragLocator = hasHandle ? handleCandidate.first() : sourceLocator;

  await dragLocator.scrollIntoViewIfNeeded();
  await targetLocator.scrollIntoViewIfNeeded();

  await expect(dragLocator).toBeVisible({ timeout: 10000 });
  await expect(targetLocator).toBeVisible({ timeout: 10000 });

  const dragBox = await dragLocator.boundingBox();
  const dropBox = await targetLocator.boundingBox();

  if (!dragBox || !dropBox) {
    throw new Error('Unable to compute bounding boxes for drag-and-drop.');
  }

  const startX = dragBox.x + dragBox.width / 2;
  const startY = dragBox.y + dragBox.height / 2;
  const targetX = dropBox.x + dropBox.width / 2;
  const targetY = dropBox.y + Math.min(dropBox.height - 5, Math.max(5, dropBox.height / 2));

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Nudge to initiate drag state
  await page.mouse.move(startX + 5, startY + 5, { steps: 5 });
  // Move to target area
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(50);
  await page.mouse.up();
  await page.waitForTimeout(200);
}

// Pick the first option from the currently open AntD Select dropdown (scoped to visible dropdown)
async function pickFirstAntdSelectOption(page) {
  const openDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await expect(openDropdown).toBeVisible({ timeout: 10000 });

  // Try keyboard Enter to choose the highlighted/active option (most stable)
  await page.keyboard.press('Enter');
  try {
    await expect(openDropdown).toBeHidden({ timeout: 800 });
    return;
  } catch {}

  // Fallback: click active option if present
  const activeOption = openDropdown.locator('.ant-select-item-option-active:not(.ant-select-item-option-disabled)').first();
  if (await activeOption.count()) {
    await activeOption.scrollIntoViewIfNeeded();
    await activeOption.click({ force: true });
    try { await expect(openDropdown).toBeHidden({ timeout: 1000 }); } catch {}
    return;
  }

  // Final fallback: click first enabled option
  const firstOption = openDropdown.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)').first();
  await expect(firstOption).toBeVisible({ timeout: 10000 });
  await firstOption.scrollIntoViewIfNeeded();
  await firstOption.click({ force: true });
  try { await expect(openDropdown).toBeHidden({ timeout: 1000 }); } catch {}
}

test.describe('Auth', () => {
  test('Login FFM Staging', async ({ page }) => {
    assertRequiredEnv();
//Login vào FFM
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

    // If there are multiple items to split, add each new package then select supplier and drag 1 item into it
    await test.step('Split packages - add each package, pick supplier, then drag one item', async () => {
      // Identify draggable items (supports react-beautiful-dnd and HTML5 draggable)
      const draggableItems = page.locator('[data-rbd-draggable-id], [draggable="true"]');
      const itemCount = await draggableItems.count();

      if (itemCount > 1) {
        const addPackageButton = page.locator("//button[contains(@class,'split-package__footer-btn')][.//span[normalize-space(.)='Add new a package']]");
        const additionsNeeded = itemCount - 1; // tạo 1 package mới cho mỗi item cần tách ra

        for (let i = 0; i < additionsNeeded; i++) {
          // 1) Bấm tạo 1 package mới và chờ xuất hiện đúng 1 placeholder rỗng mới
          const emptiesBefore = page.locator('.split-package__empty');
          const beforeEmptyCount = await emptiesBefore.count();

          await expect(addPackageButton).toBeVisible({ timeout: 10000 });
          await addPackageButton.click();

          const emptiesAfter = page.locator('.split-package__empty');
          await expect(emptiesAfter).toHaveCount(beforeEmptyCount + 1, { timeout: 10000 });

          // 2) Placeholder mới tạo (pack mới chưa có item)
          const newEmpty = emptiesAfter.nth(beforeEmptyCount);
          await expect(newEmpty).toBeVisible({ timeout: 10000 });

          // 3) Chọn supplier cho package mới tạo
          let selectToUse = newEmpty.locator('.ant-select.split-package__supplier-select.mr-3.ant-select-single.ant-select-show-arrow.ant-select-show-search .ant-select-selector');
          if ((await selectToUse.count()) === 0) {
            selectToUse = newEmpty.locator('xpath=ancestor::div[contains(@class, "ant-card")][1]//div[contains(@class, "split-package__supplier-select")]//div[contains(@class, "ant-select-selector")]');
          }
          if ((await selectToUse.count()) === 0) {
            const pageLevelSelects = page.locator('.ant-select.split-package__supplier-select.mr-3.ant-select-single.ant-select-show-arrow.ant-select-show-search .ant-select-selector');
            selectToUse = pageLevelSelects.last();
          }
          await selectToUse.waitFor({ state: 'visible', timeout: 15000 });
          await selectToUse.click();
          await pickFirstAntdSelectOption(page);
          await page.waitForTimeout(100);

          // 4) Kéo 1 item đầu tiên từ pack1 (nguồn) sang placeholder pack mới
          const sourceItem = page.locator('.split-package__order-item').first();
          await expect(sourceItem).toBeVisible({ timeout: 10000 });

          try {
            await dragSlow(page, sourceItem, newEmpty);
            await page.waitForTimeout(120);
          } catch (e) {
            await dragAndDropByMouse(page, sourceItem, newEmpty);
          }

          // 5) Xác minh placeholder biến mất sau khi kéo thành công (đã có item)
          try {
            await expect(newEmpty).toBeHidden({ timeout: 4000 });
          } catch {
            await dragAndDropByMouse(page, sourceItem, newEmpty);
            await expect(newEmpty).toBeHidden({ timeout: 4000 });
          }

          await page.waitForTimeout(150);
        }
      }
    });

    // (Bỏ bước chọn supplier cho tất cả package sau khi kéo; đã chọn trước mỗi lần kéo ở vòng lặp trên)

    // Click Mark processing (supports X/Y packages)
    await test.step('Mark packages to processing', async () => {
      const markProcessingBtn = page.locator("//button[.//span[contains(normalize-space(.), 'Mark') and contains(normalize-space(.), 'packages to processing')]]");
      await expect(markProcessingBtn).toBeVisible({ timeout: 15000 });
      await markProcessingBtn.scrollIntoViewIfNeeded();
      await markProcessingBtn.click();
      await page.waitForTimeout(1000);
    });
  });
});
