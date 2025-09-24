"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url?: string;
  allow_toppings: boolean;
}

interface Topping {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
}

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const [menuResponse, toppingsResponse] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('category', { ascending: true }),
        supabase
          .from('toppings')
          .select('*')
          .eq('is_available', true)
          .order('category', { ascending: true })
      ]);

      if (menuResponse.error) throw menuResponse.error;
      if (toppingsResponse.error) throw toppingsResponse.error;

      setMenuItems(menuResponse.data || []);
      setToppings(toppingsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const getAvailableToppings = (menuItem: MenuItem) => {
    return toppings.filter(topping => 
      topping.category === menuItem.category || 
      topping.category === 'General'
    );
  };

  const calculateTotalPrice = (menuItem: MenuItem, selectedToppings: {[key: string]: number}) => {
    let total = menuItem.price;
    Object.entries(selectedToppings).forEach(([toppingId, quantity]) => {
      const topping = toppings.find(t => t.id === toppingId);
      if (topping) {
        total += topping.price * quantity;
      }
    });
    return total;
  };

  const openToppingModal = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedToppings({});
  };

  const closeToppingModal = () => {
    setSelectedItem(null);
    setSelectedToppings({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-orange-600">🍽️</div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">Lhong Restaurant</h1>
                <p className="text-sm text-gray-600">Authentic Thai Cuisine</p>
              </div>
            </div>
            <Link 
              href="/login"
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to Lhong Restaurant
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Experience the authentic flavors of Thailand in every dish
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span>📍 123 Main Street, Bangkok</span>
            <span>📞 (02) 123-4567</span>
            <span>🕒 Open Daily 11:00 AM - 10:00 PM</span>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Menu</h3>
            <p className="text-gray-600">Fresh ingredients, authentic recipes, unforgettable taste</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-orange-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gradient-to-br from-orange-200 to-amber-300 flex items-center justify-center">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl text-orange-600">🍽️</div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xl font-semibold text-gray-900">{item.name}</h4>
                    <span className="text-2xl font-bold text-orange-600">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                    {item.allow_toppings && (
                      <button
                        onClick={() => openToppingModal(item)}
                        className="text-orange-600 hover:text-orange-700 text-xs font-medium"
                      >
                        + Add Toppings
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No items found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">Visit Us Today</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📍</div>
              <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
              <p className="text-gray-600">123 Main Street<br />Bangkok, Thailand 10110</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📞</div>
              <h4 className="font-semibold text-gray-900 mb-2">Phone</h4>
              <p className="text-gray-600">(02) 123-4567</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🕒</div>
              <h4 className="font-semibold text-gray-900 mb-2">Hours</h4>
              <p className="text-gray-600">Daily<br />11:00 AM - 10:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p>&copy; 2024 Lhong Restaurant. All rights reserved.</p>
        </div>
      </footer>

      {/* Topping Selection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Customize {selectedItem.name}
                </h3>
                <button
                  onClick={closeToppingModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  Base Price: ${selectedItem.price.toFixed(2)}
                </div>
                <div className="text-lg font-semibold text-orange-600">
                  Total: ${calculateTotalPrice(selectedItem, selectedToppings).toFixed(2)}
                </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {getAvailableToppings(selectedItem).map((topping) => (
                  <div key={topping.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{topping.name}</div>
                      <div className="text-sm text-gray-500">+${topping.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedToppings({
                          ...selectedToppings,
                          [topping.id]: Math.max(0, (selectedToppings[topping.id] || 0) - 1)
                        })}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{selectedToppings[topping.id] || 0}</span>
                      <button
                        onClick={() => setSelectedToppings({
                          ...selectedToppings,
                          [topping.id]: (selectedToppings[topping.id] || 0) + 1
                        })}
                        className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center hover:bg-orange-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {getAvailableToppings(selectedItem).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No toppings available for this item.
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closeToppingModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    toast.success(`Added ${selectedItem.name} with toppings to cart!`);
                    closeToppingModal();
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
