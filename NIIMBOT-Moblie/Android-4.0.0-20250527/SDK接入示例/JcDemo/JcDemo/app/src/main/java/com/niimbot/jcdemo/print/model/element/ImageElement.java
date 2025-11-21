package com.niimbot.jcdemo.print.model.element;

public class ImageElement extends Element {
    protected ImageJson json = null;

    /**
     * 完整参数构造函数
     *
     * @param type 元素类型
     * @param json 图像JSON对象
     * @throws IllegalArgumentException 如果json为null
     */
    public ImageElement(String type, ImageJson json) {
        super(type);
        if (json == null) {
            throw new IllegalArgumentException("ImageJson cannot be null");
        }
        this.json = json;
    }

    public ImageJson getJson() {
        return json;
    }

    public void setJson(ImageJson json) {
        if (json == null) {
            throw new IllegalArgumentException("ImageJson cannot be null");
        }
        this.json = json;
    }

    public static class ImageJson {
        private float x;
        private float y;
        private float width;
        private float height;
        private int rotate;
        private String imageData;
        private int imageProcessingType;
        private float imageProcessingValue;


        /**
         * 完整参数构造函数
         *
         * @param x                    X坐标
         * @param y                    Y坐标
         * @param width                宽度
         * @param height               高度
         * @param rotate               旋转角度
         * @param imageData            图像数据
         * @param imageProcessingType  图像处理类型
         * @param imageProcessingValue 图像处理值
         * @throws IllegalArgumentException 如果imageData为null
         */
        public ImageJson(float x, float y, float width, float height, int rotate,
                         String imageData, int imageProcessingType, float imageProcessingValue) {
            if (imageData == null) {
                throw new IllegalArgumentException("Image data cannot be null");
            }
            this.x = x;
            this.y = y;
            this.height = height;
            this.width = width;
            this.rotate = rotate;
            this.imageData = imageData;
            this.imageProcessingType = imageProcessingType;
            this.imageProcessingValue = imageProcessingValue;
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

        public int getRotate() {
            return rotate;
        }

        public void setRotate(int rotate) {
            this.rotate = rotate;
        }

        public String getImageData() {
            return imageData;
        }

        public void setImageData(String imageData) {
            if (imageData == null) {
                throw new IllegalArgumentException("Image data cannot be null");
            }
            this.imageData = imageData;
        }

        public int getImageProcessingType() {
            return imageProcessingType;
        }

        public void setImageProcessingType(int imageProcessingType) {
            this.imageProcessingType = imageProcessingType;
        }

        public float getImageProcessingValue() {
            return imageProcessingValue;
        }

        public void setImageProcessingValue(float imageProcessingValue) {
            this.imageProcessingValue = imageProcessingValue;
        }
    }

}
