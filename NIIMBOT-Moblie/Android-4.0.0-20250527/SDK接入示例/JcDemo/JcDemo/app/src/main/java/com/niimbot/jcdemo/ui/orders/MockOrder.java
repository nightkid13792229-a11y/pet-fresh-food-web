package com.niimbot.jcdemo.ui.orders;

import java.io.Serializable;
import java.util.List;

public class MockOrder implements Serializable {

    private final String id;
    private final String orderDate;
    private final String recipeName;
    private final String petName;
    private final String perServingWeight;
    private final String totalServings;
    private final List<MockIngredient> ingredients;

    public MockOrder(String id,
                     String orderDate,
                     String recipeName,
                     String petName,
                     String perServingWeight,
                     String totalServings,
                     List<MockIngredient> ingredients) {
        this.id = id;
        this.orderDate = orderDate;
        this.recipeName = recipeName;
        this.petName = petName;
        this.perServingWeight = perServingWeight;
        this.totalServings = totalServings;
        this.ingredients = ingredients;
    }

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

    public List<MockIngredient> getIngredients() {
        return ingredients;
    }

    public static class MockIngredient implements Serializable {
        private final String name;
        private final String ratio;
        private final String totalAmount;

        public MockIngredient(String name, String ratio, String totalAmount) {
            this.name = name;
            this.ratio = ratio;
            this.totalAmount = totalAmount;
        }

        public String getName() {
            return name;
        }

        public String getRatio() {
            return ratio;
        }

        public String getTotalAmount() {
            return totalAmount;
        }
    }
}



