package com.niimbot.jcdemo.data;

import java.util.List;

public class RemoteOrder {
    private String id;
    private String orderDate;
    private String recipeName;
    private String petName;
    private String perServingWeight;
    private String totalServings;
    private List<RemoteIngredient> ingredients;

    public String getId() {
        return id;
    }

    public String getOrderDate() {
        return orderDate;
    }

    public String getRecipeName() {
        return recipeName;
    }

    public String getPetName() {
        return petName;
    }

    public String getPerServingWeight() {
        return perServingWeight;
    }

    public String getTotalServings() {
        return totalServings;
    }

    public List<RemoteIngredient> getIngredients() {
        return ingredients;
    }
}



