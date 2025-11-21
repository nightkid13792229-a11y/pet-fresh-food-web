package com.niimbot.jcdemo.print.model.element;

public abstract class Element {
    private String type;

    /**
     * 带类型参数的构造函数
     * @param type 元素类型
     * @throws IllegalArgumentException 如果type为null或空字符串
     */
    public Element(String type) {
        if (type == null || type.trim().isEmpty()) {
            throw new IllegalArgumentException("Element type cannot be null or empty");
        }
        this.type = type;
    }

    public String getType() { return type; }
    
    public void setType(String type) { 
        if (type == null || type.trim().isEmpty()) {
            throw new IllegalArgumentException("Element type cannot be null or empty");
        }
        this.type = type; 
    }
}
