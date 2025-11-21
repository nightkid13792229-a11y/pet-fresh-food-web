package com.niimbot.jcdemo.print.model.template;

import com.niimbot.jcdemo.print.model.element.Element;

import java.util.List;
import java.util.Objects;

/**
 * 打印模板类，用于封装打印模板的所有数据
 * 包含初始化绘图板参数和元素列表
 */
public class PrintTemplate {
    private InitDrawingBoardParam initDrawingBoardParam;
    private List<Element> elements;
    
    /**
     * 完整参数构造函数
     * @param initDrawingBoardParam 初始化绘图板参数
     * @param elements 元素列表
     * @throws IllegalArgumentException 如果任一参数为null
     */
    public PrintTemplate(InitDrawingBoardParam initDrawingBoardParam, List<Element> elements) {
        if (initDrawingBoardParam == null) {
            throw new IllegalArgumentException("InitDrawingBoardParam cannot be null");
        }
        if (elements == null) {
            throw new IllegalArgumentException("Elements list cannot be null");
        }
        this.initDrawingBoardParam = initDrawingBoardParam;
        this.elements = elements;
    }
    
    /**
     * 获取初始化绘图板参数
     * @return 初始化绘图板参数
     */
    public InitDrawingBoardParam getInitDrawingBoardParam() { 
        return initDrawingBoardParam; 
    }
    
    /**
     * 设置初始化绘图板参数
     * @param initDrawingBoardParam 初始化绘图板参数
     * @throws IllegalArgumentException 如果参数为null
     */
    public void setInitDrawingBoardParam(InitDrawingBoardParam initDrawingBoardParam) {
        if (initDrawingBoardParam == null) {
            throw new IllegalArgumentException("InitDrawingBoardParam cannot be null");
        }
        this.initDrawingBoardParam = initDrawingBoardParam; 
    }
    
    /**
     * 设置元素列表
     * @param elements 元素列表
     * @throws IllegalArgumentException 如果参数为null
     */
    public void setElements(List<Element> elements) {
        if (elements == null) {
            throw new IllegalArgumentException("Elements list cannot be null");
        }
        this.elements = elements;
    }
    
    /**
     * 获取元素列表
     * @return 元素列表
     */
    public List<Element> getElements() { 
        return elements; 
    }
    
    /**
     * 添加元素到模板
     * @param element 要添加的元素
     * @throws IllegalArgumentException 如果element为null
     */
    public void addElement(Element element) {
        if (element == null) {
            throw new IllegalArgumentException("Element cannot be null");
        }
        this.elements.add(element);
    }
    
    /**
     * 从模板中移除元素
     * @param element 要移除的元素
     * @return 如果元素被成功移除返回true，否则返回false
     */
    public boolean removeElement(Element element) {
        if (element == null) {
            return false;
        }
        return this.elements.remove(element);
    }
    
    /**
     * 获取模板中元素的数量
     * @return 元素数量
     */
    public int getElementCount() {
        return this.elements != null ? this.elements.size() : 0;
    }
    
    /**
     * 检查模板是否为空（无元素）
     * @return 如果模板无元素返回true，否则返回false
     */
    public boolean isEmpty() {
        return getElementCount() == 0;
    }
    
    /**
     * 清空模板中的所有元素
     */
    public void clearElements() {
        if (this.elements != null) {
            this.elements.clear();
        }
    }
    
    /**
     * 获取模板的字符串表示
     * @return 模板的字符串描述
     */
    @Override
    public String toString() {
        return "PrintTemplate{" +
                "initDrawingBoardParam=" + initDrawingBoardParam +
                ", elements=" + elements +
                '}';
    }
    
    /**
     * 检查两个PrintTemplate对象是否相等
     * @param o 要比较的对象
     * @return 如果对象相等返回true，否则返回false
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PrintTemplate that = (PrintTemplate) o;
        return Objects.equals(initDrawingBoardParam, that.initDrawingBoardParam) &&
                Objects.equals(elements, that.elements);
    }
    
    /**
     * 获取对象的哈希码
     * @return 对象的哈希码
     */
    @Override
    public int hashCode() {
        return Objects.hash(initDrawingBoardParam, elements);
    }
}
