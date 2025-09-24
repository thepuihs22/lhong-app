"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

interface OrderItemTopping {
  id: string;
  topping_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  topping?: {
    id: string;
    name: string;
    price: number;
    category: string;
    is_available: boolean;
  };
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string;
  menu_item?: {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    is_available: boolean;
    allow_toppings: boolean;
  };
  order_item_toppings?: OrderItemTopping[];
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

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine-in' | 'delivery'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const router = useRouter();

  const validateDateRange = (start: string, end: string) => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 31; // Maximum 1 month (31 days)
  };

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

    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      // Validate date range
      if (!validateDateRange(startDate, endDate)) {
        toast.error('Date range cannot exceed 1 month');
        return;
      }

      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (*)
          )
        `)
        .gte('created_at', startDateObj.toISOString())
        .lte('created_at', endDateObj.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);

      // Calculate stats
      const totalOrders = ordersData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const pendingOrders = ordersData?.filter(order => ['pending', 'preparing', 'ready'].includes(order.status)).length || 0;
      const completedOrders = ordersData?.filter(order => order.status === 'completed').length || 0;

      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [checkAuth, fetchData]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order status updated!');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order');
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

      toast.success('Order cancelled successfully!');
      setShowCancelModal(false);
      setCancelReason('');
      setOrderToCancel(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
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

  const openOrderDetails = (order: Order) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600">Loading...</p>
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
              <div className="text-2xl font-bold text-orange-600">🍽️</div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Restaurant Management</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/expenses"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Expenses
              </Link>
              <button
                onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date Range (Maximum 1 Month)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          {!validateDateRange(startDate, endDate) && (
            <p className="mt-2 text-sm text-red-600">
              Date range cannot exceed 1 month (31 days)
            </p>
          )}
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customer
              </label>
              <input
                type="text"
                placeholder="Name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Order Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Type
              </label>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value as 'all' | 'dine-in' | 'delivery')}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Types</option>
                <option value="dine-in">Dine-in</option>
                <option value="delivery">Delivery</option>
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
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
            {(searchTerm || orderTypeFilter !== 'all' || statusFilter !== 'all') && (
              <span className="ml-2 text-orange-600">
                (filtered)
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📊</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalOrders}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💰</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalRevenue.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⏳</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pendingOrders}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.completedOrders}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Orders from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        {order.order_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="text-sm border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => openCancelModal(order)}
                          className="ml-2 text-red-600 hover:text-red-900 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">
                {orders.length === 0 ? 'No orders found for this date range' : 'No orders match your filters'}
              </div>
              {orders.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-orange-600 hover:text-orange-700 text-sm"
                >
                  Clear filters to see all orders
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Cancel Order</h3>
                <button
                  onClick={closeCancelModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to cancel order <strong>{orderToCancel.order_number}</strong>?
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Customer: {orderToCancel.customer_name}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Please provide a reason for cancelling this order..."
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeCancelModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Keep Order
                </button>
                <button
                  onClick={() => cancelOrderWithReason(orderToCancel.id, cancelReason)}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Cancel Order
                </button>
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
                  Order Details - {selectedOrder.order_number}
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
                  <div className="text-sm font-medium text-gray-700">Customer</div>
                  <div className="text-gray-900">{selectedOrder.customer_name}</div>
                  {selectedOrder.customer_phone && (
                    <div className="text-sm text-gray-600">{selectedOrder.customer_phone}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Order Type</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedOrder.order_type === 'dine-in' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedOrder.order_type}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Status</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Total Amount</div>
                  <div className="text-lg font-bold text-orange-600">${selectedOrder.total_amount.toFixed(2)}</div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {item.menu_item?.name} × {item.quantity}
                          </div>
                          <div className="text-sm text-gray-600">
                            Base Price: ${item.unit_price.toFixed(2)} each
                          </div>
                          {item.special_instructions && (
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="font-medium">Note:</span> {item.special_instructions}
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
                          <div className="text-sm font-medium text-gray-700 mb-1">Toppings:</div>
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
                          <div className="text-sm text-gray-500">No toppings</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.notes && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Order Notes:</div>
                  <div className="text-sm text-gray-600">{selectedOrder.notes}</div>
                </div>
              )}

              {/* Cancel Reason if cancelled */}
              {selectedOrder.status === 'cancelled' && selectedOrder.cancel_reason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Cancellation Reason:</div>
                  <div className="text-sm text-gray-600">{selectedOrder.cancel_reason}</div>
                </div>
              )}

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Order Amount:</span>
                  <span className="text-orange-600">${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Order placed: {new Date(selectedOrder.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closeOrderDetails}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
