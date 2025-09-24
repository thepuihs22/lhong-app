-- Restaurant Management App Database Schema
-- Run these commands in your Supabase SQL Editor

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'admin')),
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create menu items table
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  allow_toppings BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create toppings table
CREATE TABLE toppings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on menu_items and toppings
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine-in', 'delivery')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  cancel_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create order items table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order item toppings table
CREATE TABLE order_item_toppings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  topping_id UUID REFERENCES toppings(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on order_items and order_item_toppings
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_toppings ENABLE ROW LEVEL SECURITY;

-- Create expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create purchases table
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Menu items policies (public read, admin write)
CREATE POLICY "Anyone can view menu items" ON menu_items
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert menu items" ON menu_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update menu items" ON menu_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Toppings policies (public read, admin write)
CREATE POLICY "Anyone can view toppings" ON toppings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert toppings" ON toppings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update toppings" ON toppings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Orders policies
CREATE POLICY "Staff and admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff and admins can create orders" ON orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff and admins can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Order items policies
CREATE POLICY "Staff and admins can view order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff and admins can create order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Order item toppings policies
CREATE POLICY "Staff and admins can view order item toppings" ON order_item_toppings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff and admins can create order item toppings" ON order_item_toppings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Expenses policies (admin only)
CREATE POLICY "Only admins can view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can create expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update expenses" ON expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Purchases policies (admin only)
CREATE POLICY "Only admins can view purchases" ON purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can create purchases" ON purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update purchases" ON purchases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Functions and triggers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name)
  VALUES (NEW.id, NEW.email, 'staff', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, allow_toppings) VALUES
('Margherita Pizza', 'Classic tomato sauce, mozzarella, and fresh basil', 12.99, 'Pizza', true),
('Pepperoni Pizza', 'Tomato sauce, mozzarella, and pepperoni', 14.99, 'Pizza', true),
('Caesar Salad', 'Romaine lettuce, parmesan cheese, croutons, caesar dressing', 8.99, 'Salads', true),
('Chicken Wings', 'Crispy wings with your choice of sauce', 10.99, 'Appetizers', false),
('Pasta Carbonara', 'Creamy pasta with bacon and parmesan', 13.99, 'Pasta', true),
('Grilled Salmon', 'Fresh salmon with lemon herb butter', 18.99, 'Main Course', true),
('Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 6.99, 'Desserts', false),
('Coca Cola', 'Refreshing cola drink', 2.99, 'Beverages', false),
('Fresh Orange Juice', 'Freshly squeezed orange juice', 3.99, 'Beverages', false),
('Coffee', 'Freshly brewed coffee', 2.49, 'Beverages', true);

-- Insert sample toppings
INSERT INTO toppings (name, price, category) VALUES
-- Pizza toppings
('Extra Cheese', 2.00, 'Pizza'),
('Pepperoni', 2.50, 'Pizza'),
('Mushrooms', 1.50, 'Pizza'),
('Bell Peppers', 1.00, 'Pizza'),
('Onions', 1.00, 'Pizza'),
('Olives', 1.50, 'Pizza'),
('Bacon', 2.50, 'Pizza'),
('Sausage', 2.00, 'Pizza'),

-- Salad toppings
('Grilled Chicken', 3.00, 'Salad'),
('Avocado', 2.00, 'Salad'),
('Cherry Tomatoes', 1.00, 'Salad'),
('Cucumber', 0.50, 'Salad'),
('Croutons', 0.50, 'Salad'),
('Extra Dressing', 0.50, 'Salad'),

-- Pasta toppings
('Extra Parmesan', 1.00, 'Pasta'),
('Garlic Bread', 2.00, 'Pasta'),
('Side Salad', 3.00, 'Pasta'),

-- Main Course toppings
('Extra Sauce', 1.00, 'Main Course'),
('Side Rice', 2.00, 'Main Course'),
('Steamed Vegetables', 2.50, 'Main Course'),

-- Coffee toppings
('Extra Shot', 0.75, 'Coffee'),
('Oat Milk', 0.50, 'Coffee'),
('Almond Milk', 0.50, 'Coffee'),
('Soy Milk', 0.50, 'Coffee'),
('Whipped Cream', 0.75, 'Coffee'),
('Vanilla Syrup', 0.50, 'Coffee'),
('Caramel Syrup', 0.50, 'Coffee');

-- Create admin user (you'll need to sign up first, then update the role)
-- After creating your first user account, run this to make them admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
