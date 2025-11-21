package com.niimbot.jcdemo.print.model.template;

import com.google.gson.annotations.SerializedName;

public class InitDrawingBoardParam {
    private float width;
    private float height;
    private int rotate;
    private String path;
    private float verticalShift;

    @SerializedName("HorizontalShift") // 处理大写字段名
    private float horizontalShift;
    
    /**
     * 带所有参数的构造函数
     * @param width 画板宽度
     * @param height 画板高度
     * @param rotate 旋转角度
     * @param path 文件路径
     * @param verticalShift 垂直偏移
     * @param horizontalShift 水平偏移
     * @throws IllegalArgumentException 如果path为null
     */
    public InitDrawingBoardParam(float width, float height, int rotate, String path, float verticalShift, float horizontalShift) {
        if (path == null) {
            throw new IllegalArgumentException("Path cannot be null");
        }
        this.width = width;
        this.height = height;
        this.rotate = rotate;
        this.path = path;
        this.verticalShift = verticalShift;
        this.horizontalShift = horizontalShift;
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

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        if (path == null) {
            throw new IllegalArgumentException("Path cannot be null");
        }
        this.path = path;
    }

    public float getVerticalShift() {
        return verticalShift;
    }

    public void setVerticalShift(float verticalShift) {
        this.verticalShift = verticalShift;
    }

    public float getHorizontalShift() {
        return horizontalShift;
    }

    public void setHorizontalShift(float horizontalShift) {
        this.horizontalShift = horizontalShift;
    }
}
