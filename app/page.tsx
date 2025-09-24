"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-amber-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-4xl font-bold text-amber-700"></div>
              <div className="ml-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 bg-clip-text text-transparent">
                Lhong
                </h1>
                <p className="text-sm text-amber-600 font-medium"></p>
              </div>
            </div>
            <Link 
              href="/login"
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-3 rounded-full hover:from-amber-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* <section className="relative py-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/30 via-transparent to-red-100/30"></div>
        <div className="absolute top-10 left-10 w-20 h-20 bg-orange-200/50 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-red-200/50 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-200/50 rounded-full blur-lg"></div>
        
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="mb-8">
            <div className="inline-block px-6 py-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-full text-orange-800 font-semibold text-sm mb-6">
              ✨ Authentic Thai Experience
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-8">
            <span className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to Lhong
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
            Experience the authentic flavors of Thailand in every dish. 
            <span className="text-orange-600 font-semibold"> Fresh ingredients</span>, 
            <span className="text-red-600 font-semibold"> traditional recipes</span>, 
            <span className="text-pink-600 font-semibold"> unforgettable taste</span>.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <span className="text-orange-600 mr-2">📍</span>
              <span className="text-gray-700 font-medium">123 Main Street, Bangkok</span>
            </div>
            <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <span className="text-red-600 mr-2">📞</span>
              <span className="text-gray-700 font-medium">(02) 123-4567</span>
            </div>
            <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <span className="text-pink-600 mr-2">🕒</span>
              <span className="text-gray-700 font-medium">Daily 11:00 AM - 10:00 PM</span>
            </div>
          </div>
        </div>
      </section> */}

      {/* Menu Section */}
      <section className="py-20 relative">
        {/* Background decoration - trendy cafe vibes */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-50/20 to-stone-50/30"></div>
        <div className="absolute top-20 left-10 w-16 h-16 bg-amber-200/40 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-orange-200/40 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-stone-200/40 rounded-full blur-lg"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full text-amber-800 font-bold text-sm mb-6 shadow-lg">
              Our Signature Cook & Bites
            </div>
            <h3 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 bg-clip-text text-transparent">
                Lhong Menu
              </span>
            </h3>
            <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
              Handcrafted cook and mixed made with love. 
              <span className="text-amber-700 font-semibold"> Fresh Ingredients</span>, 
              <span className="text-orange-600 font-semibold"> Homemade Sauce</span>.
            </p>
          </div>

          {/* Category Filter - trendy cafe style */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-8 py-4 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xl shadow-amber-500/30'
                    : 'bg-white/90 backdrop-blur-sm text-stone-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 shadow-lg hover:shadow-xl border border-amber-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu Items Grid - Trendy Cafe Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="group bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-3 border border-amber-100/60"
              >
                {/* Image Container - Instagram worthy */}
                <div className="relative h-64 overflow-hidden">
                  {item.image_url ? (
                    <Image 
                      src={item.image_url} 
                      alt={item.name}
                      width={400}
                      height={256}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 flex items-center justify-center">
                      <div className="text-9xl text-amber-600 group-hover:scale-110 transition-transform duration-500">🦐</div>
                    </div>
                  )}
                  
                  {/* Trendy overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Price badge - trendy style */}
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-xl backdrop-blur-sm">
                    {item.price.toFixed(2)}
                  </div>
                  
                  {/* Category badge - cafe style */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-amber-700 px-4 py-2 rounded-2xl text-xs font-bold shadow-lg border border-amber-200">
                    {item.category}
                  </div>
                  
                  {/* Trendy coffee bean decoration */}
                  <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="text-2xl"></div>
                  </div>
                </div>
                
                {/* Content - trendy cafe typography */}
                <div className="p-6">
                  <h4 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-amber-700 transition-colors duration-300">
                    {item.name}
                  </h4>
                  <p className="text-stone-600 text-sm mb-6 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                  
                  {/* Trendy action area */}
                  {/* <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 bg-amber-100 text-amber-600 rounded-full hover:bg-amber-200 transition-colors duration-300 hover:scale-110">
                        ❤️
                      </button>
                      <button className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-colors duration-300 hover:scale-110">
                        📸
                      </button>
                    </div>
                    <button
                      onClick={() => openToppingModal(item)}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-full font-bold hover:from-amber-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Order
                    </button>
                  </div> */}
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

      {/* Contact Section - Trendy Cafe Style */}
      <section className="relative py-24 bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 overflow-hidden">
        {/* Trendy cafe background decorations */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-orange-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-stone-200/40 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-amber-300/30 rounded-full blur-xl"></div>
        
        <div className="max-w-6xl mx-auto px-4 text-center relative">
          <div className="mb-16">
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full text-amber-800 font-bold text-sm mb-8 shadow-lg">
              Visit Our Booth
            </div>
            <h3 className="text-5xl md:text-6xl font-bold mb-8">
              <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 bg-clip-text text-transparent">
                Grap & Go
              </span>
            </h3>
            {/* <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
              We're waiting to welcome you with 
              <span className="text-amber-700 font-semibold"> warm coffee</span>, 
              <span className="text-orange-600 font-semibold"> cozy vibes</span>, and 
              <span className="text-amber-800 font-semibold"> good times</span>
            </p> */}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 border border-amber-100/60">
              <div className="text-7xl mb-6 group-hover:scale-110 transition-transform duration-500">📍</div>
              <h4 className="text-2xl font-bold text-stone-800 mb-4">Location</h4>
              <p className="text-stone-600 leading-relaxed">
                Kanlapaphruek Street<br />
                Bangkok, Thailand 10110<br />
                <span className="text-amber-700 font-bold">Near Kanlapaphruek Market</span>
              </p>
            </div>
            
            <div className="group bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 border border-orange-100/60">
              <div className="text-7xl mb-6 group-hover:scale-110 transition-transform duration-500">📞</div>
              <h4 className="text-2xl font-bold text-stone-800 mb-4">Phone</h4>
              <p className="text-stone-600 leading-relaxed">
                <span className="text-orange-600 font-bold text-xl">(091) 142-1142</span><br />
                <span className="text-sm text-amber-600">Call for orders & reservations</span>
              </p>
            </div>
            
            <div className="group bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 border border-amber-100/60">
              <div className="text-7xl mb-6 group-hover:scale-110 transition-transform duration-500">🕒</div>
              <h4 className="text-2xl font-bold text-stone-800 mb-4">Hours</h4>
              <p className="text-stone-600 leading-relaxed">
                <span className="text-amber-700 font-bold">Daily</span><br />
                11:00 AM - 06:00 PM<br />
                <span className="text-sm text-amber-600">Last order: 06:00 PM</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Modern Cafe Style */}
      <footer className="relative bg-stone-900 text-white py-16 overflow-hidden">
        {/* Subtle modern background */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-800 to-stone-900"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-400"></div>
        <div className="absolute top-20 left-20 w-16 h-16 bg-amber-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-orange-400/10 rounded-full blur-2xl"></div>
        
        <div className="max-w-6xl mx-auto px-4 text-center relative">
          <div className="mb-12">
            <div className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Lhong Menu
              </span>
            </div>
            <p className="text-stone-300 text-xl mb-8">
              Homemade Sauce • Fresh Ingredients
            </p>
            <div className="flex justify-center space-x-8 text-3xl mb-8">
              <span className="hover:text-amber-400 transition-colors duration-300 cursor-pointer hover:scale-110 transform">📱</span>
              <span className="hover:text-orange-400 transition-colors duration-300 cursor-pointer hover:scale-110 transform">📧</span>
              <span className="hover:text-amber-300 transition-colors duration-300 cursor-pointer hover:scale-110 transform">🌐</span>
              <span className="hover:text-orange-300 transition-colors duration-300 cursor-pointer hover:scale-110 transform">📸</span>
            </div>
          </div>
          <div className="border-t border-stone-700 pt-8">
            <p className="text-stone-400 text-lg">
              &copy; 2025 Lhong Menu. All rights reserved. | 
              <span className="text-amber-400 ml-2 font-semibold">Made with ☕ by Pui</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Topping Selection Modal - Trendy Cafe Style */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-amber-100/60">
            {/* Header - Trendy Cafe Style */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-8 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-2">
                    Customize {selectedItem.name}
                  </h3>
                  <p className="text-amber-100 text-base">
                    ☕ Make it your own with our premium add-ons
                  </p>
                </div>
                <button
                  onClick={closeToppingModal}
                  className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-300 hover:scale-110 transform"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Price Display - Trendy Cafe Style */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 mb-8 border border-amber-100 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-stone-600 mb-2 font-semibold">Base Price</div>
                    <div className="text-xl font-bold text-stone-800">
                      ฿{selectedItem.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-stone-600 mb-2 font-semibold">Total</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      ฿{calculateTotalPrice(selectedItem, selectedToppings).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Toppings List - Trendy Cafe Style */}
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {getAvailableToppings(selectedItem).map((topping) => (
                  <div key={topping.id} className="flex items-center justify-between p-6 bg-white border border-amber-100 rounded-3xl hover:border-amber-200 hover:shadow-xl transition-all duration-500 shadow-lg">
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 mb-2 text-lg">{topping.name}</div>
                      <div className="text-sm text-amber-600 font-semibold">+฿{topping.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setSelectedToppings({
                          ...selectedToppings,
                          [topping.id]: Math.max(0, (selectedToppings[topping.id] || 0) - 1)
                        })}
                        className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors duration-300 text-stone-600 font-bold hover:scale-110 transform"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold text-stone-800 text-lg">
                        {selectedToppings[topping.id] || 0}
                      </span>
                      <button
                        onClick={() => setSelectedToppings({
                          ...selectedToppings,
                          [topping.id]: (selectedToppings[topping.id] || 0) + 1
                        })}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center hover:from-amber-600 hover:to-orange-600 transition-all duration-300 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-110 transform"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {getAvailableToppings(selectedItem).length === 0 && (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">☕</div>
                  <p className="text-stone-500 text-xl">No add-ons available for this item.</p>
                </div>
              )}

              {/* Action Buttons - Trendy Cafe Style */}
              <div className="flex justify-end space-x-6 pt-8 border-t border-amber-100">
                <button
                  onClick={closeToppingModal}
                  className="px-8 py-4 border border-stone-300 rounded-full text-stone-700 hover:bg-stone-50 transition-all duration-300 font-bold hover:scale-105 transform"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success(`Added ${selectedItem.name} with add-ons to cart!`);
                    closeToppingModal();
                  }}
                  className="px-10 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full hover:from-amber-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl font-bold"
                >
                  ☕ Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
