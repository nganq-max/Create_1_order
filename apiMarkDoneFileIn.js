module.exports = async (orderNumber, page) => {
    // await page.waitForTimeout(4000)
    const token = await page.evaluate(() => localStorage.getItem("com.pdf126.accessToken").replace(/"/g, ''));

    console.log(token)
    // console.log(tokens)
    const domain = "https://fulfillment-staging.merchize.com";

    // --- Gọi API cập nhật status review -> done ---

    const payload = {
        page: 1,
        limit: 10,
        order_number: orderNumber,
        update_design_count: "",
        package_names: [],
        show_archive: "hide_archive"
    };

    // --- Gọi API tìm kiếm ---
    const res = await page.request.post(
        `${domain}/api/order/printing-files/search`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            data: payload,
        }
    );

    const responseData = await res.json();
    console.log(responseData);

    const statusList = ["review", "done"];

    // --- Cập nhật trạng thái ---
    for (const item of responseData.data.items) {
        for (const stt of statusList) {
            const updateRes = await page.request.put(
                `${domain}/api/order/printing-files/${item.fulfillment}/items/${item._id}/status/${stt}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            console.log(
                `Updated ${item._id} (${item.fulfillment}) to ${stt} -> ${updateRes.status()}`
            );
        }
    }
}