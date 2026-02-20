
import React, { useState, useMemo } from 'react';
import { DailyReport, Shop, User, UserAssignment, SystemStatus, ShopRequest, MachineRequest, ShopRenameRequest } from '../types';

declare var XLSX: any;

interface PartnershipManagerDashboardProps {
  user: User;
  allReports: DailyReport[];
  shops: Shop[];
  assignments?: UserAssignment;
  systemStatus: SystemStatus;
  onRefresh: () => void;
  onAddShopRequest?: (req: ShopRequest) => void;
  onAddMachineRequest?: (req: MachineRequest) => void;
  onAddRenameRequest?: (req: ShopRenameRequest) => void;
}

const PartnershipManagerDashboard: React.FC<PartnershipManagerDashboardProps> = ({ 
  user, allReports, shops, assignments, systemStatus, onRefresh,
  onAddShopRequest, onAddMachineRequest, onAddRenameRequest
}) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('ar-EG'));

  // Modals States
  const [showShopModal, setShowShopModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Form Data
  const [newShopData, setNewShopData] = useState<Partial<ShopRequest>>({});
  const [newMachineData, setNewMachineData] = useState<Partial<MachineRequest>>({ type: 'standard' });
  const [renameData, setRenameData] = useState({ shopId: '', newName: '' });

  // 1. Identify Assigned Shops
  const myAssignedShops = useMemo(() => {
    if (!assignments) return [];
    return shops.filter(shop => {
        const isIndividualAssigned = (assignments.shopIds || []).includes(shop.id);
        const isPartnerAssigned = !shop.isHaitham && (assignments.partnerNames || []).includes(shop.partnerName || '');
        return isIndividualAssigned || isPartnerAssigned;
    });
  }, [shops, assignments]);

  // Extract unique assigned partners for the dropdown
  const uniqueAssignedPartners = useMemo(() => {
    if (!assignments) return [];
    return assignments.partnerNames || [];
  }, [assignments]);

  // 2. Filter Reports based on Assignment + Date + UI Filter
  const filteredReports = useMemo(() => {
    const assignedShopIds = myAssignedShops.map(s => s.id);
    return allReports.filter(r => 
      !r.isDeleted && 
      assignedShopIds.includes(r.shopId) &&
      r.date >= startDate && 
      r.date <= endDate &&
      (selectedShopFilter === 'all' || r.shopId === selectedShopFilter)
    );
  }, [allReports, myAssignedShops, startDate, endDate, selectedShopFilter]);

  // 3. Process Data for Comparison & Display
  const comparisonData = useMemo(() => {
    const data: Record<string, {
      date: string;
      shopName: string;
      shopId: string;
      collectorData: { cash: number, machine: number, username: string, details: any[] };
      partnerData: { cash: number, machine: number, username: string, details: any[] };
    }> = {};

    filteredReports.forEach(r => {
      const key = `${r.date}_${r.shopId}`;
      if (!data[key]) {
        data[key] = {
          date: r.date,
          shopName: r.shopName,
          shopId: r.shopId,
          collectorData: { cash: 0, machine: 0, username: '-', details: [] },
          partnerData: { cash: 0, machine: 0, username: '-', details: [] }
        };
      }

      const machineTotal = r.posMachines?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
      const netCash = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
      
      const isNumericUser = /^\d+$/.test(r.username);
      const isPartnerEntry = r.role 
        ? (r.role === 'shop_user' || r.role === 'partner') 
        : !isNumericUser; 
      
      if (isPartnerEntry) {
        data[key].partnerData.cash += netCash;
        data[key].partnerData.machine += machineTotal;
        data[key].partnerData.username = r.username;
        data[key].partnerData.details = r.posMachines || [];
      } else {
        data[key].collectorData.cash += netCash;
        data[key].collectorData.machine += machineTotal;
        data[key].collectorData.username = r.username;
        data[key].collectorData.details = r.posMachines || [];
      }
    });

    return Object.values(data).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredReports]);

  // 4. Aggregates
  const stats = useMemo(() => {
    let colCash = 0, colMachine = 0, partCash = 0, partMachine = 0;
    comparisonData.forEach(row => {
      colCash += row.collectorData.cash;
      colMachine += row.collectorData.machine;
      partCash += row.partnerData.cash;
      partMachine += row.partnerData.machine;
    });
    return { colCash, colMachine, partCash, partMachine, totalCol: colCash + colMachine, totalPart: partCash + partMachine };
  }, [comparisonData]);

  const handleExport = () => {
    const exportData = comparisonData.map(row => ({
      'التاريخ': row.date,
      'المحل': row.shopName,
      'محصل - ماكينات': row.collectorData.machine,
      'محصل - كاش': row.collectorData.cash,
      'شريك - ماكينات': row.partnerData.machine,
      'شريك - كاش': row.partnerData.cash,
      'الفارق (إجمالي)': (row.partnerData.machine + row.partnerData.cash) - (row.collectorData.machine + row.collectorData.cash),
      'اسم المحصل': row.collectorData.username,
      'اسم الشريك/الموظف': row.partnerData.username
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Partnership Report");
    XLSX.writeFile(wb, `Partnership_Report_${startDate}_${endDate}.xlsx`);
  };

  const refresh = () => {
    onRefresh();
    setLastUpdated(new Date().toLocaleTimeString('ar-EG'));
  };

  // Handlers for Requests
  const handleAddShopRequest = () => {
    if (!newShopData.requestedName || !newShopData.requestedLocation || !newShopData.partnerName) return alert('يرجى إكمال البيانات واختيار الشريك');
    if (onAddShopRequest) {
        onAddShopRequest({
            id: `sreq-${Date.now()}`,
            userId: user.id,
            username: user.username,
            requestedName: newShopData.requestedName,
            requestedLocation: newShopData.requestedLocation,
            requestedCategory: newShopData.requestedCategory || 'عام',
            isHaitham: false, // Always false for partnership manager
            partnerName: newShopData.partnerName,
            initialTid: newShopData.initialTid,
            initialTripleCode: newShopData.initialTripleCode,
            status: 'pending',
            requestDate: Date.now()
        });
        setShowShopModal(false);
        setNewShopData({});
        alert('✅ تم إرسال طلب إضافة المحل بنجاح بانتظار اعتماد الإدارة');
    }
  };

  const handleAddMachineRequest = () => {
    if (!newMachineData.tid || !newMachineData.shopId) return alert('يرجى إدخال رقم TID واختيار المحل');
    const shop = shops.find(s => s.id === newMachineData.shopId);
    if (!shop) return;

    if (onAddMachineRequest) {
        onAddMachineRequest({
            id: `mreq-${Date.now()}`,
            shopId: shop.id,
            shopName: shop.name,
            tid: newMachineData.tid,
            tripleCode: newMachineData.tripleCode,
            type: newMachineData.type || 'standard',
            status: 'pending',
            username: user.username,
            requestDate: Date.now()
        });
        setShowMachineModal(false);
        setNewMachineData({ type: 'standard' });
        alert('✅ تم إرسال طلب إضافة الماكينة بنجاح بانتظار اعتماد الإدارة');
    }
  };

  const handleRenameRequest = () => {
    if (!renameData.newName || !renameData.shopId) return alert('يرجى اختيار المحل وكتابة الاسم الجديد');
    const shop = shops.find(s => s.id === renameData.shopId);
    if (!shop) return;

    if (onAddRenameRequest) {
        onAddRenameRequest({
            id: `rnreq-${Date.now()}`,
            shopId: shop.id,
            oldName: shop.name,
            newName: renameData.newName,
            status: 'pending',
            username: user.username,
            requestDate: Date.now()
        });
        setShowRenameModal(false);
        setRenameData({ shopId: '', newName: '' });
        alert('✅ تم إرسال طلب تعديل الاسم بنجاح بانتظار اعتماد الإدارة');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-in fade-in" dir="rtl">
       {/* Header Stats */}
       <div className="bg-teal-700 text-white p-8 rounded-b-[3rem] shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="max-w-6xl mx-auto relative z-10">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h1 className="text-3xl font-black uppercase tracking-tight">لوحة مدير الشراكة 🤝</h1>
                   <p className="text-teal-200 text-xs font-bold mt-1">أهلاً بك، {user.username}</p>
                </div>
                <button onClick={refresh} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2">
                   <span>🔄</span> تحديث ({lastUpdated})
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                   <p className="text-[10px] font-black text-teal-200 uppercase mb-1">إجمالي تقارير المحصلين</p>
                   <p className="text-3xl font-black">{stats.totalCol.toLocaleString()} <span className="text-xs">ريال</span></p>
                   <div className="mt-2 text-[9px] opacity-70">ماكينات: {stats.colMachine.toLocaleString()} | كاش: {stats.colCash.toLocaleString()}</div>
                </div>
                <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                   <p className="text-[10px] font-black text-orange-200 uppercase mb-1">إجمالي تقارير الشركاء</p>
                   <p className="text-3xl font-black text-orange-300">{stats.totalPart.toLocaleString()} <span className="text-xs">ريال</span></p>
                   <div className="mt-2 text-[9px] opacity-70">ماكينات: {stats.partMachine.toLocaleString()} | كاش: {stats.partCash.toLocaleString()}</div>
                </div>
                <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                   <p className="text-[10px] font-black text-gray-300 uppercase mb-1">الفارق الإجمالي</p>
                   <p className={`text-3xl font-black ${(stats.totalPart - stats.totalCol) !== 0 ? 'text-red-300' : 'text-green-300'}`}>
                      {(stats.totalPart - stats.totalCol).toLocaleString()} <span className="text-xs">ريال</span>
                   </p>
                </div>
             </div>
          </div>
       </div>

       {/* Actions & Filters */}
       <div className="max-w-6xl mx-auto px-4 space-y-6">
          
          {/* Management Buttons */}
          <div className="bg-white p-4 rounded-[2rem] border shadow-sm flex flex-wrap gap-2 justify-center sm:justify-start">
             <button onClick={() => setShowShopModal(true)} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                <span>➕</span> إضافة محل جديد
             </button>
             <button onClick={() => setShowMachineModal(true)} className="bg-green-50 text-green-600 border border-green-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-green-600 hover:text-white transition-all flex items-center gap-2">
                <span>🏧</span> إضافة ماكينة
             </button>
             <button onClick={() => setShowRenameModal(true)} className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2">
                <span>✏️</span> تعديل اسم محل
             </button>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-wrap gap-4 items-end justify-between">
             <div className="flex flex-wrap gap-4">
                <div>
                   <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">من تاريخ</label>
                   <input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-teal-600" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">إلى تاريخ</label>
                   <input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-teal-600" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="min-w-[200px]">
                   <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">تصفية بالمحل</label>
                   <select className="w-full p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-teal-600" value={selectedShopFilter} onChange={e => setSelectedShopFilter(e.target.value)}>
                      <option value="all">كافة المحلات المخصصة لي</option>
                      {myAssignedShops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
             </div>
             <button onClick={handleExport} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center gap-2">
                <span>📊</span> تصدير Excel شامل
             </button>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
             <table className="w-full text-right table-auto">
                <thead className="bg-gray-50 border-b text-[9px] font-black text-gray-500 uppercase tracking-widest">
                   <tr>
                      <th className="p-4">التاريخ / المحل</th>
                      <th className="p-4 text-center bg-teal-50/30 border-l border-teal-100">بيانات المحصل (Collector)</th>
                      <th className="p-4 text-center bg-orange-50/30 border-l border-orange-100">بيانات الشريك (Partner)</th>
                      <th className="p-4 text-center">تفاصيل الماكينات</th>
                   </tr>
                </thead>
                <tbody className="divide-y text-[10px] font-bold">
                   {comparisonData.map((row, idx) => {
                      const diff = (row.partnerData.machine + row.partnerData.cash) - (row.collectorData.machine + row.collectorData.cash);
                      return (
                         <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                               <div className="text-[10px] text-gray-400 mb-1">{row.date}</div>
                               <div className="text-sm font-black text-gray-900">{row.shopName}</div>
                               {diff !== 0 && <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px]">يوجد فرق: {diff.toLocaleString()}</span>}
                            </td>
                            <td className="p-4 text-center border-l border-teal-50">
                               <div className="space-y-1">
                                  <div className="text-teal-700 font-black text-xs">{(row.collectorData.machine + row.collectorData.cash).toLocaleString()}</div>
                                  <div className="text-[9px] text-gray-400">م: {row.collectorData.machine.toLocaleString()} | ك: {row.collectorData.cash.toLocaleString()}</div>
                                  <div className="text-[8px] bg-gray-100 inline-block px-1 rounded">{row.collectorData.username}</div>
                               </div>
                            </td>
                            <td className="p-4 text-center border-l border-orange-50">
                               <div className="space-y-1">
                                  <div className="text-orange-700 font-black text-xs">{(row.partnerData.machine + row.partnerData.cash).toLocaleString()}</div>
                                  <div className="text-[9px] text-gray-400">م: {row.partnerData.machine.toLocaleString()} | ك: {row.partnerData.cash.toLocaleString()}</div>
                                  <div className="text-[8px] bg-gray-100 inline-block px-1 rounded">{row.partnerData.username}</div>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col gap-2">
                                  {(row.partnerData.details.length > 0 ? row.partnerData.details : row.collectorData.details).map((m: any, i: number) => (
                                     <div key={i} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                        <span className="text-[9px] font-mono text-gray-500">{m.tid}</span>
                                        <span className="font-black text-indigo-600">{Number(m.amount).toLocaleString()}</span>
                                     </div>
                                  ))}
                                  {(row.partnerData.details.length === 0 && row.collectorData.details.length === 0) && <span className="text-gray-300 text-center">-</span>}
                               </div>
                            </td>
                         </tr>
                      );
                   })}
                   {comparisonData.length === 0 && (
                      <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-black italic">لا توجد بيانات للعرض في هذه الفترة</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* MODALS */}
       
       {/* 1. Add Shop Modal */}
       {showShopModal && (
         <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 text-right overflow-y-auto max-h-[90vh]">
             <h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tight text-indigo-900">➕ طلب إضافة محل جديد لشريك</h3>
             <div className="space-y-5">
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">اسم المحل</label><input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={newShopData.requestedName || ''} onChange={e=>setNewShopData({...newShopData, requestedName: e.target.value})} /></div>
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">المنطقة</label><input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={newShopData.requestedLocation || ''} onChange={e=>setNewShopData({...newShopData, requestedLocation: e.target.value})} /></div>
               
               <div>
                 <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">الشريك (من قائمتك)</label>
                 <select 
                   className="w-full p-4 bg-orange-50 border border-orange-100 text-orange-600 rounded-2xl font-black outline-none"
                   value={newShopData.partnerName || ''}
                   onChange={e => setNewShopData({ ...newShopData, partnerName: e.target.value })}
                 >
                   <option value="">-- اختر الشريك --</option>
                   {uniqueAssignedPartners.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
               </div>

               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3">بيانات الماكينة (اختياري)</h4>
                  <div className="space-y-3">
                    <input type="text" placeholder="رقم TID" className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={newShopData.initialTid || ''} onChange={e=>setNewShopData({...newShopData, initialTid: e.target.value})} />
                    <input type="text" placeholder="الكود الثلاثي" maxLength={3} className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={newShopData.initialTripleCode || ''} onChange={e=>setNewShopData({...newShopData, initialTripleCode: e.target.value})} />
                  </div>
               </div>

               <div className="flex gap-3 pt-6 border-t mt-4">
                 <button onClick={handleAddShopRequest} className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl">إرسال الطلب ✅</button>
                 <button onClick={() => { setShowShopModal(false); setNewShopData({}); }} className="px-10 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-lg">إلغاء</button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* 2. Add Machine Modal */}
       {showMachineModal && (
         <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 text-right">
             <h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tight text-green-700">🏧 طلب إضافة ماكينة</h3>
             <div className="space-y-5">
               <div>
                 <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">اختر المحل</label>
                 <select 
                   className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none"
                   value={newMachineData.shopId || ''}
                   onChange={e => setNewMachineData({ ...newMachineData, shopId: e.target.value })}
                 >
                   <option value="">-- اختر من القائمة --</option>
                   {myAssignedShops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">رقم TID</label><input type="text" className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-black text-xl" value={newMachineData.tid || ''} onChange={e=>setNewMachineData({...newMachineData, tid: e.target.value})} /></div>
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">الكود الثلاثي (اختياري)</label><input type="text" maxLength={3} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={newMachineData.tripleCode || ''} onChange={e=>setNewMachineData({...newMachineData, tripleCode: e.target.value})} /></div>
               
               <div>
                 <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">نوع الماكينة</label>
                 <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                   <button onClick={()=>setNewMachineData({...newMachineData, type: 'standard'})} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${newMachineData.type === 'standard' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}>وصول (Standard)</button>
                   <button onClick={()=>setNewMachineData({...newMachineData, type: 'hala'})} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${newMachineData.type === 'hala' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}>هلا (Hala)</button>
                 </div>
               </div>

               <div className="flex gap-3 pt-6 border-t mt-4">
                 <button onClick={handleAddMachineRequest} className="flex-1 bg-green-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl">إرسال الطلب ✅</button>
                 <button onClick={() => { setShowMachineModal(false); setNewMachineData({ type: 'standard' }); }} className="px-10 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-lg">إلغاء</button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* 3. Rename Shop Modal */}
       {showRenameModal && (
         <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 text-right">
             <h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tight text-orange-700">✏️ طلب تعديل اسم المحل</h3>
             <div className="space-y-5">
               <div>
                 <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">اختر المحل</label>
                 <select 
                   className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none"
                   value={renameData.shopId || ''}
                   onChange={e => setRenameData({ ...renameData, shopId: e.target.value })}
                 >
                   <option value="">-- اختر من القائمة --</option>
                   {myAssignedShops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">الاسم الجديد</label><input type="text" className="w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-xl" value={renameData.newName || ''} onChange={e=>setRenameData({...renameData, newName: e.target.value})} /></div>
               <div className="flex gap-3 pt-6 border-t mt-4">
                 <button onClick={handleRenameRequest} className="flex-1 bg-orange-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl">إرسال الطلب ✅</button>
                 <button onClick={() => { setShowRenameModal(false); setRenameData({ shopId: '', newName: '' }); }} className="px-10 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-lg">إلغاء</button>
               </div>
             </div>
           </div>
         </div>
       )}

    </div>
  );
};

export default PartnershipManagerDashboard;
