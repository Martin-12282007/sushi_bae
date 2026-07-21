import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  User, 
  Phone, 
  Calendar, 
  Trash2, 
  Receipt, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { BakeProduct, OrderLine, ReceiptData } from './types';

// Palette Constants
// cream: bg-[#FFF9F1]
// salmon: bg-[#E87562]
// ink: text-[#1C2430], bg-[#1C2430]
// paper: bg-[#FFFFFE]
const EXTRA_NORI_PRICE = 20;
const WORKER_URL = "https://sushi-bae-invoice.gayemmartin.workers.dev";

const PRODUCTS: BakeProduct[] = [
  { name: 'Kani Mango', size: 'Small (Solo)', price: 190 },
  { name: 'Tuna', size: 'Small (Solo)', price: 190 },
  { name: 'Kani Mango', size: 'Medium (Clique)', price: 250 },
  { name: 'Tuna', size: 'Medium (Clique)', price: 250 },
  { name: 'Overload', size: 'Medium (Clique)', price: 295 },
  { name: 'Kani Mango', size: 'Large (Fam)', price: 385 },
  { name: 'Tuna', size: 'Large (Fam)', price: 370 },
  { name: 'Overload', size: 'Large (Fam)', price: 400 },
];

export default function App() {
  // Order Form State
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<BakeProduct>(PRODUCTS[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [extraNori, setExtraNori] = useState<number>(0);
  
  // Customer Details State
  const [customerName, setCustomerName] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  
  // UI & Flow State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  // Notifications/Alerts
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  // Helper calculation for total free/paid nori in order
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const freeNori = cart.reduce((sum, item) => sum + item.quantity, 0);
  const paidNori = cart.reduce((sum, item) => sum + item.extraNori, 0);

  const handleAddToOrder = () => {
    const itemTotal = (selectedProduct.price * quantity) + (extraNori * EXTRA_NORI_PRICE);
    const newLine: OrderLine = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      product: selectedProduct,
      quantity,
      extraNori,
      total: itemTotal,
    };

    setCart(prev => [...prev, newLine]);
    showToast(`Added ${quantity}x ${selectedProduct.size} ${selectedProduct.name} to order!`, 'success');
    
    // Reset selectors
    setQuantity(1);
    setExtraNori(0);
  };

  const handleRemoveLine = (id: string) => {
    const itemToRemove = cart.find(item => item.id === id);
    setCart(prev => prev.filter(item => item.id !== id));
    if (itemToRemove) {
      showToast(`Removed ${itemToRemove.product.size} ${itemToRemove.product.name} from order.`, 'info');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleGenerateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast('Please add at least one sushi bake to your order.', 'error');
      return;
    }
    if (!customerName.trim()) {
      showToast('Please enter the customer name.', 'error');
      return;
    }
    if (!deliveryDate) {
      showToast('Please select a delivery date.', 'error');
      return;
    }

    const generatedOrderNum = `SB-${Date.now().toString().substring(7)}`;

    const payload: ReceiptData = {
      orderNumber: generatedOrderNum,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      deliveryDate: formatDate(deliveryDate),
      items: cart.map(item => ({
        name: item.product.name,
        size: item.product.size,
        price: item.product.price,
        quantity: item.quantity,
        extraNori: item.extraNori,
        total: item.total
      })),
      subtotal: subtotal,
      freeNori: freeNori,
      extraNoriCount: paidNori,
      extraNoriTotal: paidNori * EXTRA_NORI_PRICE,
      total: subtotal
    };

    setReceiptData(payload);
    setShowReceipt(true);

    // Send HTTP POST to Cloudflare Worker
    setIsSending(true);
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('Invoice receipt sent to kitchen successfully! 📧', 'success');
      } else {
        showToast(`Receipt sent, but kitchen returned code: ${response.status}`, 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Network issue sending to kitchen, but receipt is generated!', 'info');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewOrder = () => {
    setCart([]);
    setCustomerName('');
    setContactNumber('');
    setDeliveryDate('');
    setShowReceipt(false);
    setReceiptData(null);
    showToast('Started a new order!', 'success');
  };

  // Min delivery date is today
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div id="app_root" className="min-h-screen bg-[#FFF9F1] text-[#1C2430] flex flex-col antialiased">
      {/* Navigation Header */}
      <header id="app_header" className="sticky top-0 z-30 bg-[#FFF9F1]/95 backdrop-blur-md border-b border-[#E8DDD2]/60 px-4 py-3 sm:py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl leading-none">🍣</span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#1C2430] leading-none">Sushi Bae</h1>
              <p className="text-[10px] text-[#7C7168] font-semibold tracking-wider uppercase mt-0.5">Perfect Bake Kitchen</p>
            </div>
          </div>
          {cart.length > 0 && !showReceipt && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#E87562] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"
            >
              <span>🛒</span>
              <span>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            </motion.div>
          )}
        </div>
      </header>

      {/* Floating Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-16 left-0 right-0 z-50 mx-auto max-w-sm px-4 pointer-events-none"
          >
            <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm ${
              notification.type === 'success' 
                ? 'bg-[#EBF7EE] text-[#1D6033] border-[#BADFBF]' 
                : notification.type === 'error'
                  ? 'bg-[#FDF2F2] text-[#9B1C1C] border-[#F5C2C2]'
                  : 'bg-[#FFF9EB] text-[#8F530B] border-[#FAD390]'
            }`}>
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              {notification.type === 'info' && <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />}
              <span className="font-medium">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main id="app_main" className="flex-grow max-w-xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {!showReceipt ? (
            <motion.div
              key="order-form-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {/* Hero Poster */}
              <div className="relative bg-[#E87562] text-white p-6 rounded-3xl overflow-hidden shadow-md shadow-[#E87562]/10 border border-[#E87562]/20">
                {/* Visual Accent Sushi Illustration Shapes */}
                <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 pointer-events-none select-none">🍣</div>
                <div className="absolute -left-6 -top-6 text-7xl opacity-10 pointer-events-none select-none">🍱</div>

                <span className="text-xs font-bold tracking-wider uppercase text-white/80">Made for sharing</span>
                <h2 className="text-3xl font-extrabold tracking-tight mt-1 leading-tight">
                  Fresh sushi bake<br />for every craving.
                </h2>
                <div className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl inline-flex text-xs font-semibold border border-white/10">
                  <span>🍃</span>
                  <span>Every order includes 1 free nori/seaweed pack per tray!</span>
                </div>
              </div>

              {/* SECTION: Build Your Order */}
              <section className="flex flex-col gap-3">
                <div className="flex flex-col">
                  <h3 className="text-lg font-black tracking-tight text-[#1C2430]">Build your order</h3>
                  <p className="text-xs text-[#7C7168] mt-0.5">Select a sushi bake flavor and size, then add it to your basket.</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#E8DDD2] shadow-sm flex flex-col gap-4">
                  {/* Dropdown Select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#7C7168] tracking-wide uppercase">Sushi Bake Flavor & Size</label>
                    <div className="relative">
                      <select
                        value={PRODUCTS.findIndex(p => p.name === selectedProduct.name && p.size === selectedProduct.size)}
                        onChange={(e) => setSelectedProduct(PRODUCTS[Number(e.target.value)])}
                        className="w-full appearance-none bg-white border border-[#E8DDD2] text-[#1C2430] font-semibold rounded-xl px-4 py-3.5 pr-10 focus:outline-none focus:border-[#E87562] focus:ring-1 focus:ring-[#E87562] transition"
                      >
                        {PRODUCTS.map((prod, idx) => (
                          <option key={idx} value={idx}>
                            {prod.size} {prod.name}  •  ₱{prod.price}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C7168] pointer-events-none" />
                    </div>
                  </div>

                  {/* Steppers */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity Stepper */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#7C7168] tracking-wide uppercase">Quantity</label>
                      <div className="flex items-center justify-between border border-[#E8DDD2] rounded-xl h-12 overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                          disabled={quantity <= 1}
                          className="w-12 h-full flex items-center justify-center text-[#E87562] hover:bg-[#FFF9F1] disabled:text-[#CBBDB0] disabled:hover:bg-transparent transition active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-[#1C2430] text-base">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(prev => Math.min(99, prev + 1))}
                          className="w-12 h-full flex items-center justify-center text-[#E87562] hover:bg-[#FFF9F1] transition active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Extra Nori Stepper */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#7C7168] tracking-wide uppercase">Extra Nori (₱20/pc)</label>
                      <div className="flex items-center justify-between border border-[#E8DDD2] rounded-xl h-12 overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => setExtraNori(prev => Math.max(0, prev - 1))}
                          disabled={extraNori <= 0}
                          className="w-12 h-full flex items-center justify-center text-[#E87562] hover:bg-[#FFF9F1] disabled:text-[#CBBDB0] disabled:hover:bg-transparent transition active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-[#1C2430] text-base">{extraNori}</span>
                        <button
                          type="button"
                          onClick={() => setExtraNori(prev => Math.min(99, prev + 1))}
                          className="w-12 h-full flex items-center justify-center text-[#E87562] hover:bg-[#FFF9F1] transition active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inclusive Nori Banner */}
                  <div className="bg-[#FFF0EB] text-[#1C2430] px-4 py-3 rounded-xl flex items-center gap-2.5 border border-[#E87562]/10">
                    <span className="text-lg leading-none">🍃</span>
                    <span className="text-xs font-semibold">Includes <strong className="font-black text-[#E87562]">{quantity}</strong> free nori / seaweed pack{quantity > 1 ? 's' : ''}</span>
                  </div>

                  {/* Add Button */}
                  <button
                    type="button"
                    onClick={handleAddToOrder}
                    className="w-full h-12 bg-transparent hover:bg-[#E87562]/5 text-[#E87562] font-extrabold text-sm border-2 border-[#E87562] rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add to order</span>
                  </button>
                </div>
              </section>

              {/* FORM: Order & Customer Details */}
              <form onSubmit={handleGenerateReceipt} className="flex flex-col gap-6">
                <section className="flex flex-col gap-3">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black tracking-tight text-[#1C2430]">Order details</h3>
                    <p className="text-xs text-[#7C7168] mt-0.5">Provide customer identity and scheduling details.</p>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-[#E8DDD2] shadow-sm flex flex-col gap-4">
                    {/* Customer Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#7C7168] tracking-wide uppercase">Customer Name *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7C7168]" />
                        <input
                          type="text"
                          required
                          placeholder="Enter customer name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-white border border-[#E8DDD2] text-[#1C2430] font-semibold rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-[#E87562] transition"
                        />
                      </div>
                    </div>

                    {/* Contact Number */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#7C7168] tracking-wide uppercase">Contact Number (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7C7168]" />
                        <input
                          type="tel"
                          placeholder="Enter phone number"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className="w-full bg-white border border-[#E8DDD2] text-[#1C2430] font-semibold rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-[#E87562] transition"
                        />
                      </div>
                    </div>

                    {/* Delivery Date */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#7C7168] tracking-wide uppercase">Delivery Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7C7168]" />
                        <input
                          type="date"
                          required
                          min={todayStr}
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full bg-white border border-[#E8DDD2] text-[#1C2430] font-semibold rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-[#E87562] transition"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Basket Cart list */}
                {cart.length > 0 && (
                  <motion.section 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black tracking-tight text-[#1C2430]">Your order</h3>
                      <span className="bg-[#FFF0EB] text-[#E87562] text-xs font-bold px-2.5 py-1 rounded-md">
                        {cart.length} item{cart.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-[#E8DDD2] shadow-sm flex flex-col gap-4">
                      {/* Cart Items list */}
                      <div className="divide-y divide-[#E8DDD2]/60">
                        {cart.map((item) => (
                          <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-[#FFF0EB] rounded-xl flex items-center justify-center shrink-0 text-xl">
                                🍱
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-[#1C2430]">{item.quantity} × {item.product.size} {item.product.name}</h4>
                                <p className="text-xs text-[#7C7168] mt-1 font-medium">
                                  Free nori: {item.quantity}  •  Extra nori: {item.extraNori}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-extrabold text-sm text-[#1C2430]">₱{item.total}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(item.id)}
                                className="p-1.5 text-[#CBBDB0] hover:text-[#E87562] rounded-lg transition active:scale-90"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Line Separator */}
                      <div className="h-[1px] bg-[#E8DDD2] w-full" />

                      {/* Current Total */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#1C2430]">Current total</span>
                        <span className="text-2xl font-black text-[#E87562]">₱{subtotal}</span>
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Submit Receipt Button */}
                <button
                  type="submit"
                  className="w-full h-14 bg-[#1C2430] hover:bg-[#1C2430]/90 text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-[#1C2430]/10"
                >
                  <Receipt className="w-5 h-5 stroke-[2.2]" />
                  <span>Generate receipt</span>
                </button>
              </form>
            </motion.div>
          ) : (
            /* RECEIPT VIEW */
            <motion.div
              key="receipt-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col gap-6"
            >
              {/* Back button */}
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="self-start flex items-center gap-1.5 text-xs font-bold text-[#7C7168] hover:text-[#1C2430] transition bg-white/60 border border-[#E8DDD2]/60 px-3 py-1.5 rounded-full"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go back / Edit order</span>
              </button>

              {/* Styled Invoice Receipt Card */}
              <div className="bg-white rounded-3xl border border-[#E8DDD2] shadow-xl shadow-[#1C2430]/5 p-6 relative overflow-hidden flex flex-col gap-6">
                {/* Simulated Tear lines at the top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_20%,#FFF9F1_20%,#FFF9F1_80%,transparent_80%)] bg-[length:12px_12px] bg-repeat-x rotate-180" />

                {/* Receipt Header */}
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="w-16 h-16 bg-[#E87562] rounded-2xl flex items-center justify-center text-3xl shadow-sm text-white border-2 border-white">
                    🍣
                  </div>
                  <h2 className="text-xl font-black tracking-widest text-[#1C2430] uppercase mt-3">SUSHI BAE</h2>
                  <span className="text-[10px] font-bold tracking-widest text-[#E87562] uppercase bg-[#FFF0EB] px-3 py-1 rounded-full mt-1.5">
                    ORDER RECEIPT
                  </span>
                </div>

                {/* Details Section */}
                <div className="bg-[#FFF9F1] rounded-2xl p-4 border border-[#E8DDD2]/50 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E8DDD2]/40">
                    <span className="font-bold text-[#7C7168]">Order number</span>
                    <span className="font-black text-[#1C2430] font-mono">{receiptData?.orderNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#7C7168]">Customer</span>
                    <span className="font-black text-[#1C2430]">{receiptData?.customerName}</span>
                  </div>
                  {receiptData?.contactNumber && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#7C7168]">Contact</span>
                      <span className="font-black text-[#1C2430] font-mono">{receiptData?.contactNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#7C7168]">Delivery date</span>
                    <span className="font-black text-[#1C2430]">{receiptData?.deliveryDate}</span>
                  </div>
                </div>

                {/* Item List */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-extrabold tracking-wider text-[#7C7168] uppercase">ORDER DETAILS</span>
                  <div className="flex flex-col gap-3.5 divide-y divide-[#E8DDD2]/40">
                    {receiptData?.items.map((item, idx) => (
                      <div key={idx} className="pt-3.5 first:pt-0 flex justify-between items-start text-xs gap-3">
                        <div>
                          <h4 className="font-bold text-[#1C2430]">{item.quantity} × {item.size} {item.name}</h4>
                          <span className="text-[10px] text-[#7C7168] mt-0.5 block">
                            Free nori: {item.quantity}  •  Extra nori: {item.extraNori}
                          </span>
                        </div>
                        <span className="font-extrabold text-[#1C2430] shrink-0">₱{item.total}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line Separator */}
                <div className="h-[1px] bg-[#E8DDD2] w-full" />

                {/* Calculations */}
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#7C7168]">Sushi bake subtotal</span>
                    <span className="font-extrabold text-[#1C2430]">₱{receiptData?.subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#7C7168]">Free nori / seaweed</span>
                    <span className="font-extrabold text-[#1C2430]">{receiptData?.freeNori} pack{receiptData?.freeNori !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#7C7168]">Extra nori</span>
                    <span className="font-extrabold text-[#1C2430]">
                      {receiptData?.extraNoriCount} pack{receiptData?.extraNoriCount !== 1 ? 's' : ''}  •  ₱{receiptData?.extraNoriTotal}
                    </span>
                  </div>
                </div>

                {/* Line Separator */}
                <div className="h-[1px] bg-[#E8DDD2] w-full" />

                {/* Receipt Total */}
                <div className="flex items-end justify-between">
                  <span className="text-sm font-black text-[#1C2430] uppercase">TOTAL</span>
                  <span className="text-3xl font-black text-[#E87562] leading-none">₱{receiptData?.total}</span>
                </div>

                {/* Thank You Note */}
                <div className="flex flex-col items-center text-center gap-1 mt-2">
                  <p className="font-black text-sm text-[#1C2430]">Thank you for ordering! 🍱</p>
                  <p className="text-[11px] text-[#7C7168] leading-normal max-w-[280px]">
                    Please screenshot this receipt for your order reference or payment verification.
                  </p>
                </div>
              </div>

              {/* Start new order */}
              <button
                type="button"
                onClick={handleStartNewOrder}
                className="w-full h-14 bg-transparent hover:bg-[#1C2430]/5 text-[#1C2430] font-extrabold text-base border-2 border-[#1C2430] rounded-2xl flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Plus className="w-5 h-5 stroke-[2.2]" />
                <span>Create another order</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sending Receipt Modal Loader overlay */}
      <AnimatePresence>
        {isSending && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1C2430]/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl border border-[#E8DDD2] max-w-xs w-full flex flex-col items-center gap-4 text-center"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#E87562]/30 border-t-[#E87562] rounded-full animate-spin" />
                <span className="absolute text-xl">📧</span>
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#1C2430]">Sending Invoice...</h4>
                <p className="text-xs text-[#7C7168] mt-1">Connecting to kitchen notification servers...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-[#E8DDD2]/40 text-center text-[10px] text-[#7C7168] font-bold tracking-wider uppercase">
        © 2026 Sushi Bae Kitchen. All Rights Reserved.
      </footer>
    </div>
  );
}
