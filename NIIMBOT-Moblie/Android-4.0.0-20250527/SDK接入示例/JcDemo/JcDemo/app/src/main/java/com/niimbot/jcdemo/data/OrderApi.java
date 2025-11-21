package com.niimbot.jcdemo.data;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.GET;

public interface OrderApi {
    @GET("orders")
    Call<List<RemoteOrder>> getOrders();
}



