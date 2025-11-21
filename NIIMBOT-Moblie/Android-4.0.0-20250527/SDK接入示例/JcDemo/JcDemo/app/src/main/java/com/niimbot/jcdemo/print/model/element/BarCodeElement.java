package com.niimbot.jcdemo.print.model.element;

public class BarCodeElement extends Element{
    private BarCodeJson json;
    
    /**
     * 完整参数构造函数
     * @param type 元素类型
     * @param json 条形码JSON对象
     * @throws IllegalArgumentException 如果json为null
     */
    public BarCodeElement(String type, BarCodeJson json) {
        super(type);
        if (json == null) {
            throw new IllegalArgumentException("BarCodeJson cannot be null");
        }
        this.json = json;
    }

    public BarCodeJson getJson() {
        return json;
    }

    public void setJson(BarCodeJson json) {
        if (json == null) {
            throw new IllegalArgumentException("BarCodeJson cannot be null");
        }
        this.json = json;
    }

    public static class BarCodeJson  {
        private float x;
        private float y;
        private float width;
        private float height;
        private String value;
        private int rotate;
        private float fontSize;
        private int codeType;
        private float textHeight;
        private int textPosition;
               
        /**
         * 完整参数构造函数
         * @param x X坐标
         * @param y Y坐标
         * @param width 宽度
         * @param height 高度
         * @param value 条形码值
         * @param rotate 旋转角度
         * @param fontSize 字体大小
         * @param codeType 条形码类型
         * @param textHeight 文本高度
         * @param textPosition 文本位置
         * @throws IllegalArgumentException 如果value为null
         */
        public BarCodeJson(float x, float y, float width, float height, String value, 
                          int rotate, float fontSize, int codeType, float textHeight, int textPosition) {
            if (value == null) {
                throw new IllegalArgumentException("BarCode value cannot be null");
            }
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.value = value;
            this.rotate = rotate;
            this.fontSize = fontSize;
            this.codeType = codeType;
            this.textHeight = textHeight;
            this.textPosition = textPosition;
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

        public float getWidth() {
            return width;
        }

        public void setWidth(float width) {
            this.width = width;
        }

        public float getHeight() {
            return height;
        }

        public void setHeight(float height) {
            this.height = height;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            if (value == null) {
                throw new IllegalArgumentException("BarCode value cannot be null");
            }
            this.value = value;
        }

        public int getRotate() {
            return rotate;
        }

        public void setRotate(int rotate) {
            this.rotate = rotate;
        }

        public float getFontSize() {
            return fontSize;
        }

        public void setFontSize(float fontSize) {
            this.fontSize = fontSize;
        }

        public int getCodeType() {
            return codeType;
        }

        public void setCodeType(int codeType) {
            this.codeType = codeType;
        }

        public float getTextHeight() {
            return textHeight;
        }

        public void setTextHeight(int textHeight) {
            this.textHeight = textHeight;
        }

        public int getTextPosition() {
            return textPosition;
        }

        public void setTextPosition(int textPosition) {
            this.textPosition = textPosition;
        }
    }
}
