package com.niimbot.jcdemo.print.core;


import android.os.Handler;
import android.util.Log;

import com.gengcon.www.jcprintersdk.JCPrintApi;
import com.gengcon.www.jcprintersdk.callback.Callback;
import com.gengcon.www.jcprintersdk.callback.PrintCallback;
import com.niimbot.jcdemo.app.MyApplication;

import java.util.HashMap;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 打印工具类
 *
 * @author zhangbin
 */
public class PrintUtil {
    private static final String TAG = "PrintUtil";
    private static int mConnectedType = -1;
    /**
     * 单例实例，使用 volatile 保证多线程可见性和有序性
     */
    private static volatile JCPrintApi api;

    /**
     * 回调接口，用于处理打印机状态变化事件
     */
    private static final Callback CALLBACK = new Callback() {
        private static final String TAG = "PrintUtil";

        /**
         * 连接成功回调
         *
         * @param address 设备地址，蓝牙为蓝牙 MAC 地址，WIFI 为 IP 地址
         * @param type   连接类型，0 表示蓝牙连接，1 表示 WIFI 连接
         */
        @Override
        public void onConnectSuccess(String address, int type) {
            mConnectedType = type;
        }

        /**
         * 断开连接回调
         * 当设备断开连接时，将调用此方法。
         */
        @Override
        public void onDisConnect() {
            mConnectedType = -1;
        }

        /**
         * 电量变化回调
         * 当设备电量发生变化时，将调用此方法。
         *
         * @param powerLevel 电量等级，取值范围为 1 到 4，代表有 1 到 4 格电，满电是 4 格
         */
        @Override
        public void onElectricityChange(int powerLevel) {

        }

        /**
         * 监测上盖状态变化回调
         * 当上盖状态发生变化时，将调用此方法。目前该回调仅支持 H10/D101/D110/D11/B21/B16/B32/Z401/B3S/B203/B1/B18 系列打印机。
         *
         * @param coverStatus 上盖状态，0 表示上盖打开，1 表示上盖关闭
         */
        @Override
        public void onCoverStatus(int coverStatus) {

        }

        /**
         * 监测纸张状态变化
         * 当纸张状态发生变化时，将调用此方法。目前该回调仅支持H10/D101/D110/D11/B21/B16/B32/Z401/B203/B1/B18 系列打印机。
         *
         * @param paperStatus 0为不缺纸 1为缺纸
         */
        @Override
        public void onPaperStatus(int paperStatus) {

        }

        /**
         * 监测标签rfid读取状态变化
         * 当标签rfid读取状态发生变化时，将调用此方法。
         *
         * @param rfidReadStatus 0为未读取到标签RFID 1为成功读取到标签RFID 目前该回调仅支持H10/D101/D110/D11/B21/B16/B32/Z401/B203/B1/B18 系列打印机。
         */
        @Override
        public void onRfidReadStatus(int rfidReadStatus) {

        }


        /**
         * 监测碳带rfid读取状态变化
         * 当碳带rfid读取状态发生变化时，将调用此方法。
         *
         * @param ribbonRfidReadStatus 0为未读取到碳带RFID 1为成功读取到碳带RFID 目前该回调仅支持B18/B32/Z401/P1/P1S 系列打印机。
         */
        @Override
        public void onRibbonRfidReadStatus(int ribbonRfidReadStatus) {

        }

        /**
         * 监测碳带状态变化
         * 当纸张状态发生变化时，将调用此方法
         *
         * @param ribbonStatus 0为无碳带 1为有碳带 目前该回调仅支持B18/B32/Z401/P1/P1S系列打印机。
         */
        @Override
        public void onRibbonStatus(int ribbonStatus) {

        }


        /**
         * 固件异常回调，需要升级
         * 当设备连接成功但出现固件异常时，将调用此方法，表示需要进行固件升级。
         */
        @Override
        public void onFirmErrors() {

        }
    };


    /**
     * 获取 JCPrintApi 单例实例
     *
     * @return JCPrintApi 实例
     */
    public static JCPrintApi getInstance() {
        // 双重检查锁定以确保只初始化一次实例
        if (api == null) {
            synchronized (PrintUtil.class) {
                if (api == null) {
                    api = JCPrintApi.getInstance(CALLBACK);
                    //api.init已废弃，使用initSdk替代，方法名含义更准确
                    api.initSdk(MyApplication.getInstance());
                    //获取内置目录路径
//                    File directory = MyApplication.getInstance().getFilesDir();
                    //获取自定义字体路径
//                    File customFontDirectory = new File(directory, "custom_font");
//                    api.initDefaultImageLibrarySettings(customFontDirectory.getAbsolutePath(), "");

                }
            }
        }

        return api;

    }


    /**
     * 通过打印机mac地址进行蓝牙连接开启打印机（同步）
     *
     * @param address 打印机地址
     * @return 成功与否
     */
    public static int connectBluetoothPrinter(String address) {
        // 获取单例实例以确保线程安全
        JCPrintApi localApi = getInstance();
        Log.d(TAG, "connectBluetoothPrinter: "+address);
        //api.openPrinterByAddress(address)，使用connectBluetoothPrinter替代，方法名含义更准确
        return localApi.connectBluetoothPrinter(address);
    }

    /**
     * 关闭打印机
     */
    public static void close() {
        // 获取单例实例以确保线程安全
        JCPrintApi localApi = getInstance();
        localApi.close();
    }


    public static int getConnectedType() {
        return mConnectedType;
    }

    public static void setConnectedType(int connectedType) {
        mConnectedType = connectedType;
    }

    /**
     * 检查打印机是否连接
     *
     * @return 连接状态代码
     */
    public static int isConnection() {
        // 获取单例实例以确保线程安全
        JCPrintApi localApi = getInstance();
        return localApi.isConnection();
    }

    /**
     * 打印回调接口
     */
    public interface PrintStatusCallback {
        void onProgress(int pageIndex, int quantityIndex);

        void onError(int errorCode, int printState);

        void onCancelJob(boolean isSuccess);

        void onPrintComplete();
    }







    /**
     * 启动标签打印任务
     *
     * @param copies 单页打印份数，非总打印份数
     * @param density 打印浓度
     * @param labelType 标签类型
     * @param mode 打印模式
     * @param handler 用于处理回调的Handler
     * @param jsonList 包含打印数据的JSON字符串列表
     * @param infoList 包含打印信息的字符串列表
     * @param callback 打印状态回调接口
     */
    public static void startLabelPrintJob( int copies, int density,int labelType, int mode,
                                          Handler handler,
                                          List<String> jsonList, List<String> infoList ,PrintStatusCallback callback) {
        Log.d(TAG, "startLabelPrintJob: ");
        // 打印参数校验
        if (isConnection() != 0) {
            handler.post(() -> callback.onError(-1, 0));
            return;
        }

        // 初始化打印状态
        AtomicInteger generatedPages = new AtomicInteger(0);
        AtomicBoolean isError = new AtomicBoolean(false);
        AtomicBoolean isCancel = new AtomicBoolean(false);
        int pages = jsonList.size();
        // 设置打印总量
        getInstance().setTotalPrintQuantity(pages * copies);

        // 启动打印任务
        getInstance().startPrintJob(density, labelType, mode, new PrintCallback() {
            @Override
            public void onProgress(int pageIndex, int quantityIndex, HashMap<String, Object> hashMap) {
                handler.post(() -> callback.onProgress(pageIndex, quantityIndex));
                if (pageIndex == pages && quantityIndex == copies) {
                    getInstance().endPrintJob();
                    handler.post(callback::onPrintComplete);
                }
            }

            @Override
            public void onError(int i) {
                //无需处理
            }

            @Override
            public void onError(int errorCode, int printState) {
                Log.d(TAG, "onError: " + errorCode + " " + printState);
                isError.set(true);
                handler.post(() -> callback.onError(errorCode, printState));
            }

            @Override
            public void onCancelJob(boolean success) {
                isCancel.set(success);
                handler.post(() -> callback.onCancelJob(success));
            }

            @Override
            public void onBufferFree(int pageIndex, int bufferSize) {
//                Log.d(TAG, "测试:onBufferFree " + pageIndex + " " + bufferSize);
                if (isError.get() || isCancel.get() || pageIndex > pages) return;

                Log.d(TAG, "测试:onBufferFree ");
                // 生成打印数据
                int commitSize = Math.min(pages - generatedPages.get(), bufferSize);
                Log.d(TAG, "测试:onBufferFree-commitSize: "+commitSize);
                List<String> subJson = jsonList.subList(generatedPages.get(), generatedPages.get() + commitSize);
                List<String> subInfo = infoList.subList(generatedPages.get(), generatedPages.get() + commitSize);
                Log.d(TAG, "测试:onBufferFree-subJson: "+subJson);
                Log.d(TAG, "测试:onBufferFree-subInfo: "+subInfo);
                getInstance().commitData(subJson, subInfo);

                generatedPages.addAndGet(commitSize);
                Log.d(TAG, "测试:onBufferFree-generatedPages: "+generatedPages.get());
            }
        });




}



}
