"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  allow_toppings: boolean;
}

interface Topping {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string;
  menu_item?: MenuItem;
  order_item_toppings?: OrderItemTopping[];
}

interface OrderItemTopping {
  id: string;
  topping_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  topping?: Topping;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: 'dine-in' | 'delivery';
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total_amount: number;
  notes: string;
  cancel_reason?: string;
  created_at: string;
  order_items: OrderItem[];
}

export default function StaffOrdersPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_phone: '',
    order_type: 'dine-in' as 'dine-in' | 'delivery',
    notes: '',
  });
  const [selectedItems, setSelectedItems] = useState<{[key: string]: number}>({});
  const [selectedToppings, setSelectedToppings] = useState<{[key: string]: {[key: string]: number}}>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine-in' | 'delivery'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('all');
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'staff') {
      router.push('/login');
      return;
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [menuResponse, toppingsResponse, ordersResponse] = await Promise.all([
        supabase.from('menu_items').select('*').eq('is_available', true),
        supabase.from('toppings').select('*').eq('is_available', true),
        supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              menu_item:menu_items (*),
              order_item_toppings (
                *,
                topping:toppings (*)
              )
            )
          `)
          .order('created_at', { ascending: false })
      ]);

      if (menuResponse.error) throw menuResponse.error;
      if (toppingsResponse.error) throw toppingsResponse.error;
      if (ordersResponse.error) throw ordersResponse.error;

      setMenuItems(menuResponse.data || []);
      setToppings(toppingsResponse.data || []);
      setOrders(ordersResponse.data || []);
      
      // Debug: Log the first order to see the structure
      if (ordersResponse.data && ordersResponse.data.length > 0) {
        console.log('First order structure:', JSON.stringify(ordersResponse.data[0], null, 2));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [checkAuth, fetchData]);

  const generateOrderNumber = () => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `ORD-${timestamp}`;
  };

  const handleCreateOrder = async () => {
    if (!newOrder.customer_name.trim()) {
      toast.error('กรุณากรอกชื่อลูกค้า');
      return;
    }

    const selectedItemsList = Object.entries(selectedItems)
      .filter(([_, quantity]) => quantity > 0)
      .map(([menuItemId, quantity]) => {
        const menuItem = menuItems.find(item => item.id === menuItemId);
        let itemTotal = (menuItem?.price || 0) * quantity;
        
        // Add topping costs
        const itemToppings = selectedToppings[menuItemId] || {};
        Object.entries(itemToppings).forEach(([toppingId, toppingQuantity]) => {
          const topping = toppings.find(t => t.id === toppingId);
          if (topping && toppingQuantity > 0) {
            itemTotal += topping.price * toppingQuantity * quantity;
          }
        });

        return {
          menu_item_id: menuItemId,
          quantity,
          unit_price: menuItem?.price || 0,
          total_price: itemTotal,
        };
      });

    if (selectedItemsList.length === 0) {
      toast.error('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
      return;
    }

    const totalAmount = selectedItemsList.reduce((sum, item) => sum + item.total_price, 0);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: generateOrderNumber(),
          customer_name: newOrder.customer_name,
          customer_phone: newOrder.customer_phone,
          order_type: newOrder.order_type,
          total_amount: totalAmount,
          notes: newOrder.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = selectedItemsList.map(item => ({
        ...item,
        order_id: orderData.id,
      }));

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select();

      if (itemsError) throw itemsError;

      // Create order item toppings
      const toppingData: Array<{
        order_item_id: string;
        topping_id: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }> = [];
      Object.entries(selectedToppings).forEach(([menuItemId, itemToppings]) => {
        const orderItem = orderItems?.find(item => item.menu_item_id === menuItemId);
        if (orderItem) {
          Object.entries(itemToppings).forEach(([toppingId, toppingQuantity]) => {
            const topping = toppings.find(t => t.id === toppingId);
            if (topping && toppingQuantity > 0) {
              toppingData.push({
                order_item_id: orderItem.id,
                topping_id: toppingId,
                quantity: toppingQuantity,
                unit_price: topping.price,
                total_price: topping.price * toppingQuantity,
              });
            }
          });
        }
      });

      if (toppingData.length > 0) {
        const { error: toppingsError } = await supabase
          .from('order_item_toppings')
          .insert(toppingData);

        if (toppingsError) throw toppingsError;
      }

      toast.success('สร้างออเดอร์สำเร็จ!');
      setShowNewOrderForm(false);
      setNewOrder({
        customer_name: '',
        customer_phone: '',
        order_type: 'dine-in',
        notes: '',
      });
      setSelectedItems({});
      setSelectedToppings({});
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'สร้างออเดอร์ไม่สำเร็จ');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('อัปเดตสถานะออเดอร์สำเร็จ!');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'อัปเดตออเดอร์ไม่สำเร็จ');
    }
  };

  const cancelOrderWithReason = async (orderId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancel_reason: reason
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('ยกเลิกออเดอร์สำเร็จ!');
      setShowCancelModal(false);
      setCancelReason('');
      setOrderToCancel(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'ยกเลิกออเดอร์ไม่สำเร็จ');
    }
  };

  const openCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelReason('');
    setOrderToCancel(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailableToppings = (menuItem: MenuItem) => {
    return toppings.filter(topping => 
      topping.category === menuItem.category || 
      topping.category === 'General'
    );
  };

  const calculateItemTotal = (menuItem: MenuItem, quantity: number) => {
    let total = menuItem.price * quantity;
    const itemToppings = selectedToppings[menuItem.id] || {};
    Object.entries(itemToppings).forEach(([toppingId, toppingQuantity]) => {
      const topping = toppings.find(t => t.id === toppingId);
      if (topping && toppingQuantity > 0) {
        total += topping.price * toppingQuantity * quantity;
      }
    });
    return total;
  };

  const openOrderDetails = (order: Order) => {
    console.log('Opening order details for:', order.order_number);
    console.log('Order items:', order.order_items);
    if (order.order_items && order.order_items.length > 0) {
      console.log('First order item toppings:', order.order_items[0].order_item_toppings);
    }
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
  };

  // Filter orders based on search and filter criteria
  const filteredOrders = orders.filter(order => {
    // Search filter (name or phone)
    const matchesSearch = searchTerm === '' || 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_phone && order.customer_phone.includes(searchTerm));
    
    // Order type filter
    const matchesOrderType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesOrderType && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setOrderTypeFilter('all');
    setStatusFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-secondary">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-secondary">🍽️</div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">แดชบอร์ดพนักงาน</h1>
                <p className="text-sm text-gray-600">จัดการออเดอร์</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowNewOrderForm(true)}
                className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary-600 transition-colors"
              >
                ออเดอร์ใหม่
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Controls */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค้นหาลูกค้า
              </label>
              <input
                type="text"
                placeholder="ชื่อหรือเบอร์โทรศัพท์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
              />
            </div>

            {/* Order Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทออเดอร์
              </label>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value as 'all' | 'dine-in' | 'delivery')}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
              >
                <option value="all">ทุกประเภท</option>
                <option value="dine-in">ทานที่ร้าน</option>
                <option value="delivery">ส่งอาหาร</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled')}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="preparing">กำลังเตรียม</option>
                <option value="ready">พร้อมเสิร์ฟ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            แสดง {filteredOrders.length} จาก {orders.length} ออเดอร์
            {(searchTerm || orderTypeFilter !== 'all' || statusFilter !== 'all') && (
              <span className="ml-2 text-secondary">
                (กรองแล้ว)
              </span>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">ออเดอร์ล่าสุด</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขที่ออเดอร์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ลูกค้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={() => openOrderDetails(order)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {order.order_number}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        {order.customer_phone && (
                          <div className="text-gray-500">{order.customer_phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.order_type === 'dine-in' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.order_type === 'dine-in' ? 'ทานที่ร้าน' : 'ส่งอาหาร'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status === 'pending' ? 'รอดำเนินการ' : order.status === 'preparing' ? 'กำลังเตรียม' : order.status === 'ready' ? 'พร้อมเสิร์ฟ' : order.status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <span className="mr-1">▶️</span>
                            เริ่มทำอาหาร
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            <span className="mr-1">✅</span>
                            ทำเสร็จแล้ว
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
                          >
                            <span className="mr-1">🏁</span>
                            เสร็จสิ้นออเดอร์
                          </button>
                        )}
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => openCancelModal(order)}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                          >
                            <span className="mr-1">❌</span>
                            ยกเลิกออเดอร์
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">
                {orders.length === 0 ? 'ไม่พบออเดอร์' : 'ไม่มีออเดอร์ที่ตรงกับตัวกรอง'}
              </div>
              {orders.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-secondary hover:text-secondary-600 text-sm"
                >
                  ล้างตัวกรองเพื่อดูออเดอร์ทั้งหมด
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Order Modal */}
      {showNewOrderForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">สร้างออเดอร์ใหม่</h3>
                <button
                  onClick={() => setShowNewOrderForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อลูกค้า *</label>
                    <input
                      type="text"
                      value={newOrder.customer_name}
                      onChange={(e) => setNewOrder({...newOrder, customer_name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={newOrder.customer_phone}
                      onChange={(e) => setNewOrder({...newOrder, customer_phone: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">ประเภทออเดอร์</label>
                  <select
                    value={newOrder.order_type}
                    onChange={(e) => setNewOrder({...newOrder, order_type: e.target.value as 'dine-in' | 'delivery'})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="dine-in">ทานที่ร้าน</option>
                    <option value="delivery">ส่งอาหาร</option>
                  </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">รายการอาหาร</label>
                  <div className="grid grid-cols-1 gap-4 max-h-60 overflow-y-auto">
                    {menuItems.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              ${item.price.toFixed(2)}
                              {selectedItems[item.id] > 0 && (
                                <span className="ml-2 text-secondary font-medium">
                                  รวม: ${calculateItemTotal(item, selectedItems[item.id] || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedItems({
                                ...selectedItems,
                                [item.id]: Math.max(0, (selectedItems[item.id] || 0) - 1)
                              })}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{selectedItems[item.id] || 0}</span>
                            <button
                              onClick={() => setSelectedItems({
                                ...selectedItems,
                                [item.id]: (selectedItems[item.id] || 0) + 1
                              })}
                              className="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center hover:bg-secondary-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        {/* Toppings for this item */}
                        {item.allow_toppings && selectedItems[item.id] > 0 && (
                          <div className="mt-2 pl-4 border-l-2 border-secondary-200">
                            <div className="text-xs font-medium text-gray-700 mb-1">ท็อปปิ้ง:</div>
                            <div className="space-y-1">
                              {getAvailableToppings(item).map((topping) => (
                                <div key={topping.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">{topping.name} (+${topping.price.toFixed(2)})</span>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => setSelectedToppings({
                                        ...selectedToppings,
                                        [item.id]: {
                                          ...selectedToppings[item.id],
                                          [topping.id]: Math.max(0, (selectedToppings[item.id]?.[topping.id] || 0) - 1)
                                        }
                                      })}
                                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center">{selectedToppings[item.id]?.[topping.id] || 0}</span>
                                    <button
                                      onClick={() => setSelectedToppings({
                                        ...selectedToppings,
                                        [item.id]: {
                                          ...selectedToppings[item.id],
                                          [topping.id]: (selectedToppings[item.id]?.[topping.id] || 0) + 1
                                        }
                                      })}
                                      className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center hover:bg-secondary-200"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewOrderForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-600"
                  >
                    สร้างออเดอร์
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  รายละเอียดออเดอร์ - {selectedOrder.order_number}
                </h3>
                <button
                  onClick={closeOrderDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-700">ลูกค้า</div>
                  <div className="text-gray-900">{selectedOrder.customer_name}</div>
                  {selectedOrder.customer_phone && (
                    <div className="text-sm text-gray-600">{selectedOrder.customer_phone}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">ประเภทออเดอร์</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedOrder.order_type === 'dine-in' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedOrder.order_type === 'dine-in' ? 'ทานที่ร้าน' : 'ส่งอาหาร'}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">สถานะ</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status === 'pending' ? 'รอดำเนินการ' : selectedOrder.status === 'preparing' ? 'กำลังเตรียม' : selectedOrder.status === 'ready' ? 'พร้อมเสิร์ฟ' : selectedOrder.status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก'}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">ยอดรวม</div>
                  <div className="text-lg font-bold text-secondary">${selectedOrder.total_amount.toFixed(2)}</div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">รายการอาหาร</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {item.menu_item?.name} × {item.quantity}
                          </div>
                          <div className="text-sm text-gray-600">
                            ราคาพื้นฐาน: ${item.unit_price.toFixed(2)} ต่อชิ้น
                          </div>
                          {item.special_instructions && (
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="font-medium">หมายเหตุ:</span> {item.special_instructions}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ${item.total_price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Toppings */}
                      {item.order_item_toppings && item.order_item_toppings.length > 0 ? (
                        <div className="mt-2 pl-4 border-l-2 border-orange-200">
                          <div className="text-sm font-medium text-gray-700 mb-1">ท็อปปิ้ง:</div>
                          <div className="space-y-1">
                            {item.order_item_toppings.map((topping) => (
                              <div key={topping.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">
                                  {topping.topping?.name} × {topping.quantity}
                                </span>
                                <span className="text-gray-900">
                                  +${topping.total_price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200">
                          <div className="text-sm text-gray-500">ไม่มีท็อปปิ้ง</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.notes && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">หมายเหตุออเดอร์:</div>
                  <div className="text-sm text-gray-600">{selectedOrder.notes}</div>
                </div>
              )}

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>ยอดรวมออเดอร์:</span>
                  <span className="text-secondary">${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  สั่งออเดอร์เมื่อ: {new Date(selectedOrder.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closeOrderDetails}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">ยกเลิกออเดอร์</h3>
                <button
                  onClick={closeCancelModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  คุณแน่ใจหรือไม่ว่าต้องการยกเลิกออเดอร์ <strong>{orderToCancel.order_number}</strong>?
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  ลูกค้า: {orderToCancel.customer_name}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เหตุผลในการยกเลิก *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="กรุณาระบุเหตุผลในการยกเลิกออเดอร์นี้..."
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeCancelModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  เก็บออเดอร์ไว้
                </button>
                <button
                  onClick={() => cancelOrderWithReason(orderToCancel.id, cancelReason)}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  ยกเลิกออเดอร์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
