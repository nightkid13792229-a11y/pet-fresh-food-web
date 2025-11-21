package com.niimbot.jcdemo.ui.orders;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.niimbot.jcdemo.R;
import com.niimbot.jcdemo.print.core.PrintUtil;
import com.niimbot.jcdemo.print.data.PrintData;

import java.util.ArrayList;
import java.util.List;

public class OrderDetailActivity extends AppCompatActivity {

    public static final String EXTRA_ORDER = "extra_order";
    private static final int DEFAULT_PRINT_DENSITY = 3;
    private static final int DEFAULT_PRINT_MODE = 1;
    private static final float DEFAULT_PRINT_MULTIPLE = 8.0f;

    private final Handler handler = new Handler(Looper.getMainLooper());

    private CheckBox vacuumCheckbox;
    private CheckBox foamCheckbox;
    private TextView previewPlaceholder;
    private MockOrder order;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_order_detail);

        order = (MockOrder) getIntent().getSerializableExtra(EXTRA_ORDER);
        if (order == null) {
            finish();
            return;
        }

        TextView recipeName = findViewById(R.id.tv_detail_recipe_name);
        TextView petName = findViewById(R.id.tv_detail_pet_name);
        TextView orderDate = findViewById(R.id.tv_detail_order_date);
        TextView perServing = findViewById(R.id.tv_detail_per_serving);
        TextView totalServings = findViewById(R.id.tv_detail_total_servings);
        LinearLayout ingredientContainer = findViewById(R.id.layout_ingredients);
        previewPlaceholder = findViewById(R.id.tv_preview_placeholder);

        recipeName.setText(order.getRecipeName());
        petName.setText(getString(R.string.detail_pet_name, order.getPetName()));
        orderDate.setText(getString(R.string.detail_order_date, order.getOrderDate()));
        perServing.setText(getString(R.string.detail_per_serving, order.getPerServingWeight()));
        totalServings.setText(getString(R.string.detail_total_servings, order.getTotalServings()));

        for (MockOrder.MockIngredient ingredient : order.getIngredients()) {
            TextView textView = new TextView(this);
            textView.setText(getString(R.string.detail_ingredient_line, ingredient.getName(), ingredient.getRatio(), ingredient.getTotalAmount()));
            textView.setTextAppearance(this, R.style.TextAppearance_AppCompat_Body1);
            ingredientContainer.addView(textView);
        }

        vacuumCheckbox = findViewById(R.id.checkbox_vacuum);
        foamCheckbox = findViewById(R.id.checkbox_foam);
        vacuumCheckbox.setChecked(true);

        Button previewButton = findViewById(R.id.btn_preview_label);
        Button printButton = findViewById(R.id.btn_print_label);
        previewButton.setOnClickListener(v -> {
            previewPlaceholder.setText(buildPreviewText());
            showSelectionToast(R.string.preview_triggered);
        });
        printButton.setOnClickListener(v -> {
            if (!vacuumCheckbox.isChecked() && !foamCheckbox.isChecked()) {
                Toast.makeText(this, R.string.template_none_selected, Toast.LENGTH_SHORT).show();
                return;
            }
            executePrint();
        });
    }

    private void executePrint() {
        if (PrintUtil.isConnection() != 0) {
            Toast.makeText(this, R.string.printer_not_connected, Toast.LENGTH_SHORT).show();
            return;
        }

        ArrayList<String> jsonList = new ArrayList<>();
        ArrayList<String> infoList = new ArrayList<>();

        if (vacuumCheckbox.isChecked()) {
            List<PrintData.VacuumIngredient> mapped = mapIngredients(order.getIngredients());
            List<ArrayList<String>> labelData = PrintData.getVacuumLabelPrintData(
                    1,
                    DEFAULT_PRINT_MULTIPLE,
                    order.getRecipeName(),
                    order.getOrderDate(),
                    order.getPetName(),
                    order.getPerServingWeight(),
                    order.getTotalServings(),
                    mapped,
                    null
            );
            if (labelData != null && !labelData.isEmpty()) {
                int length = labelData.get(0).size();
                for (int i = 0; i < length; i++) {
                    jsonList.add(labelData.get(0).get(i));
                    infoList.add(labelData.get(1).get(i));
                }
            }
        }

        if (foamCheckbox.isChecked()) {
            Toast.makeText(this, R.string.foam_template_placeholder, Toast.LENGTH_SHORT).show();
        }

        if (jsonList.isEmpty()) {
            return;
        }

        Toast.makeText(this, getString(R.string.print_job_started, order.getRecipeName()), Toast.LENGTH_SHORT).show();

        PrintUtil.startLabelPrintJob(
                1,
                DEFAULT_PRINT_DENSITY,
                1,
                DEFAULT_PRINT_MODE,
                handler,
                jsonList,
                infoList,
                new PrintUtil.PrintStatusCallback() {
                    @Override
                    public void onProgress(int pageIndex, int quantityIndex) {
                        // 可扩展为展示进度
                    }

                    @Override
                    public void onError(int errorCode, int printState) {
                        Toast.makeText(OrderDetailActivity.this, getString(R.string.print_error, errorCode, printState), Toast.LENGTH_SHORT).show();
                    }

                    @Override
                    public void onCancelJob(boolean isSuccess) {
                        Toast.makeText(OrderDetailActivity.this, R.string.print_cancelled, Toast.LENGTH_SHORT).show();
                    }

                    @Override
                    public void onPrintComplete() {
                        Toast.makeText(OrderDetailActivity.this, getString(R.string.print_success, order.getRecipeName()), Toast.LENGTH_SHORT).show();
                    }
                }
        );
    }

    private List<PrintData.VacuumIngredient> mapIngredients(List<MockOrder.MockIngredient> ingredients) {
        List<PrintData.VacuumIngredient> mapped = new ArrayList<>();
        for (MockOrder.MockIngredient ingredient : ingredients) {
            mapped.add(new PrintData.VacuumIngredient(ingredient.getName(), ingredient.getRatio(), ingredient.getTotalAmount()));
        }
        return mapped;
    }

    private String buildPreviewText() {
        StringBuilder builder = new StringBuilder();
        if (vacuumCheckbox.isChecked()) {
            builder.append(buildVacuumPreview(order));
        }
        if (foamCheckbox.isChecked()) {
            if (builder.length() > 0) {
                builder.append("\n\n");
            }
            builder.append(getString(R.string.foam_preview_placeholder));
        }
        if (builder.length() == 0) {
            builder.append(getString(R.string.template_none_selected));
        }
        return builder.toString();
    }

    private String buildVacuumPreview(MockOrder order) {
        StringBuilder builder = new StringBuilder();
        builder.append(order.getRecipeName())
                .append("\n")
                .append("制作日期：")
                .append(order.getOrderDate())
                .append("    宠物昵称：")
                .append(order.getPetName())
                .append("\n")
                .append("每份重量：")
                .append(order.getPerServingWeight())
                .append("    总份数：")
                .append(order.getTotalServings())
                .append("\n")
                .append("原料清单：");
        for (MockOrder.MockIngredient ingredient : order.getIngredients()) {
            builder.append("\n")
                    .append(ingredient.getName())
                    .append("｜")
                    .append(ingredient.getRatio())
                    .append(" / ")
                    .append(ingredient.getTotalAmount());
        }
        return builder.toString();
    }

    private void showSelectionToast(int messageRes) {
        StringBuilder builder = new StringBuilder();
        if (vacuumCheckbox.isChecked()) {
            builder.append(getString(R.string.template_vacuum_label));
        }
        if (foamCheckbox.isChecked()) {
            if (builder.length() > 0) {
                builder.append("，");
            }
            builder.append(getString(R.string.template_foam_label));
        }
        if (builder.length() == 0) {
            builder.append(getString(R.string.template_none_selected));
        }
        String message = getString(messageRes, builder.toString());
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}
