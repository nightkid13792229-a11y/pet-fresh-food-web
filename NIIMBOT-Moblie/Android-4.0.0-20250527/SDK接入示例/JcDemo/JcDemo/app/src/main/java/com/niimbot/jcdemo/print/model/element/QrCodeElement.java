package com.niimbot.jcdemo.print.model.element;

public class QrCodeElement extends Element {
    protected QrCodeJson json = null;


    /**
     * 完整参数构造函数
     *
     * @param type 元素类型
     * @param json QrCodeJson对象
     * @throws IllegalArgumentException 如果任一参数为null或空
     */
    public QrCodeElement(String type, QrCodeJson json) {
        super(type);
        if (json == null) {
            throw new IllegalArgumentException("QrCodeJson cannot be null");
        }
        this.json = json;
    }

    public QrCodeJson getJson() {
        return json;
    }

    public void setJson(QrCodeJson json) {
        if (json == null) {
            throw new IllegalArgumentException("QrCodeJson cannot be null");
        }
        this.json = json;
    }

    public static class QrCodeJson {
        private float x;
        private float y;
        private float height;
        private float width;
        private String value;
        private int codeType;
        private int rotate;


        /**
         * 完整参数构造函数
         *
         * @param x        X坐标
         * @param y        Y坐标
         * @param width    宽度
         * @param height   高度
         * @param value    二维码值
         * @param codeType 二维码类型
         * @param rotate   旋转角度
         * @throws IllegalArgumentException 如果value为null
         */
        public QrCodeJson(float x, float y, float width, float height, String value, int codeType, int rotate) {
            if (value == null) {
                throw new IllegalArgumentException("Value cannot be null");
            }
            this.x = x;
            this.y = y;
            this.height = height;
            this.width = width;
            this.value = value;
            this.codeType = codeType;
            this.rotate = rotate;
        }

        public float getX() {
            return x;
        }

        public void setX(float x) {
            this.x = x;
        }

        public float getY() {
            return y;
        }

        public void setY(float y) {
            this.y = y;
        }

        public float getHeight() {
            return height;
        }

        public void setHeight(float height) {
            this.height = height;
        }

        public float getWidth() {
            return width;
        }

        public void setWidth(float width) {
            this.width = width;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            if (value == null) {
                throw new IllegalArgumentException("Value cannot be null");
            }
            this.value = value;
        }

        public int getCodeType() {
            return codeType;
        }

        public void setCodeType(int codeType) {
            this.codeType = codeType;
        }

        public int getRotate() {
            return rotate;
        }

        public void setRotate(int rotate) {
            this.rotate = rotate;
        }
    }
}
