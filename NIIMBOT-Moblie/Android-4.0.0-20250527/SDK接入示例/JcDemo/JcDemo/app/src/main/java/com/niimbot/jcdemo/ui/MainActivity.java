package com.niimbot.jcdemo.ui;

import androidx.appcompat.app.AppCompatActivity;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.SparseArray;
import android.widget.Button;
import android.widget.RadioButton;
import android.widget.Toast;


import com.gengcon.www.jcprintersdk.callback.PrintCallback;
import com.niimbot.jcdemo.app.MyApplication;
import com.niimbot.jcdemo.bean.Dish;
import com.niimbot.jcdemo.databinding.ActivityMainBinding;
import com.niimbot.jcdemo.print.data.JsonPrintData;
import com.niimbot.jcdemo.ui.orders.OrderListActivity;
import com.niimbot.jcdemo.utils.AssetCopier;
import com.niimbot.jcdemo.utils.ImgUtil;
import com.niimbot.jcdemo.print.data.PrintData;
import com.niimbot.jcdemo.print.core.PrintUtil;
import com.permissionx.guolindev.PermissionX;


import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;


/**
 * 主页
 *
 * @author zhangbin
 * 2022.03.17
 */
public class MainActivity extends AppCompatActivity {
    private static final SparseArray<String> ERROR_MESSAGES = new SparseArray<>();

    static {
        ERROR_MESSAGES.put(-1, "打印机未连接");
        ERROR_MESSAGES.put(1, "盒盖打开");
        ERROR_MESSAGES.put(2, "缺纸");
        ERROR_MESSAGES.put(3, "电量不足");
        ERROR_MESSAGES.put(4, "电池异常");
        ERROR_MESSAGES.put(5, "手动停止");
        ERROR_MESSAGES.put(6, "数据错误");
        ERROR_MESSAGES.put(7, "温度过高");
        ERROR_MESSAGES.put(8, "出纸异常");
        ERROR_MESSAGES.put(9, "正在打印");
        ERROR_MESSAGES.put(10, "没有检测到打印头");
        ERROR_MESSAGES.put(11, "环境温度过低");
        ERROR_MESSAGES.put(12, "打印头未锁紧");
        ERROR_MESSAGES.put(13, "未检测到碳带");
        ERROR_MESSAGES.put(14, "不匹配的碳带");
        ERROR_MESSAGES.put(15, "用完的碳带");
        ERROR_MESSAGES.put(16, "不支持的纸张类型");
        ERROR_MESSAGES.put(17, "纸张类型设置失败");
        ERROR_MESSAGES.put(18, "打印模式设置失败");
        ERROR_MESSAGES.put(19, "设置浓度失败");
        ERROR_MESSAGES.put(20, "写入rfid失败");
        ERROR_MESSAGES.put(21, "边距设置失败");
        ERROR_MESSAGES.put(22, "通讯异常");
        ERROR_MESSAGES.put(23, "打印机连接断开");
        ERROR_MESSAGES.put(24, "画板参数错误");
        ERROR_MESSAGES.put(25, "旋转角度错误");
        ERROR_MESSAGES.put(26, "json参数错误");
        ERROR_MESSAGES.put(27, "出纸异常(B3S)");
        ERROR_MESSAGES.put(28, "检查纸张类型");
        ERROR_MESSAGES.put(29, "RFID标签未进行写入操作");
        ERROR_MESSAGES.put(30, "不支持浓度设置");
        ERROR_MESSAGES.put(31, "不支持的打印模式");
    }


    private static final String TAG = "MainActivity";
    private static final String RB_THERMAL = "热敏";
    private ActivityMainBinding bind;
    private Context context;

    /**
     * 图像数据
     */
    private ArrayList<String> jsonList;
    /**
     * 图像处理数据
     */
    private ArrayList<String> infoList;

    /**
     * 打印模式
     */
    private int printMode;

    /**
     * 打印浓度
     */
    private int printDensity = 3;

    /**
     * 打印倍率（分辨率）
     */
    private Float printMultiple = 8.0f;
    /**
     * 是否打印错误
     */
    private boolean isError;
    /**
     * 是否取消打印
     */
    private boolean isCancel;

    /**
     * 总页数
     */
    private int pageCount;

    /**
     * 页打印份数
     */
    private int quantity;

    /**
     * 打印进度loading
     */
    private MyDialogLoadingFragment fragment;
    private ExecutorService executorService;

    Handler handler = new Handler(Looper.getMainLooper());


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bind = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(bind.getRoot());
        init();
    }

    private void init() {
        context = getApplicationContext();
        //设置自定义字体路径名称
        String customFontDirectory = "custom_font";
        //复制字体文件到内部存储
        AssetCopier.copyAssetsToInternalStorage(context, "ZT008.ttf", customFontDirectory);
        permissionRequest();
        //注册线程池
        ThreadFactory threadFactory = runnable -> {
            Thread thread = new Thread(runnable);
            thread.setName("print_pool_%d");
            return thread;
        };

        executorService = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingDeque<>(1024), threadFactory, new ThreadPoolExecutor.AbortPolicy());

        initPrintData();
        initEvent();
    }


    private void initPrintData() {
        jsonList = new ArrayList<>();
        infoList = new ArrayList<>();
    }


    private void initEvent() {
        bind.btnConnect.setOnClickListener(v -> {
            Intent intent = new Intent(context, ConnectActivity.class);
            startActivity(intent);
        });

        // 公共打印逻辑绑定
        setupPrintButton(bind.btnTextPrint, "text", printMultiple, 1);
        setupPrintButton(bind.btnBarcodePrint, "barcode", printMultiple, 1);
        setupPrintButton(bind.btnQrcodePrint, "qrcode", printMultiple, 1);
        setupPrintButton(bind.btnLinePrint, "line", printMultiple, 1);
        setupPrintButton(bind.btnGraphPrint, "graph", printMultiple, 1);
        setupPrintButton(bind.btnImagePrint, "image", printMultiple, 1);
        bind.btnBatchPrint.setOnClickListener(v -> {
            printMode = bind.rbThermal.isChecked() ? 1 : 2;
            executorService.submit(() -> {
                initPrintData();
                List<ArrayList<String>> printData = PrintData.getVacuumLabelPrintData(1, printMultiple);
                if (printData == null || printData.isEmpty()) {
                    handler.post(() -> Toast.makeText(MyApplication.getInstance(), "生成标签数据失败", Toast.LENGTH_SHORT).show());
                    return;
                }
                int length = printData.get(0).size();
                for (int i = 0; i < length; i++) {
                    jsonList.add(printData.get(0).get(i));
                    infoList.add(printData.get(1).get(i));
                }
                printLabel(1, jsonList, infoList);
            });
        });

        bind.btnBitmapPrint.setOnClickListener(v -> {
            printMode = bind.rbThermal.isChecked() ? 1 : 2;
            executorService.submit(this::printBitmap);
        });

        bind.btnMockOrder.setOnClickListener(v -> {
            Intent intent = new Intent(this, OrderListActivity.class);
            startActivity(intent);
        });

        bind.rgPrintMode.setOnCheckedChangeListener((group, checkedId) -> {
            RadioButton radioButton = findViewById(checkedId);
            String printModeOption = radioButton.getText().toString();

            SharedPreferences preferences = context.getSharedPreferences("printConfiguration", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = preferences.edit();
            if (RB_THERMAL.equals(printModeOption)) {
                editor.putInt("printMode", 1);
            } else {
                editor.putInt("printMode", 2);
            }

            editor.apply();
        });
    }

    /**
     * 绑定打印按钮的公共逻辑
     */
    private void setupPrintButton(Button button, String printType, float multiple, int copies) {
        button.setOnClickListener(v -> {
            printMode = bind.rbThermal.isChecked() ? 1 : 2;
            executorService.submit(() -> {
                initPrintData();
                //以下2中创建打印数据的方式选择其一即可
                //方式1：获取从JSON读取的打印数据
                List<ArrayList<String>> printData = JsonPrintData.getPrintData(this, printType, copies, multiple);
                //方式2：获取通过对象创建的打印机数据
//                List<ArrayList<String>> printData = PrintData.getPrintData(printType, copies, multiple);
                assert printData != null;
                int length = printData.get(0).size();
                Log.d(TAG, "printLabel: " + printData);
                for (int i = 0; i < length; i++) {
                    jsonList.add(printData.get(0).get(i));
                    infoList.add(printData.get(1).get(i));
                }
                printLabel(copies, jsonList, infoList);
            });


        });
    }


    /**
     * 打印标签
     *
     * @param copies 份数
     */
    private void printLabel(int copies, List<String> jsonList, List<String> infoList) {
        // 显示加载对话框
        fragment = new MyDialogLoadingFragment("打印中");
        fragment.show(getSupportFragmentManager(), "PRINT");
        PrintUtil.startLabelPrintJob(copies, printDensity, 1, printMode, handler, jsonList, infoList, new PrintUtil.PrintStatusCallback() {
            @Override
            public void onProgress(int pageIndex, int quantityIndex) {
                String progress = "打印进度:已打印到第" + pageIndex + "页,第" + quantityIndex + "份";
                fragment.setStateStr(progress);
            }

            @Override
            public void onError(int errorCode, int printState) {
                String errorMessage = ERROR_MESSAGES.get(errorCode, "未知错误");
                handlePrintResult(fragment, errorMessage);
            }

            @Override
            public void onCancelJob(boolean isSuccess) {
                handlePrintResult(fragment, isSuccess ? "打印已取消" : "取消失败");

            }

            @Override
            public void onPrintComplete() {
                handlePrintResult(fragment, "打印成功");

            }
        });

    }

    private void printBitmap() {
        if (PrintUtil.isConnection() != 0) {
            handler.post(() -> Toast.makeText(MyApplication.getInstance(), "未连接打印机", Toast.LENGTH_SHORT).show());
            return;
        }

        fragment = new MyDialogLoadingFragment("打印中");
        fragment.show(getSupportFragmentManager(), "PRINT");


        //重置错误状态变量
        isError = false;
        //重置取消打印状态变量
        isCancel = false;

        int orientation = 0;
        pageCount = 3;
        quantity = 1;
        AtomicInteger generatedPrintDataPageCount = new AtomicInteger(0);
        int totalQuantity = pageCount * quantity;
        /*
         * 该方法用于设置要打印的总份数。表示所有页面的打印份数之和。
         * 例如，如果你有3页需要打印，第一页打印3份，第二页打印2份，第三页打印5份，那么总打印份数的值应为10（3+2+5）
         */
        PrintUtil.getInstance().setTotalPrintQuantity(totalQuantity);
        /*
         * 参数1：打印浓度 ，参数2:纸张类型 参数3:打印模式
         * 打印浓度 B50/B50W/T6/T7/T8 建议设置6或8，Z401/B32建议设置8，B3S/B21/B203/B1建议设置3
         */
        PrintUtil.getInstance().startPrintJob(printDensity, 3, printMode, new PrintCallback() {
            @Override
            public void onProgress(int pageIndex, int quantityIndex, HashMap<String, Object> hashMap) {
                //pageIndex为打印页码进度，quantityIndex为打印份数进度，如第二页第三份
                handler.post(() -> fragment.setStateStr("打印进度:已打印到第" + pageIndex + "页,第" + quantityIndex + "份"));
                Log.d(TAG, "测试：打印进度:已打印到第: " + pageIndex);
                //打印进度回调
                if (pageIndex == pageCount && quantityIndex == quantity) {
                    Log.d(TAG, "测试:onProgress: 结束打印");
                    //endJob已废弃，使用方法含义更明确的endPrintJob
                    if (PrintUtil.getInstance().endPrintJob()) {
                        Log.d(TAG, "结束打印成功");
                    } else {
                        Log.d(TAG, "结束打印失败");
                    }


                    handlePrintResult(fragment, "打印成功");
                }


            }

            @Override
            public void onError(int i) {

            }


            @Override
            public void onError(int errorCode, int printState) {
                Log.d(TAG, "测试:onError");
                isError = true;
                String errorMsg = ERROR_MESSAGES.get(errorCode);
                handlePrintResult(fragment, errorMsg);
            }

            @Override
            public void onCancelJob(boolean isSuccess) {
                //取消打印成功回调
                isCancel = true;
            }

            @Override
            public void onBufferFree(int pageIndex, int bufferSize) {
                /*
                 * 1.如果未结束打印，且SDK缓存出现空闲，则自动回调该接口，此回调会上报多次，直到打印结束。
                 * 2.打印过程中，如果出现错误、取消打印，或 pageIndex 超过总页数，则返回。(此处控制代码必须得保留，否则会导致打印失败)
                 */
                if (notRequireSubmitData(pageIndex)) return;


                if (generatedPrintDataPageCount.get() < pageCount) {
                    ArrayList<Dish> dishList = new ArrayList<>();
                    dishList.add(new Dish("辣椒炒肉" + pageIndex, "中辣", 29.9, 1));
                    dishList.add(new Dish("土豆牛腩" + pageIndex, "中辣", 49.9, 1));

                    Bitmap bitmap = ImgUtil.Companion.generatePosReceiptImage(dishList);
                    int bitmapWidth = bitmap.getWidth();
                    int bitmapHeight = bitmap.getHeight();
                    PrintUtil.getInstance().commitImageData(orientation, bitmap, (int) (bitmapWidth / printMultiple), (int) (bitmapHeight / printMultiple), 1, 0, 0, 0, 0, "");


                }


            }
        });


    }

    private boolean notRequireSubmitData(int pageIndex) {
        return isError || isCancel || pageIndex > pageCount;
    }

    // 保留UI处理方法
    private void handlePrintResult(MyDialogLoadingFragment fragment, String message) {
        handler.post(() -> {
            if (fragment != null) fragment.dismiss();
            Toast.makeText(MyApplication.getInstance(), message, Toast.LENGTH_SHORT).show();
        });
    }


    private void permissionRequest() {
        // 根据 Android 版本选择不同的权限数组
        String[] permissions = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) ? new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT} : new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION};

        // 使用 PermissionX 请求权限，并设置回调处理函数
        PermissionX.init(MainActivity.this).permissions(permissions).request(this::handlePermissionResult);
    }


    private void handlePermissionResult(boolean allGranted, List<String> grantedList, List<String> deniedList) {
        if (allGranted) {
            handleAllPermissionsGranted();
        } else {
            handler.post(() -> showPermissionFailedToast(deniedList));
        }
    }

    /**
     * 处理所有权限已被授予的情况
     */
    private void handleAllPermissionsGranted() {
        if (!isGpsEnabled(context)) {
            handler.post(this::showGpsEnableDialog);
        }
    }

    private void showPermissionFailedToast(List<String> deniedList) {
        Toast.makeText(this, "权限打开失败" + deniedList, Toast.LENGTH_SHORT).show();
    }


    private void showGpsEnableDialog() {
        String message = "请开启GPS，未开启可能导致无法正常进行蓝牙搜索";
        int dialogType = 1;
        MyDialogFragment fragment = new MyDialogFragment(message, dialogType);
        fragment.show(getSupportFragmentManager(), "GPS");
    }

    /**
     * 检查GPS是否已开启
     *
     * @param context 上下文对象
     * @return 若GPS已开启则返回true，否则返回false
     */
    public boolean isGpsEnabled(Context context) {
        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
    }

    @Override
    protected void onResume() {
        super.onResume();
        SharedPreferences preferences = context.getSharedPreferences("printConfiguration", Context.MODE_PRIVATE);
        printMode = preferences.getInt("printMode", 1);
        printDensity = preferences.getInt("printDensity", 3);
        //除B32/Z401/T8的printMultiple为11.81，其他的为8
        printMultiple = preferences.getFloat("printMultiple", 8.0F);
        if (printMode == 1) {
            bind.rbThermal.setChecked(true);
        } else {
            bind.rbThermalTransfer.setChecked(true);
        }
    }
}