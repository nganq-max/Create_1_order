module.exports = async (page, sourceLocator, targetLocator, options = {}) => {
    const {
        hold = 120,       // ms giữ chuột trước khi bắt đầu kéo
        steps = 30,       // số bước di chuyển
        stepDelay = 30,   // ms nghỉ giữa mỗi bước
        preJitter = 10,   // pixel “nhoi” ban đầu (kích hoạt lib như react-beautiful-dnd)
        jitterDown = true // có nhoi xuống trước không
    } = options;

    await sourceLocator.scrollIntoViewIfNeeded();
    await targetLocator.scrollIntoViewIfNeeded();

    const sBox = await sourceLocator.boundingBox();
    const tBox = await targetLocator.boundingBox();
    if (!sBox || !tBox) throw new Error('Không lấy được boundingBox (source hoặc target)');

    let startX = sBox.x + sBox.width / 2;
    let startY = sBox.y + sBox.height / 2;
    const endX = tBox.x + tBox.width / 2;
    const endY = tBox.y + tBox.height / 2;

    // Di chuyển tới source & nhấn
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Giữ chuột 1 chút
    if (hold) await page.waitForTimeout(hold);

    // Jitter kích hoạt drag sensor (tùy lib)
    if (preJitter > 0) {
        const jitterY = jitterDown ? startY + preJitter : startY - preJitter;
        await page.mouse.move(startX, jitterY, { steps: 5 });
        startY = jitterY; // cập nhật vị trí hiện tại
    }

    // Kéo từng bước chậm
    for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const y = startY + (endY - startY) * (i / steps);
        await page.mouse.move(x, y);
        if (stepDelay) await page.waitForTimeout(stepDelay);
    }

    await page.mouse.up();
}