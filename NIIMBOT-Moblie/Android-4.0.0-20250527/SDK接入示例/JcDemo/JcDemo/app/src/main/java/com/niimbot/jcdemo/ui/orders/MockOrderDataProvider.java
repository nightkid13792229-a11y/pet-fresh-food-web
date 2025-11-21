package com.niimbot.jcdemo.ui.orders;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class MockOrderDataProvider {

    private MockOrderDataProvider() {
    }

    public static List<MockOrder> getSampleOrders() {
        List<MockOrder> orders = new ArrayList<>();
        orders.add(new MockOrder(
                "ORDER-20251109-001",
                "2025-11-09",
                "蔡麦南瓜鸡腿牛肉",
                "布丁",
                "80g",
                "14份",
                Arrays.asList(
                        new MockOrder.MockIngredient("鸡腿肉", "40%", "80g"),
                        new MockOrder.MockIngredient("麸皮", "12%", "24g"),
                        new MockOrder.MockIngredient("南瓜", "20%", "40g"),
                        new MockOrder.MockIngredient("胡萝卜", "10%", "20g"),
                        new MockOrder.MockIngredient("西兰花", "8%", "16g"),
                        new MockOrder.MockIngredient("三文鱼油", "5%", "10g"),
                        new MockOrder.MockIngredient("益生菌粉", "3%", "6g"),
                        new MockOrder.MockIngredient("复合维生素", "2%", "4g")
                )
        ));

        orders.add(new MockOrder(
                "ORDER-20251111-002",
                "2025-11-11",
                "低脂牛肉紫薯粮",
                "球球",
                "100g",
                "10份",
                Arrays.asList(
                        new MockOrder.MockIngredient("牛后腿肉", "45%", "100g"),
                        new MockOrder.MockIngredient("紫薯", "18%", "40g"),
                        new MockOrder.MockIngredient("西葫芦", "15%", "33g"),
                        new MockOrder.MockIngredient("鸡蛋", "12%", "27g"),
                        new MockOrder.MockIngredient("亚麻籽油", "5%", "11g"),
                        new MockOrder.MockIngredient("钙粉", "5%", "11g")
                )
        ));

        return orders;
    }
}



