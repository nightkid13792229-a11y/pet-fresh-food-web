package com.niimbot.jcdemo.print.model.element;

import com.google.gson.annotations.SerializedName;

public class LineElement extends Element{
    protected LineJson json = null;

    /**
     * 完整参数构造函数
     * @param type 元素类型
     * @param json 线条JSON对象
     * @throws IllegalArgumentException 如果json为null
     */
    public LineElement(String type, LineJson json) {
        super(type);
        if (json == null) {
            throw new IllegalArgumentException("LineJson cannot be null");
        }
        this.json = json;
    }

    public LineJson getJson() {
        return json;
    }

    public void setJson(LineJson json) {
        if (json == null) {
            throw new IllegalArgumentException("LineJson cannot be null");
        }
        this.json = json;
    }

    public static class LineJson{
        private float x;
        private float y;
        private float width;
        private float height;

        private int lineType;
        private int rotate;
        @SerializedName("dashwidth")
        private float[] dashWidth;
        

        
        /**
         * 完整参数构造函数
         * @param x X坐标
         * @param y Y坐标
         * @param width 宽度
         * @param height 高度
         * @param lineType 线条类型
         * @param rotate 旋转角度
         * @param dashWidth 虚线宽度数组
         */
        public LineJson(float x, float y, float width, float height, int lineType,
                       int rotate, float[] dashWidth) {
            this.x = x;
            this.y = y;
            this.height = height;
            this.width = width;
            this.lineType = lineType;
            this.rotate = rotate;
            this.dashWidth = dashWidth != null ? dashWidth : new float[]{5.0f, 5.0f};
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

        public int getLineType() {
            return lineType;
        }

        public void setLineType(int lineType) {
            this.lineType = lineType;
        }

        public int getRotate() {
            return rotate;
        }

        public void setRotate(int rotate) {
            this.rotate = rotate;
        }

        public float[] getDashWidth() {
            return dashWidth;
        }

        public void setDashWidth(float[] dashWidth) {
            this.dashWidth = dashWidth != null ? dashWidth : new float[]{5.0f, 5.0f};
        }

        public float[] getDashwidth() {
            return this.dashWidth;
        }
    }
}
