package com.niimbot.jcdemo.print.data.json;

import android.content.Context;
import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Asset文件夹JSON数据读取器
 * 用于从assets目录读取JSON文件内容
 */
public class AssetJsonReader {
    private static final String TAG = "AssetJsonReader";
    
    /**
     * 从assets目录读取JSON文件内容
     * 
     * @param context Android上下文
     * @param fileName JSON文件名（不包含路径）
     * @return JSON文件内容字符串，如果读取失败返回null
     */
    public static String readJsonFromAssets(Context context, String fileName) {
        if (context == null) {
            Log.e(TAG, "Context is null");
            return null;
        }
        
        if (fileName == null || fileName.trim().isEmpty()) {
            Log.e(TAG, "File name is null or empty");
            return null;
        }
        
        StringBuilder stringBuilder = new StringBuilder();
        
        try (InputStream inputStream = context.getAssets().open(fileName);
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            
            String line;
            while ((line = reader.readLine()) != null) {
                stringBuilder.append(line);
            }
            
            Log.d(TAG, "Successfully read JSON file: " + fileName);
            return stringBuilder.toString();
            
        } catch (IOException e) {
            Log.e(TAG, "Error reading JSON file from assets: " + fileName, e);
            return null;
        }
    }
    
    /**
     * 从assets目录读取JSON文件内容，带错误回调
     * 
     * @param context Android上下文
     * @param fileName JSON文件名（不包含路径）
     * @param errorCallback 错误回调接口
     * @return JSON文件内容字符串，如果读取失败返回null
     */
    public static String readJsonFromAssets(Context context, String fileName, JsonReadErrorCallback errorCallback) {
        String result = readJsonFromAssets(context, fileName);
        
        if (result == null && errorCallback != null) {
            errorCallback.onError("Failed to read JSON file: " + fileName);
        }
        
        return result;
    }
    
    /**
     * 检查assets目录中是否存在指定文件
     * 
     * @param context Android上下文
     * @param fileName 文件名
     * @return 如果文件存在返回true，否则返回false
     */
    public static boolean existsInAssets(Context context, String fileName) {
        if (context == null || fileName == null || fileName.trim().isEmpty()) {
            return false;
        }
        
        try {
            InputStream inputStream = context.getAssets().open(fileName);
            inputStream.close();
            return true;
        } catch (IOException e) {
            return false;
        }
    }
    
    /**
     * JSON读取错误回调接口
     */
    public interface JsonReadErrorCallback {
        /**
         * 当读取JSON文件出错时调用
         * 
         * @param errorMessage 错误信息
         */
        void onError(String errorMessage);
    }
}