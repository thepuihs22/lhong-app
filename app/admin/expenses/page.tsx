"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

interface ExpenseContributor {
  id?: string;
  expense_id?: string;
  contributor_name: string;
  contribution_amount: number;
}

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  paid_by?: string; // Name of the person who paid
  paid_amount?: number; // Amount paid by the payer
  contributors?: ExpenseContributor[];
  created_at: string;
}

interface Purchase {
  id: string;
  supplier_name: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  created_at: string;
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'purchases'>('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_by: '',
    paid_amount: '',
  });
  const [contributors, setContributors] = useState<ExpenseContributor[]>([]);
  const [newPurchase, setNewPurchase] = useState({
    supplier_name: '',
    item_name: '',
    quantity: '',
    unit_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        router.push('/login');
        return;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        router.push('/login');
        return;
      }

      if (!profile || profile.role !== 'admin') {
        router.push('/login');
        return;
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      // If it's an auth error, redirect to login
      if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
        router.push('/login');
      }
    }
  };

  const fetchData = async () => {
    try {
      // Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        if (sessionError?.message?.includes('Refresh Token') || sessionError?.message?.includes('Invalid')) {
          router.push('/login');
          return;
        }
        throw sessionError || new Error('No session');
      }

      const [expensesResponse, purchasesResponse] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase.from('purchases').select('*').order('purchase_date', { ascending: false })
      ]);

      // Check for auth errors in responses
      if (expensesResponse.error) {
        if (expensesResponse.error.message?.includes('Refresh Token') || expensesResponse.error.message?.includes('Invalid')) {
          router.push('/login');
          return;
        }
        throw expensesResponse.error;
      }
      if (purchasesResponse.error) {
        if (purchasesResponse.error.message?.includes('Refresh Token') || purchasesResponse.error.message?.includes('Invalid')) {
          router.push('/login');
          return;
        }
        throw purchasesResponse.error;
      }

      // Fetch contributors for each expense
      const expensesWithContributors = await Promise.all(
        (expensesResponse.data || []).map(async (expense: any) => {
          const { data: contributorsData, error: contributorsError } = await supabase
            .from('expense_contributors')
            .select('*')
            .eq('expense_id', expense.id);
          
          if (contributorsError) {
            if (contributorsError.message?.includes('Refresh Token') || contributorsError.message?.includes('Invalid')) {
              router.push('/login');
              return null;
            }
            console.error('Error fetching contributors:', contributorsError);
          }
          
          return {
            ...expense,
            contributors: contributorsData || []
          };
        })
      );

      setExpenses(expensesWithContributors.filter((e): e is Expense => e !== null));
      setPurchases(purchasesResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      
      // Check if it's an auth error
      if (error?.message?.includes('Refresh Token') || 
          error?.message?.includes('Invalid') ||
          error?.status === 401) {
        toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
        router.push('/login');
        return;
      }
      
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense.title.trim() || !newExpense.amount || !newExpense.category) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Validate contributors if any
    const totalContributions = contributors.reduce((sum: number, c: ExpenseContributor) => sum + (parseFloat(c.contribution_amount.toString()) || 0), 0);
    if (contributors.length > 0 && totalContributions > parseFloat(newExpense.amount)) {
      toast.error('ยอดเงินที่ผู้ร่วมจ่ายลงรวมกันเกินจำนวนเงินค่าใช้จ่าย');
      return;
    }

    try {
      // Insert expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          title: newExpense.title,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          expense_date: newExpense.expense_date,
          paid_by: newExpense.paid_by || null,
        })
        .select()
        .single();

      if (expenseError) {
        if (expenseError.message?.includes('Refresh Token') || expenseError.message?.includes('Invalid')) {
          toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
          router.push('/login');
          return;
        }
        throw expenseError;
      }

      // Insert contributors if any
      if (contributors.length > 0 && expenseData) {
        const contributorsToInsert = contributors.map((c: ExpenseContributor) => ({
          expense_id: expenseData.id,
          contributor_name: c.contributor_name,
          contribution_amount: parseFloat(c.contribution_amount.toString()),
        }));

        const { error: contributorsError } = await supabase
          .from('expense_contributors')
          .insert(contributorsToInsert);

        if (contributorsError) {
          if (contributorsError.message?.includes('Refresh Token') || contributorsError.message?.includes('Invalid')) {
            toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
            router.push('/login');
            return;
          }
          throw contributorsError;
        }
      }

      toast.success('เพิ่มค่าใช้จ่ายสำเร็จ!');
      setShowExpenseForm(false);
      setNewExpense({
        title: '',
        description: '',
        amount: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        paid_by: '',
        paid_amount: '',
      });
      setContributors([]);
      fetchData();
    } catch (error: any) {
      if (error?.message?.includes('Refresh Token') || 
          error?.message?.includes('Invalid') ||
          error?.status === 401) {
        toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
        router.push('/login');
        return;
      }
      toast.error(error.message || 'เพิ่มค่าใช้จ่ายไม่สำเร็จ');
    }
  };

  const addContributor = () => {
    setContributors([...contributors, { contributor_name: '', contribution_amount: 0 }]);
  };

  const removeContributor = (index: number) => {
    setContributors(contributors.filter((_: ExpenseContributor, i: number) => i !== index));
  };

  const updateContributor = (index: number, field: keyof ExpenseContributor, value: string | number) => {
    const updated = [...contributors];
    updated[index] = { ...updated[index], [field]: value };
    setContributors(updated);
  };

  const handleCreatePurchase = async () => {
    if (!newPurchase.supplier_name.trim() || !newPurchase.item_name.trim() || 
        !newPurchase.quantity || !newPurchase.unit_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const quantity = parseInt(newPurchase.quantity);
      const unitPrice = parseFloat(newPurchase.unit_price);
      const totalAmount = quantity * unitPrice;

      const { error } = await supabase
        .from('purchases')
        .insert({
          supplier_name: newPurchase.supplier_name,
          item_name: newPurchase.item_name,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          purchase_date: newPurchase.purchase_date,
        });

      if (error) {
        if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
          toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
          router.push('/login');
          return;
        }
        throw error;
      }

      toast.success('เพิ่มการซื้อสำเร็จ!');
      setShowPurchaseForm(false);
      setNewPurchase({
        supplier_name: '',
        item_name: '',
        quantity: '',
        unit_price: '',
        purchase_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error: any) {
      if (error?.message?.includes('Refresh Token') || 
          error?.message?.includes('Invalid') ||
          error?.status === 401) {
        toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
        router.push('/login');
        return;
      }
      toast.error(error.message || 'เพิ่มการซื้อไม่สำเร็จ');
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบค่าใช้จ่ายนี้?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
          toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
          router.push('/login');
          return;
        }
        throw error;
      }

      toast.success('ลบค่าใช้จ่ายสำเร็จ!');
      fetchData();
    } catch (error: any) {
      if (error?.message?.includes('Refresh Token') || 
          error?.message?.includes('Invalid') ||
          error?.status === 401) {
        toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
        router.push('/login');
        return;
      }
      toast.error(error.message || 'ลบค่าใช้จ่ายไม่สำเร็จ');
    }
  };

  const deletePurchase = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการซื้อนี้?')) return;

    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
          toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
          router.push('/login');
          return;
        }
        throw error;
      }

      toast.success('ลบการซื้อสำเร็จ!');
      fetchData();
    } catch (error: any) {
      if (error?.message?.includes('Refresh Token') || 
          error?.message?.includes('Invalid') ||
          error?.status === 401) {
        toast.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
        router.push('/login');
        return;
      }
      toast.error(error.message || 'ลบการซื้อไม่สำเร็จ');
    }
  };

  const totalExpenses = expenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
  const totalPurchases = purchases.reduce((sum: number, purchase: Purchase) => sum + purchase.total_amount, 0);

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
                <h1 className="text-xl font-bold text-gray-900">แดชบอร์ดผู้ดูแลระบบ</h1>
                <p className="text-sm text-gray-600">ค่าใช้จ่ายและการซื้อ</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/dashboard"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                แดชบอร์ด
              </Link>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💸</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      ค่าใช้จ่ายรวม
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${totalExpenses.toFixed(2)}
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
                  <div className="text-2xl">🛒</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      การซื้อรวม
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${totalPurchases.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'expenses'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ค่าใช้จ่าย
              </button>
              <button
                onClick={() => setActiveTab('purchases')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'purchases'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                การซื้อ
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">ค่าใช้จ่าย</h2>
                  <button
                    onClick={() => setShowExpenseForm(true)}
                    className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary-600 transition-colors"
                  >
                    เพิ่มค่าใช้จ่าย
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          หัวข้อ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          หมวดหมู่
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          จำนวนเงิน
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ผู้จ่าย
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ผู้ร่วมจ่าย
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วันที่
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenses.map((expense: Expense) => (
                        <tr key={expense.id}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                              {expense.description && (
                                <div className="text-sm text-gray-500">{expense.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${expense.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.paid_by ? (
                              <div>
                                <div className="font-medium">{expense.paid_by}</div>
                                {expense.paid_amount && (
                                  <div className="text-xs text-gray-500">
                                    ${expense.paid_amount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.contributors && expense.contributors.length > 0 ? (
                              <div className="space-y-1">
                                {expense.contributors.map((contributor: ExpenseContributor, idx: number) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium">{contributor.contributor_name}</span>
                                    {' '}: ${contributor.contribution_amount.toFixed(2)}
                                  </div>
                                ))}
                                <div className="text-xs font-semibold text-gray-600 mt-1">
                                  รวม: ${expense.contributors.reduce((sum: number, c: ExpenseContributor) => sum + c.contribution_amount, 0).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(expense.expense_date).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">การซื้อ</h2>
                  <button
                    onClick={() => setShowPurchaseForm(true)}
                    className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary-600 transition-colors"
                  >
                    เพิ่มการซื้อ
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ซัพพลายเออร์
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          รายการ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          จำนวน
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ราคาต่อหน่วย
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchases.map((purchase: Purchase) => (
                        <tr key={purchase.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {purchase.supplier_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.item_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${purchase.unit_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${purchase.total_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(purchase.purchase_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deletePurchase(purchase.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">เพิ่มค่าใช้จ่ายใหม่</h3>
                <button
                  onClick={() => setShowExpenseForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">หัวข้อ *</label>
                  <input
                    type="text"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">คำอธิบาย</label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">จำนวนเงิน *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">หมวดหมู่ *</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      <option value="Utilities">สาธารณูปโภค</option>
                      <option value="Rent">ค่าเช่า</option>
                      <option value="Equipment">อุปกรณ์</option>
                      <option value="Marketing">การตลาด</option>
                      <option value="Maintenance">การบำรุงรักษา</option>
                      <option value="Other">อื่นๆ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">วันที่ *</label>
                    <input
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ผู้จ่าย</label>
                    <input
                      type="text"
                      placeholder="ชื่อผู้จ่าย"
                      value={newExpense.paid_by}
                      onChange={(e) => setNewExpense({...newExpense, paid_by: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">จำนวนเงินที่ผู้จ่ายจ่าย</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpense.paid_amount}
                      onChange={(e) => setNewExpense({...newExpense, paid_amount: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>

                {/* Contributors Section - เงินลงทุน/ผู้ร่วมจ่ายต้นทุน */}
                <div className="border-t pt-4 mt-4">
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        เงินลงทุน / ผู้ร่วมจ่ายต้นทุน
                      </label>
                      <button
                        type="button"
                        onClick={addContributor}
                        className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
                      >
                        + เพิ่มผู้ร่วมจ่าย
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      ใส่รายชื่อผู้ที่ร่วมลงทุนและจำนวนเงินที่แต่ละคนลงทุน
                    </p>
                  </div>
                  
                  {contributors.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {contributors.map((contributor: ExpenseContributor, index: number) => (
                        <div key={index} className="grid grid-cols-2 gap-2 items-center bg-white p-3 rounded border border-gray-200">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">ชื่อผู้ร่วมจ่าย</label>
                            <input
                              type="text"
                              placeholder="ชื่อผู้ร่วมจ่าย"
                              value={contributor.contributor_name}
                              onChange={(e) => updateContributor(index, 'contributor_name', e.target.value)}
                              className="block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-secondary focus:border-secondary"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">จำนวนเงินที่ลงทุน</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={contributor.contribution_amount || ''}
                                onChange={(e) => updateContributor(index, 'contribution_amount', parseFloat(e.target.value) || 0)}
                                className="block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-secondary focus:border-secondary"
                              />
                              <button
                                type="button"
                                onClick={() => removeContributor(index)}
                                className="text-red-600 hover:text-red-800 px-3 py-2 text-lg font-bold"
                                title="ลบผู้ร่วมจ่าย"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {contributors.length > 0 && (
                        <div className="text-sm font-semibold text-gray-700 pt-2 border-t border-gray-300 mt-2">
                          รวมผู้ร่วมจ่ายทั้งหมด: ${contributors.reduce((sum: number, c: ExpenseContributor) => sum + (parseFloat(c.contribution_amount.toString()) || 0), 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500 mb-2">ยังไม่มีผู้ร่วมจ่าย</p>
                      <p className="text-xs text-gray-400">กดปุ่ม "+ เพิ่มผู้ร่วมจ่าย" เพื่อเพิ่มรายชื่อผู้ลงทุน</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowExpenseForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateExpense}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    เพิ่มค่าใช้จ่าย
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Form Modal */}
      {showPurchaseForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">เพิ่มการซื้อใหม่</h3>
                <button
                  onClick={() => setShowPurchaseForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อซัพพลายเออร์ *</label>
                    <input
                      type="text"
                      value={newPurchase.supplier_name}
                      onChange={(e) => setNewPurchase({...newPurchase, supplier_name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อรายการ *</label>
                    <input
                      type="text"
                      value={newPurchase.item_name}
                      onChange={(e) => setNewPurchase({...newPurchase, item_name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">จำนวน *</label>
                    <input
                      type="number"
                      value={newPurchase.quantity}
                      onChange={(e) => setNewPurchase({...newPurchase, quantity: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ราคาต่อหน่วย *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPurchase.unit_price}
                      onChange={(e) => setNewPurchase({...newPurchase, unit_price: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">วันที่</label>
                    <input
                      type="date"
                      value={newPurchase.purchase_date}
                      onChange={(e) => setNewPurchase({...newPurchase, purchase_date: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowPurchaseForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreatePurchase}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    เพิ่มการซื้อ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
