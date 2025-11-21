# TabBar 图标说明

微信小程序 tabBar 需要图标文件。请在此目录下添加以下图标文件：

1. `recipes.png` - 所有食谱图标（未选中状态，81x81px）
2. `recipes-active.png` - 所有食谱图标（选中状态，81x81px）
3. `orders.png` - 我的订单图标（未选中状态，81x81px）
4. `orders-active.png` - 我的订单图标（选中状态，81x81px）
5. `pets.png` - 我的爱犬图标（未选中状态，81x81px）
6. `pets-active.png` - 我的爱犬图标（选中状态，81x81px）

**图标要求：**
- 尺寸：81x81 像素
- 格式：PNG
- 背景：透明
- 颜色：未选中状态建议使用灰色，选中状态建议使用绿色（#10B981）

**临时方案：**
如果暂时没有图标，可以暂时注释掉 `app.json` 中的 `iconPath` 和 `selectedIconPath`，tabBar 会只显示文字（但可能会有警告）。


