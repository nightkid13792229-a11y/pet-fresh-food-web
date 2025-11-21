package com.niimbot.jcdemo.data;

import android.content.Context;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class AssetOrderInterceptor implements Interceptor {

    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");
    private final Context appContext;

    public AssetOrderInterceptor(Context context) {
        this.appContext = context.getApplicationContext();
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        if (!"GET".equalsIgnoreCase(request.method())) {
            return chain.proceed(request);
        }
        String path = request.url().encodedPath();
        if (!path.endsWith("/orders")) {
            return chain.proceed(request);
        }

        String json = loadJson("data/orders.json");
        ResponseBody body = ResponseBody.create(json, JSON_MEDIA_TYPE);

        return new Response.Builder()
                .code(200)
                .message("OK")
                .protocol(Protocol.HTTP_1_1)
                .request(request)
                .body(body)
                .build();
    }

    private String loadJson(String assetPath) throws IOException {
        try (InputStream inputStream = appContext.getAssets().open(assetPath)) {
            byte[] buffer = new byte[inputStream.available()];
            int read = inputStream.read(buffer);
            if (read <= 0) {
                return "[]";
            }
            return new String(buffer, StandardCharsets.UTF_8);
        }
    }
}



