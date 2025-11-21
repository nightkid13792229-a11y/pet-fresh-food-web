package com.niimbot.jcdemo.ui.orders;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.niimbot.jcdemo.R;
import com.niimbot.jcdemo.data.OrderRepository;

import java.util.ArrayList;
import java.util.List;

public class OrderListActivity extends AppCompatActivity {

    private OrderRepository repository;
    private OrderListAdapter adapter;
    private ProgressBar progressBar;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_order_list);

        RecyclerView recyclerView = findViewById(R.id.recycler_orders);
        progressBar = findViewById(R.id.progress_loading);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        adapter = new OrderListAdapter(new ArrayList<>(), this::openOrderDetail);
        recyclerView.setAdapter(adapter);

        repository = new OrderRepository(this);
        loadOrders();
    }

    private void loadOrders() {
        progressBar.setVisibility(View.VISIBLE);
        repository.fetchOrders(new OrderRepository.OrderCallback() {
            @Override
            public void onSuccess(List<MockOrder> orders) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    adapter.updateOrders(orders);
                });
            }

            @Override
            public void onError(Throwable throwable) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(OrderListActivity.this, R.string.order_load_failed, Toast.LENGTH_SHORT).show();
                    adapter.updateOrders(MockOrderDataProvider.getSampleOrders());
                });
            }
        });
    }

    private void openOrderDetail(MockOrder order) {
        Intent intent = new Intent(this, OrderDetailActivity.class);
        intent.putExtra(OrderDetailActivity.EXTRA_ORDER, order);
        startActivity(intent);
    }
}
