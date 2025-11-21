package com.niimbot.jcdemo.print.data.json;

import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import com.google.gson.JsonSyntaxException;
import com.google.gson.TypeAdapter;
import com.google.gson.TypeAdapterFactory;
import com.google.gson.reflect.TypeToken;
import com.niimbot.jcdemo.print.core.PrintUtil;
import com.niimbot.jcdemo.print.data.adapter.ElementAdapter;

import com.niimbot.jcdemo.print.model.element.BarCodeElement;
import com.niimbot.jcdemo.print.model.element.Element;
import com.niimbot.jcdemo.print.model.element.GraphElement;
import com.niimbot.jcdemo.print.model.element.ImageElement;
import com.niimbot.jcdemo.print.model.element.LineElement;
import com.niimbot.jcdemo.print.model.element.QrCodeElement;
import com.niimbot.jcdemo.print.model.element.TextElement;
import com.niimbot.jcdemo.print.model.info.PrinterImageProcessingInfo;
import com.niimbot.jcdemo.print.model.info.PrinterImageProcessingInfoWrapper;
import com.niimbot.jcdemo.print.model.template.PrintTemplate;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class JsonProcessor {
    private static final String TAG = "JsonSerializer";

    /**
     * 创建统一的Gson实例，避免重复创建和循环依赖问题
     */
    public static final Gson GSON_INSTANCE = createGsonInstance();

    /**
     * 创建配置好的Gson实例
     *
     * @return 配置好的Gson实例
     */
    private static Gson createGsonInstance() {
        // 使用延迟初始化避免循环依赖
        return new GsonBuilder()
                .registerTypeAdapter(Element.class, new ElementAdapter(null))
                .registerTypeAdapterFactory(new TypeAdapterFactory() {
                    @Override
                    public <T> TypeAdapter<T> create(Gson gson, TypeToken<T> type) {
                        if (type.getRawType().equals(Element.class)) {
                            // 使用当前正在创建的gson实例，避免循环依赖
                            return (TypeAdapter<T>) new ElementAdapter(gson);
                        }
                        return null;
                    }
                })
                .create();
    }
    
    /**
     * 安全地将对象序列化为JSON字符串
     * @param object 要序列化的对象
     * @return JSON字符串，如果序列化失败则返回null
     */
    public static String serializeToJson(Object object) {
        if (object == null) {
            Log.w(TAG, "Attempted to serialize null object");
            return null;
        }
        
        try {
            return GSON_INSTANCE.toJson(object);
        } catch (JsonSyntaxException e) {
            Log.e(TAG, "JSON syntax error during serialization: ", e);
            return null;
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error during serialization: ", e);
            return null;
        }
    }
    

    
    /**
     * 安全地将PrinterImageProcessingInfoWrapper对象序列化为JSON字符串
     * @param infoWrapper 要序列化的PrinterImageProcessingInfoWrapper对象
     * @return JSON字符串，如果序列化失败则返回null
     */
    public static String serializePrinterInfo(PrinterImageProcessingInfoWrapper infoWrapper) {
        return serializeToJson(infoWrapper);
    }
    
    /**
     * 处理打印数据，包括序列化和格式化
     * @param template 打印模板对象
     * @param info 打印信息对象
     * @param dataType 数据类型 1-单份JSON数据，2-JSON数据数组
     * @return 包含打印数据的列表，如果处理失败则返回空列表
     */
    public static List<ArrayList<String>> processPrintData(PrintTemplate template, PrinterImageProcessingInfoWrapper info, int dataType) {
        List<ArrayList<String>> printData = new ArrayList<>();
        ArrayList<String> printJsonData = new ArrayList<>();
        ArrayList<String> printInfoData = new ArrayList<>();


        Log.d(TAG, "processPrintData: "+serializeToJson( template));
        // 直接处理模板对象，避免不必要的序列化/反序列化
        List<String> processedTemplateData = processTemplateObject(template, dataType);
        if (processedTemplateData.isEmpty()) {
            Log.e(TAG, "Failed to process template data");
            return Collections.emptyList();
        }
        printJsonData.addAll(processedTemplateData);
        
        // 序列化信息对象
        String infoJson = serializePrinterInfo(info);
        if (infoJson == null) {
            Log.e(TAG, "Failed to serialize printer info");
            return Collections.emptyList();
        }
        
        printInfoData.add(infoJson);
        
        // 组装最终数据
        printData.add(printJsonData);
        printData.add(printInfoData);
        
        return printData;
    }
    
    /**
     * 直接处理模板对象，避免序列化/反序列化开销
     * @param template 打印模板对象
     * @param dataType 数据类型 1-单份数据，2-多份数据
     * @return 处理后的打印数据列表
     */
    private static List<String> processTemplateObject(PrintTemplate template, int dataType) {
        List<String> printDataList = new ArrayList<>();
        
        try {
            if (dataType == 1) {
                // 单份数据，直接处理
                printDataList.add(processPrintTemplate(template));
            } else {
                // 多份数据，根据需要复制模板
                // 注意：这里假设dataType为2时需要处理多份相同模板
                // 如果实际需求不同，可以调整此逻辑
                printDataList.add(processPrintTemplate(template));
                // 如果需要多份不同的模板，应该使用processTemplateList方法
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing template object: ", e);
        }
        
        return printDataList;
    }

    /**
     * 创建并初始化PrinterImageProcessingInfo对象
     *
     * @param rotate   旋转角度
     * @param copies   打印份数
     * @param width    宽度
     * @param height   高度
     * @param multiple 打印倍数
     * @param epc      EPC值
     * @return 初始化完成的PrinterImageProcessingInfo对象
     */
    public static PrinterImageProcessingInfo createPrinterImageProcessingInfo(int rotate, int copies, float width, float height, float multiple, String epc) {
        return new PrinterImageProcessingInfo(rotate, new int[]{0, 0, 0, 0}, copies, 0.0f, 0.0f, width, height, String.valueOf(multiple), epc);
    }

    /**
     * 创建并初始化PrinterImageProcessingInfo对象（使用默认EPC值）
     *
     * @param rotate   旋转角度
     * @param copies   打印份数
     * @param width    宽度
     * @param height   高度
     * @param multiple 打印倍数
     * @return 初始化完成的PrinterImageProcessingInfo对象
     */
    public static PrinterImageProcessingInfo createPrinterImageProcessingInfo(int rotate, int copies, float width, float height, float multiple) {
        return createPrinterImageProcessingInfo(rotate, copies, width, height, multiple, "");
    }
    
    /**
     * 处理PrinterImageProcessingInfoWrapper列表，避免序列化/反序列化操作
     * 
     * @param infoWrappers PrinterImageProcessingInfoWrapper对象列表
     * @return 处理后的数据列表
     */
    public static List<String> processInfoWrapperList(List<PrinterImageProcessingInfoWrapper> infoWrappers) {
        List<String> result = new ArrayList<>();
        
        if (infoWrappers == null || infoWrappers.isEmpty()) {
            Log.w(TAG, "Info wrapper list is null or empty");
            return result;
        }
        
        for (PrinterImageProcessingInfoWrapper infoWrapper : infoWrappers) {
            try {
                // 直接处理对象，无需序列化/反序列化
                String processedData = serializePrinterInfo(infoWrapper);
                if (processedData != null) {
                    result.add(processedData);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing info wrapper: " + e.getMessage(), e);
            }
        }
        
        return result;
    }
    
    /**
     * 处理模板列表，用于批量打印
     * @param templates 模板列表
     * @return 处理后的打印数据列表
     */
    public static List<String> processTemplateList(List<PrintTemplate> templates) {
        List<String> printDataList = new ArrayList<>();
        
        if (templates == null || templates.isEmpty()) {
            Log.w(TAG, "Template list is null or empty");
            return printDataList;
        }
        Log.d(TAG, "processPrintData: "+serializeToJson( templates));
        try {
            for (PrintTemplate template : templates) {
                printDataList.add(processPrintTemplate(template));
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing template list: ", e);
        }
        
        return printDataList;
    }
    



    private static String processPrintTemplate(PrintTemplate template) {
        List<String> fonts = new ArrayList<>();
        PrintUtil.getInstance().drawEmptyLabel(template.getInitDrawingBoardParam().getWidth(), template.getInitDrawingBoardParam().getHeight(), template.getInitDrawingBoardParam().getRotate(), fonts);

        List<Element> elements = template.getElements();
        for (Element element : elements) {
            if (element instanceof TextElement textElement) {
                TextElement.TextJson json = textElement.getJson();
                Log.d(TAG, "getJsonPrintData-getTextAlignHorizontal:" + json.getTextAlignHorizontal());
                PrintUtil.getInstance().drawLabelText(json.getX(), json.getY(), json.getWidth(), json.getHeight(), json.getValue(), json.getFontFamily(), json.getFontSize(), json.getRotate(), json.getTextAlignHorizontal(), json.getTextAlignVertical(), json.getLineMode(), json.getLetterSpacing(), json.getLineSpacing(), json.getFontStyle());

            } else if (element instanceof BarCodeElement barCodeElement) {
                BarCodeElement.BarCodeJson json = barCodeElement.getJson();
                PrintUtil.getInstance().drawLabelBarCode(json.getX(), json.getY(), json.getWidth(), json.getHeight(), json.getCodeType(), json.getValue(), json.getFontSize(), json.getRotate(), json.getTextHeight(), json.getTextPosition());

            } else if (element instanceof LineElement lineElement) {
                LineElement.LineJson json = lineElement.getJson();
                PrintUtil.getInstance().drawLabelLine(json.getX(), json.getY(), json.getWidth(), json.getHeight(), json.getLineType(), json.getRotate(), json.getDashwidth());

            } else if (element instanceof GraphElement graphElement) {
                GraphElement.GraphJson json = graphElement.getJson();
                PrintUtil.getInstance().drawLabelGraph(json.getX(), json.getY(), json.getWidth(), json.getHeight(), json.getGraphType(), json.getRotate(), json.getCornerRadius(), json.getLineWidth(), json.getLineType(), json.getDashWidth());

            } else if (element instanceof QrCodeElement qrCodeElement) {
                QrCodeElement.QrCodeJson json = qrCodeElement.getJson();
                PrintUtil.getInstance().drawLabelQrCode(json.getX(), json.getY(), json.getWidth(), json.getHeight(), json.getValue(), json.getCodeType(), json.getRotate());

            } else if (element instanceof ImageElement imageElement) {
                ImageElement.ImageJson json = imageElement.getJson();
                PrintUtil.getInstance().drawLabelImage(json.getImageData(), json.getX(), json.getY(), json.getWidth(), json.getHeight(), json.getRotate(), json.getImageProcessingType(), json.getImageProcessingValue());
            }
        }

        byte[] printData = PrintUtil.getInstance().generateLabelJson();
        return new String(printData, StandardCharsets.UTF_8);
    }
}
