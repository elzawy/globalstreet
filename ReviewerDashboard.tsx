
import React, { useState, useMemo } from 'react';
import { DailyReport, Shop, User } from '../types';

interface ReviewerDashboardProps {
  user: User;
  reports: DailyReport[];
  shops: Shop[];
  partners: string[];
  categories: string[];
  locations: string[];
  onRefresh: () => void;
  onLogout?: () => void; // Added onLogout prop
}

const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ 
  user, reports, shops, partners, categories, locations, onRefresh, onLogout
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'haitham' | 'partner'>('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('ar-EG'));

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const getDateByOffset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
  };

  // --- 1. Logic to Consolidate Data ---
  const consolidatedReports = useMemo(() => {
    const map = new Map<string, DailyReport>();
    reports.forEach(r => {
      if (r.isDeleted || r.reportType !== 'reconciliation' || r.isReview) return;
      
      const key = `${r.date}_${r.shopId}`;
      const existing = map.get(key);
      const isCollector = /^\d+$/.test(r.username); 
      
      if (!existing) {
        map.set(key, r);
        return;
      }
      const existingIsCollector = /^\d+$/.test(existing.username);
      if (isCollector && !existingIsCollector) {
         map.set(key, r);
      } else if (isCollector === existingIsCollector) {
         if (r.timestamp > existing.timestamp) map.set(key, r);
      }
    });
    return Array.from(map.values());
  }, [reports]);

  // --- 2. Filter Logic ---
  const filteredData = useMemo(() => {
    return consolidatedReports.filter(r => {
      let dateMatch = true;
      const today = getLocalDate();
      const yesterday = getDateByOffset(1);
      
      if (timeRange === 'today' && r.date !== today) dateMatch = false;
      else if (timeRange === 'yesterday' && r.date !== yesterday) dateMatch = false;
      else if (timeRange === 'week') {
         const weekAgo = getDateByOffset(7);
         if (r.date < weekAgo) dateMatch = false;
      }
      else if (timeRange === 'month') {
         const monthAgo = getDateByOffset(30);
         if (r.date < monthAgo) dateMatch = false;
      }
      else if (timeRange === 'custom') {
         if (r.date < startDate || r.date > endDate) dateMatch = false;
      }

      if (!dateMatch) return false;

      if (ownerFilter === 'haitham' && !r.isHaitham) return false;
      if (ownerFilter === 'partner' && r.isHaitham) return false;
      if (ownerFilter === 'partner' && partnerFilter !== 'all' && r.partnerName !== partnerFilter) return false;
      if (locationFilter !== 'all' && r.location !== locationFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (shopFilter !== 'all' && r.shopId !== shopFilter) return false;

      return true;
    });
  }, [consolidatedReports, timeRange, startDate, endDate, ownerFilter, partnerFilter, locationFilter, categoryFilter, shopFilter]);

  // --- 3. Statistics Calculation ---
  const stats = useMemo(() => {
    let totalMachines = 0;
    let totalCashReceived = 0; 
    let totalCashRemaining = 0; 
    let totalCommission = 0;
    
    filteredData.forEach(r => {
        totalMachines += (r.posMachines?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
        totalCashReceived += (r.cashReceived || 0);
        totalCashRemaining += (r.cashRemaining || 0);
        totalCommission += (r.commission || 0);
    });

    const grandTotal = totalMachines + totalCashReceived + totalCashRemaining - totalCommission;
    const uniqueDays = new Set(filteredData.map(r => r.date)).size || 1;
    const avgDailySales = grandTotal / uniqueDays;

    return { totalMachines, totalCashReceived, totalCashRemaining, totalCommission, grandTotal, count: filteredData.length, avgDailySales };
  }, [filteredData]);

  // --- 4. Grouping & Ranking (By Shop) ---
  const rankingData = useMemo(() => {
    const groups: Record<string, { name: string, type: string, total: number, count: number, location: string }> = {};
    
    filteredData.forEach(r => {
        const netCash = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
        const mSum = (r.posMachines?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
        const total = netCash + mSum;

        if (!groups[r.shopId]) {
            groups[r.shopId] = { 
                name: r.shopName, 
                type: r.isHaitham ? 'هيثم' : (r.partnerName || 'شريك'), 
                location: r.location,
                total: 0, 
                count: 0 
            };
        }
        groups[r.shopId].total += total;
        groups[r.shopId].count += 1;
    });

    return Object.values(groups).sort((a,b) => b.total - a.total);
  }, [filteredData]);

  const topPerformer = useMemo(() => rankingData.length > 0 ? rankingData[0] : null, [rankingData]);

  // --- 5. Chart Data Preparation ---
  const chartData = useMemo(() => {
      // Trend Data (By Date)
      const dateMap: Record<string, number> = {};
      filteredData.forEach(r => {
          const netCash = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
          const mSum = (r.posMachines?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
          dateMap[r.date] = (dateMap[r.date] || 0) + (netCash + mSum);
      });
      const trend = Object.entries(dateMap)
          .map(([date, total]) => ({ date, total }))
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Category Distribution
      const catMap: Record<string, number> = {};
      filteredData.forEach(r => {
          const netCash = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
          const mSum = (r.posMachines?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
          catMap[r.category || 'غير مصنف'] = (catMap[r.category || 'غير مصنف'] || 0) + (netCash + mSum);
      });
      const categoriesDist = Object.entries(catMap)
          .map(([name, value]) => ({ name, value, percentage: stats.grandTotal > 0 ? (value/stats.grandTotal)*100 : 0 }))
          .sort((a,b) => b.value - a.value);

      return { trend, categoriesDist };
  }, [filteredData, stats.grandTotal]);

  // --- 6. Daily Breakdown ---
  const dailyBreakdown = useMemo(() => {
      if (shopFilter === 'all') return [];
      return filteredData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredData, shopFilter]);

  const handleRefresh = () => {
    onRefresh();
    setLastUpdated(new Date().toLocaleTimeString('ar-EG'));
  };

  const availableShopsForFilter = useMemo(() => {
      return shops.filter(s => {
          if (ownerFilter === 'haitham' && !s.isHaitham) return false;
          if (ownerFilter === 'partner' && s.isHaitham) return false;
          if (ownerFilter === 'partner' && partnerFilter !== 'all' && s.partnerName !== partnerFilter) return false;
          if (locationFilter !== 'all' && s.location !== locationFilter) return false;
          if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
          return true;
      });
  }, [shops, ownerFilter, partnerFilter, locationFilter, categoryFilter]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-in fade-in" dir="rtl">
      {/* 1. Enhanced Header with KPI Cards */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-b-[3rem] shadow-2xl mb-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h1 className="text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">لوحة المراقبة والتحليل الذكي 📊</h1>
                  <p className="text-slate-400 text-xs font-bold mt-1">أهلاً بك، {user.username} (Reviewer)</p>
               </div>
               <div className="flex gap-2">
                  <button onClick={handleRefresh} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border border-white/10">
                      <span>🔄</span> تحديث ({lastUpdated})
                  </button>
                  {onLogout && (
                    <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all border border-red-500 shadow-md">
                        خروج 🚪
                    </button>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Grand Total Card */}
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي المبيعات</p>
                      <span className="text-xl group-hover:scale-110 transition-transform">💰</span>
                   </div>
                   <p className="text-3xl font-black text-emerald-400">{stats.grandTotal.toLocaleString()} <span className="text-xs text-white">ريال</span></p>
                </div>

                {/* KPI: Top Performer */}
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">الأعلى أداءً</p>
                      <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
                   </div>
                   {topPerformer ? (
                       <div>
                           <p className="text-lg font-black text-white truncate">{topPerformer.name}</p>
                           <p className="text-[10px] text-yellow-400 font-mono mt-1">{topPerformer.total.toLocaleString()} ريال</p>
                       </div>
                   ) : <p className="text-sm text-gray-500">-</p>}
                </div>

                {/* KPI: Average Daily Sales */}
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">المتوسط اليومي</p>
                      <span className="text-xl group-hover:scale-110 transition-transform">📈</span>
                   </div>
                   <p className="text-2xl font-black text-blue-300">{Math.round(stats.avgDailySales).toLocaleString()} <span className="text-xs text-white">ريال/يوم</span></p>
                </div>

                {/* Net Cash Card */}
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">صافي الكاش</p>
                      <span className="text-xl group-hover:scale-110 transition-transform">💵</span>
                   </div>
                   <p className="text-2xl font-black text-indigo-300">{(stats.totalCashReceived + stats.totalCashRemaining - stats.totalCommission).toLocaleString()}</p>
                </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-8">
         
         {/* 2. Advanced Filters */}
         <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2 justify-center border-b pb-4 mb-2">
                {['today', 'yesterday', 'week', 'month', 'all', 'custom'].map(range => (
                    <button 
                        key={range}
                        onClick={() => setTimeRange(range as any)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === range ? 'bg-slate-800 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                        {range === 'today' ? 'اليوم' : range === 'yesterday' ? 'أمس' : range === 'week' ? 'أسبوع' : range === 'month' ? 'شهر' : range === 'all' ? 'من البداية' : 'مخصص'}
                    </button>
                ))}
            </div>
            
            {timeRange === 'custom' && (
                <div className="flex gap-4 justify-center animate-in slide-in-from-top-2">
                    <input type="date" className="p-2 bg-gray-50 rounded-xl border text-xs font-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <input type="date" className="p-2 bg-gray-50 rounded-xl border text-xs font-black" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <select className="p-3 bg-indigo-50 border-indigo-100 text-indigo-700 rounded-xl font-black text-xs outline-none" value={ownerFilter} onChange={e => { setOwnerFilter(e.target.value as any); setPartnerFilter('all'); }}><option value="all">الكل (التبعية)</option><option value="haitham">مجموعة هيثم</option><option value="partner">الشركاء</option></select>
                {ownerFilter === 'partner' && (<select className="p-3 bg-orange-50 border-orange-100 text-orange-700 rounded-xl font-black text-xs outline-none" value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)}><option value="all">كل الشركاء</option>{partners.map(p => <option key={p} value={p}>{p}</option>)}</select>)}
                <select className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}><option value="all">كل المناطق</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                <select className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">كل التصنيفات</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none" value={shopFilter} onChange={e => setShopFilter(e.target.value)}><option value="all">بحث عن محل...</option>{availableShopsForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
         </div>

         {/* 3. Visual Analytics Section (Updated: Always Visible with Empty State) */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
            {/* Sales Trend Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col min-h-[350px]">
                <h3 className="font-black text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <span className="text-indigo-500">📈</span> نمو المبيعات (Trend)
                </h3>
                
                {chartData.trend.length > 0 && stats.grandTotal > 0 ? (
                    <div className="flex-1 flex items-end gap-2 justify-between px-2 pb-2 relative">
                        {/* Y-Axis Grid Lines (Optional visual guide) */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                            <div className="border-t border-gray-400 w-full h-0"></div>
                            <div className="border-t border-gray-400 w-full h-0"></div>
                            <div className="border-t border-gray-400 w-full h-0"></div>
                            <div className="border-t border-gray-400 w-full h-0"></div>
                        </div>

                        {chartData.trend.map((point, i) => {
                            const maxVal = Math.max(...chartData.trend.map(d => d.total));
                            // Ensure at least 1% height for visibility if value > 0
                            const heightPercentage = maxVal > 0 ? (point.total / maxVal) * 100 : 0;
                            const displayHeight = heightPercentage === 0 ? 2 : heightPercentage; 
                            
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg whitespace-nowrap z-20 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                        {point.date}: {point.total.toLocaleString()} ريال
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                    </div>
                                    
                                    <div 
                                        className={`w-full max-w-[40px] rounded-t-xl transition-all duration-500 relative overflow-hidden group-hover:opacity-90 ${point.total === 0 ? 'bg-gray-100' : 'bg-gradient-to-t from-indigo-600 to-indigo-400'}`}
                                        style={{ height: `${displayHeight}%` }}
                                    >
                                        {/* Shine effect */}
                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent"></div>
                                    </div>
                                    
                                    <span className="text-[9px] font-bold text-gray-400 mt-3 rotate-45 origin-left truncate w-full text-center group-hover:text-indigo-600 transition-colors">
                                        {point.date.slice(5)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                        <span className="text-4xl mb-2 grayscale opacity-50">📉</span>
                        <p className="text-xs font-black text-gray-400">لا توجد بيانات كافية لعرض الرسم البياني</p>
                    </div>
                )}
            </div>

            {/* Distribution Bars */}
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col min-h-[350px]">
                <h3 className="font-black text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <span className="text-orange-500">📊</span> التوزيع
                </h3>
                {chartData.categoriesDist.length > 0 && stats.grandTotal > 0 ? (
                    <div className="space-y-5 overflow-y-auto flex-1 custom-scrollbar pr-2">
                        {chartData.categoriesDist.map((cat, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-[10px] font-black text-gray-500 mb-2 group-hover:text-gray-900 transition-colors">
                                    <span className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-orange-400' : 'bg-indigo-400'}`}></span>
                                        {cat.name}
                                    </span>
                                    <span>{cat.value.toLocaleString()} ({cat.percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${i % 2 === 0 ? 'bg-gradient-to-r from-orange-500 to-amber-400' : 'bg-gradient-to-r from-indigo-500 to-blue-400'}`}
                                        style={{ width: `${cat.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                        <span className="text-4xl mb-2 grayscale opacity-50">🥧</span>
                        <p className="text-xs font-black text-gray-400">لا توجد بيانات للتصنيف</p>
                    </div>
                )}
            </div>
         </div>

         {/* 4. Detailed Table */}
         <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-black text-lg text-gray-800">📋 ترتيب المبيعات</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">{rankingData.length} محل</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right table-auto">
                    <thead className="bg-gray-100 text-[9px] font-black text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">#</th>
                            <th className="p-4">المحل</th>
                            <th className="p-4">المالك</th>
                            <th className="p-4 text-center">العمليات</th>
                            <th className="p-4 text-center">المبيعات</th>
                            <th className="p-4 text-center">النسبة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-[11px] font-bold">
                        {rankingData.map((item, idx) => {
                            const percentage = stats.grandTotal > 0 ? (item.total / stats.grandTotal) * 100 : 0;
                            return (
                                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="p-4 text-gray-400">{idx + 1}</td>
                                    <td className="p-4">
                                        <p className="font-black text-gray-900">{item.name}</p>
                                        <p className="text-[9px] text-gray-400">{item.location}</p>
                                    </td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-[9px] ${item.type === 'هيثم' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>{item.type}</span></td>
                                    <td className="p-4 text-center">{item.count}</td>
                                    <td className="p-4 text-center font-black text-slate-800">{item.total.toLocaleString()}</td>
                                    <td className="p-4 text-center w-32">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span className="text-[8px] text-gray-400 w-8">{percentage.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rankingData.length === 0 && (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">لا توجد بيانات</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>

         {/* 5. Daily Breakdown (Specific Shop) */}
         {shopFilter !== 'all' && (
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden animate-in slide-in-from-bottom-6 border-indigo-200">
                <div className="p-6 border-b bg-indigo-50 flex justify-between items-center">
                    <h3 className="font-black text-lg text-indigo-900">📅 السجل اليومي: {(shops.find(s=>s.id===shopFilter)?.name)}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right table-auto">
                        <thead className="bg-indigo-100/50 text-[9px] font-black text-indigo-800 uppercase">
                            <tr>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4 text-center">الماكينات</th>
                                <th className="p-4 text-center">الكاش المستلم</th>
                                <th className="p-4 text-center">الكاش المتبقي</th>
                                <th className="p-4 text-center">العمولة</th>
                                <th className="p-4 text-center text-indigo-700">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-[11px] font-bold">
                            {dailyBreakdown.map((r, idx) => {
                                const mSum = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
                                const netCash = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
                                const total = mSum + netCash;
                                return (
                                    <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                                        <td className="p-4 font-mono text-gray-600">{r.date}</td>
                                        <td className="p-4 text-center">{mSum.toLocaleString()}</td>
                                        <td className="p-4 text-center text-emerald-600">{(r.cashReceived || 0).toLocaleString()}</td>
                                        <td className="p-4 text-center text-gray-500">{(r.cashRemaining || 0).toLocaleString()}</td>
                                        <td className="p-4 text-center text-orange-600">{(r.commission || 0).toLocaleString()}</td>
                                        <td className="p-4 text-center font-black text-indigo-700">{total.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
         )}

      </div>
    </div>
  );
};

export default ReviewerDashboard;
