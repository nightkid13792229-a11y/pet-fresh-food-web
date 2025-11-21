package com.niimbot.jcdemo.ui.orders;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.niimbot.jcdemo.R;

import java.util.List;

public class OrderListAdapter extends RecyclerView.Adapter<OrderListAdapter.OrderViewHolder> {

    public interface OnOrderClickListener {
        void onOrderClick(MockOrder order);
    }

    private final List<MockOrder> orders;
    private final OnOrderClickListener listener;

    public OrderListAdapter(List<MockOrder> orders, OnOrderClickListener listener) {
        this.orders = orders;
        this.listener = listener;
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_order, parent, false);
        return new OrderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        MockOrder order = orders.get(position);
        holder.recipeName.setText(order.getRecipeName());
        holder.orderDate.setText(holder.itemView.getContext().getString(R.string.order_date_label, order.getOrderDate()));
        holder.petName.setText(holder.itemView.getContext().getString(R.string.pet_name_label, order.getPetName()));
        holder.detailButton.setOnClickListener(v -> listener.onOrderClick(order));
    }

    @Override
    public int getItemCount() {
        return orders.size();
    }

    public void updateOrders(List<MockOrder> newOrders) {
        orders.clear();
        orders.addAll(newOrders);
        notifyDataSetChanged();
    }

    static class OrderViewHolder extends RecyclerView.ViewHolder {
        final TextView recipeName;
        final TextView orderDate;
        final TextView petName;
        final Button detailButton;

        OrderViewHolder(@NonNull View itemView) {
            super(itemView);
            recipeName = itemView.findViewById(R.id.tv_recipe_name);
            orderDate = itemView.findViewById(R.id.tv_order_date);
            petName = itemView.findViewById(R.id.tv_pet_name);
            detailButton = itemView.findViewById(R.id.btn_view_detail);
        }
    }
}

