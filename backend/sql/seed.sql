-- Seed data for development and testing

INSERT INTO users (email, password_hash, name, role)
VALUES
  ('admin@petfresh.local', '$2a$10$123456789012345678901uWkLXve1mET3zKekJy5oQ1OtSWT8g2W', 'Admin User', 'admin'),
  ('chef@petfresh.local', '$2a$10$123456789012345678901uWkLXve1mET3zKekJy5oQ1OtSWT8g2W', 'Kitchen Staff', 'employee'),
  ('customer@petfresh.local', '$2a$10$123456789012345678901uWkLXve1mET3zKekJy5oQ1OtSWT8g2W', 'Happy Customer', 'customer')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO recipes (name, description, life_stage, recipe_type, base_price, default_servings)
VALUES
  ('Beef Delight', 'High protein beef recipe', 'adult', 'standard', 199.00, 14),
  ('Chicken Lite', 'Lean chicken for weight control', 'adult', 'diet', 189.00, 14)
ON DUPLICATE KEY UPDATE description = VALUES(description);



