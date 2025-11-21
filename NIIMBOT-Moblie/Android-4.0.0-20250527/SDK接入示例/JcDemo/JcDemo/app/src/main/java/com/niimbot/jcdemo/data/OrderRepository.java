package com.niimbot.jcdemo.data;

import android.content.Context;

import com.niimbot.jcdemo.ui.orders.MockOrder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class OrderRepository {

    public interface OrderCallback {
        void onSuccess(List<MockOrder> orders);

        void onError(Throwable throwable);
    }

    private final OrderApi api;
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    public OrderRepository(Context context) {
        HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
        loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BASIC);

        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(new AssetOrderInterceptor(context))
                .addInterceptor(loggingInterceptor)
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("https://demo.petfreshfood.local/")
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        api = retrofit.create(OrderApi.class);
    }

    public void fetchOrders(OrderCallback callback) {
        executorService.execute(() -> {
            try {
                Response<List<RemoteOrder>> response = api.getOrders().execute();
                if (response.isSuccessful() && response.body() != null) {
                    callback.onSuccess(mapOrders(response.body()));
                } else {
                    callback.onError(new IOException("Unexpected response"));
                }
            } catch (Exception e) {
                callback.onError(e);
            }
        });
    }

    private List<MockOrder> mapOrders(List<RemoteOrder> remoteOrders) {
        if (remoteOrders == null || remoteOrders.isEmpty()) {
            return Collections.emptyList();
        }
        List<MockOrder> orders = new ArrayList<>();
        for (RemoteOrder remoteOrder : remoteOrders) {
            List<MockOrder.MockIngredient> ingredients = new ArrayList<>();
            if (remoteOrder.getIngredients() != null) {
                for (RemoteIngredient ingredient : remoteOrder.getIngredients()) {
                    ingredients.add(new MockOrder.MockIngredient(
                            safe(ingredient.getName()),
                            safe(ingredient.getRatio()),
                            safe(ingredient.getTotalAmount())
                    ));
                }
            }
            orders.add(new MockOrder(
                    safe(remoteOrder.getId()),
                    safe(remoteOrder.getOrderDate()),
                    safe(remoteOrder.getRecipeName()),
                    safe(remoteOrder.getPetName()),
                    safe(remoteOrder.getPerServingWeight()),
                    safe(remoteOrder.getTotalServings()),
                    ingredients
            ));
        }
        return orders;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}



