
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, DailyReport, POSMachine, Shop, ReportType, ShopRequest, MachineRequest, SystemStatus, AdminMessage, UserAssignment, ShopRenameRequest, GlobalAlert, CashReport } from '../types';

// Helper function to compress images before saving
const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

interface UserDashboardProps {
  user: User;
  onAddReport: (report: DailyReport) => void;
  onAddMachineRequest: (req: MachineRequest) => void;
  onAddShopRequest: (req: ShopRequest) => void;
  onAddRenameRequest?: (req: ShopRenameRequest) => void;
  onUpdateCashReport?: (report: CashReport) => void; 
  allReports: DailyReport[];
  availableShops: Shop[];
  systemStatus: SystemStatus;
  messages: AdminMessage[];
  assignments?: UserAssignment;
  cashReports?: CashReport[]; 
  onRefreshStatus?: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  user, onAddReport, onAddMachineRequest, onAddShopRequest, onAddRenameRequest, onUpdateCashReport, allReports = [], availableShops = [], systemStatus, messages = [], assignments, cashReports = [], onRefreshStatus
}) => {
  const isShopUser = user?.role === 'shop_user';
  const isManagerType = user?.role === 'partner' || user?.role === 'haitham_manager';
  
  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [partnerTab, setPartnerTab] = useState<'entry' | 'stats' | 'shops_list'>('entry');
  
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [ownerType, setOwnerType] = useState<'haitham' | 'partner' | ''>('');
  const [selectedShopId, setSelectedShopId] = useState(user?.shopId || '');
  
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerStartDate, setPartnerStartDate] = useState(getLocalDate());
  const [partnerEndDate, setPartnerEndDate] = useState(getLocalDate());
  const [partnerStatsShopId, setPartnerStatsShopId] = useState('all');
  
  const [partnerEntryData, setPartnerEntryData] = useState<Record<string, { cash: number, commission: number }>>({});
  const [partnerMachineData, setPartnerMachineData] = useState<Record<string, Record<string, number>>>({});

  const [posMachines, setPosMachines] = useState<POSMachine[]>([]);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [commissionAmount, setCommissionAmount] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [showShopRequestModal, setShowShopRequestModal] = useState(false);
  const [newShopData, setNewShopData] = useState<Partial<ShopRequest>>({ isHaitham: true });
  
  const [showMachineRequestModal, setShowMachineRequestModal] = useState(false);
  const [newMachineData, setNewMachineData] = useState<Partial<MachineRequest>>({ type: 'standard' });
  
  const [showRenameRequestModal, setShowRenameRequestModal] = useState(false);
  const [renameData, setRenameData] = useState({ shopId: '', newName: '' });

  const [showCashCalcModal, setShowCashCalcModal] = useState(false);
  const [cashDenominations, setCashDenominations] = useState({
    val500: '', val200: '', val100: '', val50: '', val20: '', val10: '', val5: '', val2: '', val1: '', val0_5: '', val0_25: ''
  });

  const [activeAlert, setActiveAlert] = useState<GlobalAlert | null>(null);

  const lastSelectedShopId = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (systemStatus?.reconciliationEnabled && systemStatus?.forcedDate) {
      setSelectedDate(systemStatus.forcedDate);
    }
  }, [systemStatus?.reconciliationEnabled, systemStatus?.forcedDate]);

  useEffect(() => {
    if (showCashCalcModal) {
      setCashDenominations({
        val500: '', val200: '', val100: '', val50: '', val20: '', val10: '', val5: '', val2: '', val1: '', val0_5: '', val0_25: ''
      });
    }
  }, [showCashCalcModal]);

  const calculateTotalCash = () => {
    const d = cashDenominations;
    return (Number(d.val500 || 0)*500) + (Number(d.val200 || 0)*200) + (Number(d.val100 || 0)*100) + 
           (Number(d.val50 || 0)*50) + (Number(d.val20 || 0)*20) + (Number(d.val10 || 0)*10) + 
           (Number(d.val5 || 0)*5) + (Number(d.val2 || 0)*2) + (Number(d.val1 || 0)*1) + 
           (Number(d.val0_5 || 0)*0.5) + (Number(d.val0_25 || 0)*0.25);
  };

  const handleSaveCashReport = () => {
    if (!onUpdateCashReport) return;
    const total = calculateTotalCash();
    const targetDate = (systemStatus?.reconciliationEnabled && systemStatus?.forcedDate) 
        ? systemStatus.forcedDate 
        : getLocalDate();

    const report: CashReport = {
      id: `cashrep_${user.id}_${targetDate}`, 
      userId: user.id,
      username: user.username,
      date: targetDate,
      denominations: {
        val500: Number(cashDenominations.val500),
        val200: Number(cashDenominations.val200),
        val100: Number(cashDenominations.val100),
        val50: Number(cashDenominations.val50),
        val20: Number(cashDenominations.val20),
        val10: Number(cashDenominations.val10),
        val5: Number(cashDenominations.val5),
        val2: Number(cashDenominations.val2),
        val1: Number(cashDenominations.val1),
        val0_5: Number(cashDenominations.val0_5),
        val0_25: Number(cashDenominations.val0_25),
      },
      totalAmount: total,
      timestamp: Date.now()
    };
    onUpdateCashReport(report);
    setShowCashCalcModal(false);
    alert(`✅ تم حفظ عهدة الكاش ليوم (${targetDate}) بنجاح\nالإجمالي: ${total.toLocaleString()} ريال`);
  };

  const isSpotRequested = useMemo(() => {
    if (!isShopUser || !user?.shopId) return false;
    return (systemStatus?.activeSpotRequests || []).includes(user.shopId);
  }, [user, systemStatus?.activeSpotRequests, isShopUser]);

  const uniquePartners = useMemo(() => {
    const parts = new Set<string>();
    availableShops.forEach(s => {
      if (!s.isHaitham && s.partnerName) {
        parts.add(s.partnerName);
      }
    });
    return Array.from(parts).sort();
  }, [availableShops]);

  useEffect(() => {
    const alerts = systemStatus.globalAlerts || [];
    if (alerts.length === 0) return;
    const latestAlert = alerts[alerts.length - 1];
    const isTargeted = (latestAlert.targetRole === user.role) && (latestAlert.targetId === 'all' || latestAlert.targetId === user.username || (user.role === 'partner' && latestAlert.targetId === user.partnerName));
    if (isTargeted) {
      const dismissed = sessionStorage.getItem(`dismissed_${latestAlert.id}`);
      if (!dismissed) {
        setActiveAlert(latestAlert);
      }
    }
  }, [systemStatus.globalAlerts, user]);

  const currentShopReconStats = useMemo(() => {
    if (!isShopUser || !user.shopId) return { count: 0, lastTime: 0, firstReport: null as DailyReport | null };
    
    const shopReports = (allReports || []).filter(r => 
      !r.isDeleted &&
      r.shopId === user.shopId && 
      r.date === selectedDate && 
      r.reportType === 'reconciliation' && 
      !r.isReview
    ).sort((a,b) => a.timestamp - b.timestamp);

    return {
      count: shopReports.length,
      lastTime: shopReports.length > 0 ? shopReports[shopReports.length - 1].timestamp : 0,
      firstReport: shopReports.length > 0 ? shopReports[0] : null
    };
  }, [allReports, isShopUser, user.shopId, selectedDate]);

  const collectorReportForToday = useMemo(() => {
    if (!isShopUser || !user.shopId) return null;
    return (allReports || []).find(r => 
      !r.isDeleted &&
      r.shopId === user.shopId &&
      r.date === selectedDate &&
      r.reportType === 'reconciliation' &&
      r.username !== user.username && 
      r.role !== 'shop_user'
    );
  }, [allReports, isShopUser, user.shopId, selectedDate, user.username]);

  const isDataMismatch = useMemo(() => {
    if (!currentShopReconStats.firstReport || !collectorReportForToday) return false;
    
    const myCash = currentShopReconStats.firstReport.cashReceived;
    const colCash = collectorReportForToday.cashReceived;
    
    return myCash !== colCash;
  }, [currentShopReconStats.firstReport, collectorReportForToday]);

  const showLateFinalClosingAlert = useMemo(() => {
    if (!isShopUser || currentShopReconStats.count !== 1) return false; 
    const oneHour = 60 * 60 * 1000;
    return (Date.now() - currentShopReconStats.lastTime) > oneHour;
  }, [isShopUser, currentShopReconStats]);

  useEffect(() => {
    const shouldAlarm = isSpotRequested || activeAlert || showLateFinalClosingAlert;

    if (shouldAlarm) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});

      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 1000]);
        if (!alarmIntervalRef.current) {
          alarmIntervalRef.current = setInterval(() => {
             navigator.vibrate([500, 200, 500, 200, 1000]);
          }, 3000);
        }
      }
    } else {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (e) {}
      }
      if (navigator.vibrate) navigator.vibrate(0);
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }

    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, [isSpotRequested, activeAlert, showLateFinalClosingAlert]);

  const dismissAlert = () => {
    if (activeAlert) {
      sessionStorage.setItem(`dismissed_${activeAlert.id}`, 'true');
      setActiveAlert(null);
    }
  };

  const myAssignedShops = useMemo(() => {
    const shops = Array.isArray(availableShops) ? availableShops.filter(Boolean) : [];
    if (user?.role === 'shop_user' && user?.shopId) { return shops.filter(s => s.id === user.shopId); }
    if (user?.role === 'partner') { return shops.filter(s => s.partnerName === user.partnerName); }
    if (user?.role === 'reviewer') { return shops; }
    
    if (!assignments) return user?.role === 'haitham_manager' ? [] : shops;
    
    return shops.filter(shop => {
        const isIndividualAssigned = (assignments?.shopIds || []).includes(shop.id);
        const isPartnerAssigned = !shop.isHaitham && (assignments?.partnerNames || []).includes(shop.partnerName || '');
        return isIndividualAssigned || isPartnerAssigned;
    });
  }, [availableShops, assignments, user]);

  const reconciledShopIdsToday = useMemo(() => {
    const shopReportCounts: Record<string, number> = {};
    (allReports || []).forEach(r => {
      if (r && !r.isDeleted && r.date === selectedDate && r.reportType === 'reconciliation' && !r.isReview) {
        shopReportCounts[r.shopId] = (shopReportCounts[r.shopId] || 0) + 1;
      }
    });

    return Object.keys(shopReportCounts).filter(shopId => {
      if (user.role !== 'shop_user') return shopReportCounts[shopId] >= 1;
      return shopReportCounts[shopId] >= 2;
    });
  }, [allReports, selectedDate, user.role]);

  const filteredShopsByReportingStatus = useMemo(() => {
    if (reportType !== 'reconciliation' && partnerTab !== 'entry') return myAssignedShops;
    
    return myAssignedShops.filter(shop => {
        const isAlreadyReconciled = reconciledShopIdsToday.includes(shop.id);
        return !isAlreadyReconciled;
    });
  }, [myAssignedShops, reconciledShopIdsToday, reportType, partnerTab]);

  const shopHistory = useMemo(() => {
    if (!selectedShopId || isShopUser) return null;
    const shopReports = (allReports || []).filter(r => r && !r.isDeleted && r.shopId === selectedShopId);
    const lastRecon = shopReports.filter(r => r.reportType === 'reconciliation' && !r.isReview).sort((a,b) => b.timestamp - a.timestamp)[0];
    const lastSpot = shopReports.filter(r => r.reportType === 'spot-check').sort((a,b) => b.timestamp - a.timestamp)[0];
    return { lastRecon, lastSpot };
  }, [allReports, selectedShopId, isShopUser]);

  const getShopSpotCount = (shopId: string) => {
    return (allReports || []).filter(r => !r.isDeleted && r.shopId === shopId && r.date === selectedDate && r.reportType === 'spot-check' && !r.isReview).length;
  };

  useEffect(() => {
    if (selectedShopId && selectedShopId !== lastSelectedShopId.current) {
      const shop = (availableShops || []).find(s => s && s.id === selectedShopId);
      if (shop) {
        lastSelectedShopId.current = selectedShopId;
        const mStandard: POSMachine[] = (shop.standardTids || []).map((m, i) => { 
           const tid = (typeof m === 'string' ? m : m?.tid) || 'N/A';
           const tripleCode = (typeof m === 'string' ? '' : m?.tripleCode) || '';
           return { id: `s-${tid}-${Date.now()}-${i}`, tid, tripleCode, amount: 0, type: 'standard' as const }; 
        });
        const mHala: POSMachine[] = (shop.halaTids || []).map((m, i) => { 
           const tid = (typeof m === 'string' ? m : m?.tid) || 'N/A';
           const tripleCode = (typeof m === 'string' ? '' : m?.tripleCode) || '';
           return { id: `h-${tid}-${Date.now()}-${i}`, tid, tripleCode, amount: 0, type: 'hala' as const }; 
        });
        setPosMachines([...mStandard, ...mHala]); 
        setCashAmount(''); 
        setCommissionAmount('');
      }
    }
  }, [selectedShopId, availableShops]);

  // Request Handlers
  const handleAddShopRequest = () => { 
    if (!newShopData.requestedName || !newShopData.requestedLocation) return alert('يرجى إكمال البيانات الأساسية');
    if (!newShopData.isHaitham && !newShopData.partnerName) return alert('يرجى اختيار الشريك من القائمة');
    if (newShopData.initialTid) {
        if (!/^\d{8}$/.test(newShopData.initialTid)) {
            return alert('رقم TID غير صحيح. يجب أن يتكون من 8 أرقام فقط.');
        }
    }
    onAddShopRequest({ id: `sreq-${Date.now()}`, userId: user.id, username: user.username, requestedName: newShopData.requestedName!, requestedLocation: newShopData.requestedLocation!, requestedCategory: newShopData.requestedCategory || 'عام', isHaitham: !!newShopData.isHaitham, partnerName: newShopData.partnerName, initialTid: newShopData.initialTid, initialTripleCode: newShopData.initialTripleCode, status: 'pending', requestDate: Date.now() });
    setShowShopRequestModal(false); setNewShopData({ isHaitham: true }); alert('✅ تم إرسال طلب إضافة المحل بنجاح بانتظار اعتماد الإدارة');
  };

  const handleAddMachineRequest = () => { 
    if (!newMachineData.tid) return alert('يرجى إدخال رقم TID');
    if (!/^\d{8}$/.test(newMachineData.tid)) {
        return alert('رقم TID غير صحيح. يجب أن يتكون من 8 أرقام فقط.');
    }
    const shop = availableShops.find(s => s.id === (newMachineData.shopId || selectedShopId));
    if (!shop) return alert('خطأ في تحديد المحل');
    onAddMachineRequest({ id: `mreq-${Date.now()}`, shopId: shop.id, shopName: shop.name, tid: newMachineData.tid!, tripleCode: newMachineData.tripleCode, type: newMachineData.type || 'standard', zReportImage: newMachineData.zReportImage, status: 'pending', username: user.username, requestDate: Date.now() });
    setShowMachineRequestModal(false); setNewMachineData({ type: 'standard' }); alert('✅ تم إرسال طلب إضافة الماكينة بنجاح بانتظار اعتماد الإدارة');
  };

  const handleRenameRequest = () => { 
    if (!renameData.newName) return alert('يرجى كتابة الاسم الجديد');
    const shop = availableShops.find(s => s.id === (renameData.shopId || selectedShopId));
    if (!shop) return alert('خطأ في تحديد المحل');
    if (onAddRenameRequest) { onAddRenameRequest({ id: `rnreq-${Date.now()}`, shopId: shop.id, oldName: shop.name, newName: renameData.newName, status: 'pending', username: user.username, requestDate: Date.now() }); setShowRenameRequestModal(false); setRenameData({ shopId: '', newName: '' }); alert('✅ تم إرسال طلب تعديل الاسم بنجاح بانتظار اعتماد الإدارة'); }
  };

  const handlePartnerEntryChange = (shopId: string, field: 'cash' | 'commission', value: number) => {
    setPartnerEntryData(prev => ({ ...prev, [shopId]: { ...(prev[shopId] || { cash: 0, commission: 0 }), [field]: value } }));
  };
  const handlePartnerMachineChange = (shopId: string, tid: string, amount: number) => {
    setPartnerMachineData(prev => ({ ...prev, [shopId]: { ...(prev[shopId] || {}), [tid]: amount } }));
  };
  const submitPartnerBulk = () => {
    const activeShops = filteredShopsByReportingStatus.filter(shop => {
        const cashCommData = partnerEntryData[shop.id];
        const machineData = partnerMachineData[shop.id] || {};
        const totalMachines = Object.values(machineData as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
        const hasCash = (Number(cashCommData?.cash) || 0) > 0;
        const hasCommission = (Number(cashCommData?.commission) || 0) > 0;
        return totalMachines > 0 || hasCash || hasCommission;
    });
    if (activeShops.length === 0) return alert('يرجى إدخال بيانات لمحل واحد على الأقل');
    if (!window.confirm(`هل أنت متأكد من إرسال تقفيل لعدد ${activeShops.length} محلات؟`)) return;
    activeShops.forEach(shop => {
      if (reconciledShopIdsToday.includes(shop.id)) return;
      const shopMachineEntries = partnerMachineData[shop.id] || {};
      const shopCashComm = partnerEntryData[shop.id] || { cash: 0, commission: 0 };
      const mStandard: POSMachine[] = (shop.standardTids || []).map((m, i) => { const tid = (typeof m === 'string' ? m : m?.tid) || 'N/A'; const tripleCode = (typeof m === 'string' ? '' : m?.tripleCode) || ''; return { id: `s-${tid}-${Date.now()}-${i}`, tid, tripleCode, amount: shopMachineEntries[tid] || 0, type: 'standard' as const }; });
      const mHala: POSMachine[] = (shop.halaTids || []).map((m, i) => { const tid = (typeof m === 'string' ? m : m?.tid) || 'N/A'; const tripleCode = (typeof m === 'string' ? '' : m?.tripleCode) || ''; return { id: `h-${tid}-${Date.now()}-${i}`, tid, tripleCode, amount: shopMachineEntries[tid] || 0, type: 'hala' as const }; });
      onAddReport({ id: `rep-${Date.now()}-${Math.random()}`, userId: user?.username || 'unknown', username: user?.username || 'unknown', shopId: shop.id, shopName: shop.name, location: shop.location, category: shop.category, partnerName: shop.partnerName, isHaitham: shop.isHaitham, date: selectedDate, reportType: 'reconciliation', posMachines: [...mStandard, ...mHala], cashReceived: (shop.isHaitham) ? shopCashComm.cash : 0, cashRemaining: (shop.isHaitham) ? 0 : shopCashComm.cash, commission: shopCashComm.commission || 0, timestamp: Date.now(), isReview: user?.role === 'reviewer' });
    });
    setPartnerEntryData({}); setPartnerMachineData({}); alert('✅ تم إرسال كافة التقارير بنجاح');
  };

  const partnerFilteredReports = useMemo(() => {
    if (!isManagerType) return [];
    return allReports.filter(r => !r.isDeleted && r.username === user.username && r.date >= partnerStartDate && r.date <= partnerEndDate && (partnerStatsShopId === 'all' || r.shopId === partnerStatsShopId)).sort((a,b) => b.timestamp - a.timestamp);
  }, [allReports, user, partnerStartDate, partnerEndDate, partnerStatsShopId, isManagerType]);

  const partnerShopsPerformance = useMemo(() => {
    if (!isManagerType) return [];
    return myAssignedShops.map(shop => {
      const shopReports = allReports.filter(r => !r.isDeleted && r.shopId === shop.id && r.username === user.username && r.date >= partnerStartDate && r.date <= partnerEndDate && r.reportType === 'reconciliation');
      const mTotal = shopReports.reduce((s, r) => s + (r.posMachines?.reduce((sm, m) => sm + (m.amount || 0), 0) || 0), 0);
      const cTotal = shopReports.reduce((s, r) => s + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0);
      return { ...shop, mTotal, cTotal, grand: mTotal + cTotal, count: shopReports.length };
    }).sort((a,b) => b.grand - a.grand);
  }, [allReports, myAssignedShops, partnerStartDate, partnerEndDate, user, isManagerType]);

  // Manager View
  if (isManagerType) {
    const isHaithamGroup = user.role === 'haitham_manager';
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 text-right animate-in fade-in">
        {activeAlert && (
          <div className="fixed inset-0 bg-red-600 z-[2000] flex items-center justify-center p-8 text-center animate-in zoom-in">
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-2xl w-full border-8 border-red-800">
                <div className="w-32 h-32 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 animate-bounce">🚨</div>
                <h2 className="text-4xl font-black text-red-700 mb-6 uppercase tracking-tighter">إنذار إداري عاجل</h2>
                <p className="text-2xl font-bold text-gray-800 mb-10 leading-relaxed">{activeAlert.message}</p>
                <button onClick={dismissAlert} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-red-700 active:scale-95 transition-all">علم، إيقاف التنبيه ✅</button>
             </div>
          </div>
        )}
        <div className={`bg-gradient-to-r ${isHaithamGroup ? 'from-indigo-600 to-indigo-500' : 'from-orange-600 to-orange-500'} p-8 rounded-[3rem] text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6`}>
          <div className="flex items-center gap-4"><div className="w-16 h-16 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-3xl">{isHaithamGroup ? '👑' : '🤝'}</div><div><h3 className="text-3xl font-black uppercase tracking-tight">{isHaithamGroup ? 'مسؤول مجموعة هيثم' : 'لوحة تحكم الشريك'}</h3><p className="text-sm font-bold opacity-80 mt-1 uppercase tracking-widest">{isHaithamGroup ? user.username : user?.partnerName || 'N/A'}</p></div></div>
          <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/20">
            <button onClick={() => setPartnerTab('entry')} className={`px-6 py-3 rounded-xl font-black text-[11px] transition-all ${partnerTab === 'entry' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white hover:bg-white/10'}`}>إدخال المبيعات 📝</button>
            <button onClick={() => setPartnerTab('shops_list')} className={`px-6 py-3 rounded-xl font-black text-[11px] transition-all ${partnerTab === 'shops_list' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white hover:bg-white/10'}`}>أداء المحلات 🏢</button>
            <button onClick={() => setPartnerTab('stats')} className={`px-6 py-3 rounded-xl font-black text-[11px] transition-all ${partnerTab === 'stats' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white hover:bg-white/10'}`}>سجل التقارير 📊</button>
          </div>
        </div>
        {partnerTab === 'entry' && (<div className="space-y-6"><div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-wrap gap-4 items-center justify-between"><div className="flex items-center gap-4"><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">تاريخ التقفيل</label><input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-indigo-600 disabled:opacity-50 disabled:bg-gray-100" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} disabled={!!(systemStatus?.reconciliationEnabled && systemStatus?.forcedDate)} /></div><div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">بحث سريع</label><input type="text" placeholder="اسم المحل..." className="p-3 pr-10 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-indigo-600 w-64" value={partnerSearch} onChange={e=>setPartnerSearch(e.target.value)} /><span className="absolute right-3 bottom-3 text-gray-300">🔍</span></div></div><button onClick={submitPartnerBulk} className={`text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${isHaithamGroup ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'}`}>إرسال تقفيل كافة المحلات ✅</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredShopsByReportingStatus.filter(s => s && s.name?.includes(partnerSearch)).map(shop => { const allShopMachines = [...(shop.standardTids || []), ...(shop.halaTids || [])]; return (<div key={shop.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all group border-transparent hover:border-indigo-100"><div className="flex justify-between items-start mb-4 border-b pb-3"><div><h4 className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{shop.name}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">{shop.location}</p></div><span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isHaithamGroup ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>🏢</span></div><div className="space-y-4"><div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">تفاصيل الماكينات (TIDs)</p><div className="space-y-2">{allShopMachines.map((m, i) => { const tid = typeof m === 'string' ? m : m.tid; return (<div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-indigo-600 font-mono tracking-tighter">{tid}</span><input type="number" placeholder="0" className="w-24 p-2 text-center bg-gray-50 border rounded-md font-black text-sm outline-none focus:bg-indigo-50 focus:border-indigo-200 transition-colors" value={partnerMachineData[shop.id]?.[tid] || ''} onChange={(e) => handlePartnerMachineChange(shop.id, tid, Number(e.target.value))} /></div>) })}{allShopMachines.length === 0 && (<p className="text-[9px] text-gray-400 text-center italic py-2">لا توجد ماكينات معرفة لهذا المحل</p>)}</div></div><div><label className="text-[9px] font-black text-gray-400 uppercase pr-2">{isHaithamGroup ? 'الكاش المحصل' : 'الكاش المتبقي (بالدرج)'}</label><input type="number" placeholder="0.00" className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-center text-xl outline-none focus:border-indigo-600 focus:bg-white" value={partnerEntryData[shop.id]?.cash || ''} onChange={e => handlePartnerEntryChange(shop.id, 'cash', Number(e.target.value))} /></div><div><label className={`text-[9px] font-black uppercase pr-2 ${isHaithamGroup ? 'text-indigo-400' : 'text-orange-400'}`}>العمولة (اختياري)</label><input type="number" placeholder="0.00" className="w-full p-4 bg-gray-50/50 border rounded-2xl font-black text-center text-lg outline-none focus:border-indigo-600 focus:bg-white" value={partnerEntryData[shop.id]?.commission || ''} onChange={e => handlePartnerEntryChange(shop.id, 'commission', Number(e.target.value))} /></div></div></div>); })}{filteredShopsByReportingStatus.length === 0 && (<div className="col-span-full p-20 text-center bg-white rounded-[3rem] border border-dashed text-gray-400 font-black uppercase">لقد تم تقفيل كافة المحلات المخصصة لك اليوم ✅</div>)}</div></div>)}
        {partnerTab === 'stats' && (/* ... Existing Stats UI ... */ <div className="space-y-6 animate-in slide-in-from-bottom-4"><div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-wrap gap-4 items-end"><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">من تاريخ</label><input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-indigo-600" value={partnerStartDate} onChange={e=>setPartnerStartDate(e.target.value)} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">إلى تاريخ</label><input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-indigo-600" value={partnerEndDate} onChange={e=>setPartnerEndDate(e.target.value)} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">تصفية بالمحل</label><select className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none min-w-[200px]" value={partnerStatsShopId} onChange={e=>setPartnerStatsShopId(e.target.value)}><option value="all">كافة المحلات</option>{myAssignedShops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div><div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden"><table className="w-full text-right table-auto"><thead className="bg-gray-50 border-b text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest"><tr><th className="p-1 md:p-6">المحل / الموظف</th><th className="p-1 md:p-6 text-center">الماكينات</th><th className="p-1 md:p-6 text-center">الكاش</th><th className="p-1 md:p-6 text-center">العمولة</th><th className="p-1 md:p-6 text-center text-indigo-600 font-black">الإجمالي</th><th className="p-1 md:p-6 text-center">التاريخ</th></tr></thead><tbody className="divide-y text-[7px] md:text-xs font-bold">{partnerFilteredReports.map(r => { const mSum = (r.posMachines?.reduce((s,m)=>s+(m.amount||0),0)||0); const netC = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0); return (<tr key={r.id} className="hover:bg-gray-50 transition-colors"><td className="p-1 md:p-6"><div><p className="text-gray-900 font-black whitespace-normal break-words">{r.shopName}</p><p className="text-[7px] md:text-[9px] text-gray-400 uppercase">{r.username}</p></div></td><td className="p-1 md:p-6 text-center"><div className="flex flex-col items-center gap-1">{r.posMachines?.filter(m => m.amount > 0).map((m, idx) => (<div key={idx} className="text-[7px] md:text-[9px] text-gray-500 font-bold whitespace-nowrap"><span className="text-indigo-500">{m.tid}</span>: {m.amount.toLocaleString()}</div>))}<div className="border-t border-gray-200 mt-1 pt-1 font-black text-[8px] md:text-sm text-indigo-900">{mSum.toLocaleString()}</div></div></td><td className="p-1 md:p-6 text-center text-green-600">{netC.toLocaleString()}</td><td className="p-1 md:p-6 text-center text-orange-600">{r.commission.toLocaleString()}</td><td className="p-1 md:p-6 text-center text-indigo-600 font-black text-[8px] md:text-base">{(mSum + netC).toLocaleString()}</td><td className="p-1 md:p-6 text-center whitespace-nowrap">{r.date}</td></tr>); })}{partnerFilteredReports.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-300 font-black uppercase tracking-widest">لا توجد سجلات خاصة بك لهذه الفترة</td></tr>}</tbody></table></div></div>)}
        {partnerTab === 'shops_list' && (/* ... Existing Shops List UI ... */ <div className="space-y-6 animate-in slide-in-from-bottom-4"><div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-wrap gap-4 items-end"><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">من تاريخ</label><input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-indigo-600" value={partnerStartDate} onChange={e=>setPartnerStartDate(e.target.value)} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">إلى تاريخ</label><input type="date" className="p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-indigo-600" value={partnerEndDate} onChange={e=>setPartnerEndDate(e.target.value)} /></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{partnerShopsPerformance.map(item => (<div key={item.id} className="bg-white p-8 rounded-[3rem] border shadow-sm hover:shadow-md transition-all group border-transparent hover:border-indigo-100"><div className="flex justify-between items-start mb-6 border-b pb-4"><div><h4 className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{item.name}</h4><p className="text-[10px] text-gray-400 uppercase">{item.location}</p></div><span className={`px-4 py-1 rounded-full text-[9px] font-black ${isHaithamGroup ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>{item.count} تقرير تقفيل منك</span></div><div className="grid grid-cols-2 gap-4"><div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">إجمالي ماكيناتك</p><p className="text-xl font-black text-gray-900">{item.mTotal.toLocaleString()}</p></div><div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">صافي كاشك</p><p className="text-xl font-black text-green-600">{item.cTotal.toLocaleString()}</p></div></div><div className={`mt-6 p-6 rounded-[2rem] text-center shadow-lg transform transition-transform group-hover:scale-[1.02] text-white ${isHaithamGroup ? 'bg-indigo-600' : 'bg-orange-600'}`}><p className="text-[11px] font-bold opacity-80 uppercase mb-1 tracking-widest">إجمالي مدخلاتك الشخصية</p><p className="text-3xl font-black">{item.grand.toLocaleString()}</p></div></div>))}</div></div>)}
      </div>
    );
  }

  // SHOP USER & FIELD COLLECTOR VIEW
  if (!reportType) {
    return (
      <div className={`max-w-4xl mx-auto py-12 px-4 ${isShopUser ? 'text-left' : 'text-right'}`} dir={isShopUser ? 'ltr' : 'rtl'}>
        {activeAlert && (
          <div className="fixed inset-0 bg-red-600 z-[2000] flex items-center justify-center p-8 text-center animate-in zoom-in">
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-2xl w-full border-8 border-red-800">
                <div className="w-32 h-32 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 animate-bounce">🚨</div>
                <h2 className="text-4xl font-black text-red-700 mb-6 uppercase tracking-tighter">
                  {isShopUser ? 'URGENT ADMIN ALERT' : 'إنذار إداري عاجل'}
                </h2>
                <p className="text-2xl font-bold text-gray-800 mb-10 leading-relaxed">{activeAlert.message}</p>
                <button onClick={dismissAlert} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-red-700 active:scale-95 transition-all">
                  {isShopUser ? 'ACKNOWLEDGED, STOP ALARM ✅' : 'علم، إيقاف التنبيه ✅'}
                </button>
             </div>
          </div>
        )}

        {showLateFinalClosingAlert && !activeAlert && (
          <div className="fixed inset-0 bg-red-600/90 z-[2000] flex items-center justify-center p-8 text-center animate-pulse backdrop-blur-md">
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-2xl w-full border-8 border-red-800">
                <div className="w-32 h-32 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 animate-bounce">⏳</div>
                <h2 className="text-3xl font-black text-red-700 mb-6 uppercase tracking-tighter">
                  {isShopUser ? 'LATE FINAL CLOSING' : '⚠️ تأخير في التقفيل النهائي'}
                </h2>
                <p className="text-xl font-bold text-gray-800 mb-10 leading-relaxed">
                  {isShopUser 
                    ? 'More than an hour has passed since the first closing. Please enter Final Closing data immediately!'
                    : 'لقد مر أكثر من ساعة على التقفيل الأول. يرجى إدخال بيانات التقفيل النهائي فوراً!'}
                </p>
                <button onClick={() => setReportType('reconciliation')} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-red-700 active:scale-95 transition-all">
                  {isShopUser ? 'Enter Final Closing Now ✅' : 'إدخال التقفيل النهائي الآن ✅'}
                </button>
             </div>
          </div>
        )}

        {isSpotRequested && !activeAlert && !showLateFinalClosingAlert && (
          <div className="fixed inset-x-0 top-0 z-[1000] bg-red-600 p-8 text-white shadow-2xl text-center animate-bounce">
            <h3 className="text-3xl font-black mb-2 uppercase">{isShopUser ? 'REVIEW REQUIRED' : '⚠️ مطلوب مراجعة'}</h3>
            <div className="mt-4 flex justify-center gap-4">
              <button onClick={() => setReportType('spot-check')} className="bg-white text-red-600 px-8 py-3 rounded-2xl font-black text-xl shadow-lg">{isShopUser ? 'Enter Data Now ✅' : 'إدخال البيانات الآن ✅'}</button>
            </div>
          </div>
        )}
        
        {!isShopUser && (
           <div className="mb-6 flex justify-center animate-in slide-in-from-top-4">
              <button 
                onClick={() => setShowCashCalcModal(true)}
                className="bg-yellow-400 text-yellow-900 w-full max-w-md p-6 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 hover:bg-yellow-300 transition-all transform active:scale-95 border-4 border-yellow-200"
              >
                 <span>🧮</span>
                 <span>حاسبة العهدة اليومية (الكاش)</span>
              </button>
           </div>
        )}

        <div className="bg-white border-2 border-indigo-100 p-8 rounded-[3rem] mb-10 text-center shadow-lg relative overflow-hidden">
          <span className="text-4xl block mb-2">💰</span>
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">{isShopUser ? 'Daily Closing Summary' : 'ملخص التقفيل اليومي'}</h3>
          
          {(() => {
             const todaysReports = (allReports || []).filter(r => 
                r && !r.isDeleted && 
                r.userId === user?.username && 
                r.date === selectedDate && 
                r.reportType === 'reconciliation' && 
                !r.isReview
             );

             if (isShopUser) {
                const totalCash = todaysReports.reduce((sum, r) => sum + (r.cashReceived || 0), 0);
                const totalCommission = todaysReports.reduce((sum, r) => sum + (r.commission || 0), 0);
                const totalNet = totalCash - totalCommission;
                
                return (
                  <div className="flex flex-wrap justify-center gap-4">
                      <div className="flex-1 min-w-[100px] p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Cash</p>
                        <p className="text-xl font-black text-gray-900">{totalCash.toLocaleString()}</p>
                      </div>
                      <div className="flex-1 min-w-[100px] p-3 rounded-2xl bg-orange-50 border border-orange-100">
                        <p className="text-[9px] font-black text-orange-400 uppercase mb-1">Total Commission</p>
                        <p className="text-xl font-black text-orange-600">{totalCommission.toLocaleString()}</p>
                      </div>
                      <div className="w-full md:w-auto min-w-[140px] p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                        <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Net</p>
                        <p className="text-3xl font-black text-indigo-600">{totalNet.toLocaleString()}</p>
                      </div>
                  </div>
                );
             } else {
                // COLLECTOR VIEW LOGIC
                const haithamReports = todaysReports.filter(r => r.isHaitham);
                const partnerReports = todaysReports.filter(r => !r.isHaitham);

                const haithamCollected = haithamReports.reduce((a,b) => a + (b.cashReceived || 0), 0);
                const haithamComm = haithamReports.reduce((a,b) => a + (b.commission || 0), 0);
                const haithamNet = haithamCollected - haithamComm;

                const globalComm = todaysReports.reduce((a,b) => a + (b.commission || 0), 0);
                const partnerInDrawer = partnerReports.reduce((a,b) => a + (b.cashRemaining || 0), 0);

                return (
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                        <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">كاش هيثم (المحصل)</p>
                        <p className="text-xl font-black text-indigo-900">{haithamCollected.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100">
                        <p className="text-[9px] font-black text-orange-400 uppercase mb-1">إجمالي العمولة (الكل)</p>
                        <p className="text-xl font-black text-orange-600">{globalComm.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-green-50 border border-green-100">
                        <p className="text-[9px] font-black text-green-600 uppercase mb-1">صافي تحصيل هيثم</p>
                        <p className="text-2xl font-black text-green-700">{haithamNet.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">كاش الشركاء (بالدرج/غير محصل)</p>
                        <p className="text-2xl font-black text-gray-600">{partnerInDrawer.toLocaleString()}</p>
                      </div>
                  </div>
                );
             }
          })()}
        </div>

        {isShopUser && isDataMismatch && (
           <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] mb-10 text-center animate-pulse">
              <span className="text-4xl block mb-2">🚩</span>
              <h3 className="text-lg font-black text-red-600 uppercase mb-2">DATA MISMATCH DETECTED</h3>
              <p className="text-xs font-bold text-red-400">Your first closing data does not match the collector's data for today.</p>
           </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter">{isShopUser ? 'Global Street Shop System' : 'نظام التحصيل الميداني'}</h2>
          <p className="text-gray-400 font-bold text-xs uppercase mb-4">{isShopUser ? `Welcome, ${user?.username}` : `أهلاً بك، ${user?.username}`}</p>
          <button onClick={() => onRefreshStatus?.()} className="inline-flex items-center gap-2 bg-white border px-4 py-2 rounded-full text-[10px] font-black text-indigo-600 shadow-sm transition-all active:scale-95">{isShopUser ? 'Refresh Status 🔄' : 'تحديث الحالة 🔄'}</button>
        </div>

        <div className="max-w-xs mx-auto mb-10 bg-white p-4 rounded-3xl border-2 border-indigo-50 shadow-sm flex flex-col items-center">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
              {isShopUser ? 'SELECTED OPERATION DATE' : 'تاريخ التقفيل / المراجعة'}
            </label>
            <input 
              type="date" 
              className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-center text-lg outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner disabled:opacity-50 disabled:bg-gray-100" 
              value={selectedDate} 
              onChange={e=>setSelectedDate(e.target.value)} 
              disabled={!!(systemStatus?.reconciliationEnabled && systemStatus?.forcedDate)}
            />
            {systemStatus?.reconciliationEnabled && systemStatus?.forcedDate ? (
              <p className="text-[9px] text-indigo-600 mt-2 font-bold uppercase animate-pulse">
                {isShopUser ? 'Date locked by Admin' : 'تم تحديد التاريخ من الإدارة'} 🔒
              </p>
            ) : (
              <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase italic text-center opacity-70">
                {isShopUser ? '* Change if reporting for yesterday' : '* غير التاريخ لو بتقفل مبيعات "أمس" بعد الساعة 12'}
              </p>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <button onClick={() => setReportType('spot-check')} className="p-12 bg-white rounded-[3rem] border-4 border-indigo-50 hover:border-indigo-600 transition-all shadow-xl text-center group relative overflow-hidden">
            <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🔍</span>
            <h3 className="text-2xl font-black text-indigo-900 uppercase">{isShopUser ? 'Spot Check' : 'متابعة (Spot)'}</h3>
          </button>
          <button 
            onClick={() => { if(!systemStatus?.reconciliationEnabled) return alert(isShopUser ? 'Closing gate is locked' : 'بوابة التقفيل مغلقة'); setReportType('reconciliation'); }} 
            className={`w-full p-12 bg-white rounded-[3rem] border-4 transition-all shadow-xl text-center group relative overflow-hidden ${(systemStatus?.reconciliationEnabled) ? 'border-green-50 hover:border-green-600' : 'opacity-60 grayscale border-red-100'}`}
          >
            <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">{(systemStatus?.reconciliationEnabled) ? '💰' : '🔒'}</span>
            <h3 className="text-2xl font-black text-green-900 uppercase">{isShopUser ? 'Final Closing' : 'التقفيل النهائي'}</h3>
            {isShopUser && currentShopReconStats.count === 1 && (
              <span className="block mt-2 text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full animate-pulse">Final Closing Required (2/2)</span>
            )}
          </button>
        </div>

        {showCashCalcModal && (
          <div className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h3 className="text-xl font-black text-yellow-600 uppercase">🧮 حاسبة العهدة اليومية</h3>
                  <button onClick={() => setShowCashCalcModal(false)} className="text-gray-400 font-black text-2xl">&times;</button>
               </div>
               
               <div className="space-y-3 mb-6">
                  {[
                    { label: '500 ريال', key: 'val500', mult: 500 },
                    { label: '200 ريال', key: 'val200', mult: 200 },
                    { label: '100 ريال', key: 'val100', mult: 100 },
                    { label: '50 ريال', key: 'val50', mult: 50 },
                    { label: '20 ريال', key: 'val20', mult: 20 },
                    { label: '10 ريال', key: 'val10', mult: 10 },
                    { label: '5 ريال', key: 'val5', mult: 5 },
                    { label: '2 ريال', key: 'val2', mult: 2 },
                    { label: '1 ريال', key: 'val1', mult: 1 },
                    { label: '0.50 هللة', key: 'val0_5', mult: 0.5 },
                    { label: '0.25 هللة', key: 'val0_25', mult: 0.25 },
                  ].map((denom) => (
                    <div key={denom.key} className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl">
                       <label className="w-24 text-xs font-black text-gray-500">{denom.label}</label>
                       <input 
                         type="number" 
                         className="flex-1 p-3 bg-white border rounded-lg font-black text-center text-lg outline-none focus:border-yellow-400" 
                         placeholder="العدد"
                         value={(cashDenominations as any)[denom.key]}
                         onChange={(e) => setCashDenominations(prev => ({ ...prev, [denom.key]: e.target.value }))}
                         onWheel={(e) => e.currentTarget.blur()}
                       />
                       <span className="w-24 text-xs font-black text-indigo-600 text-left">
                          = {((Number((cashDenominations as any)[denom.key]) || 0) * denom.mult).toLocaleString()}
                       </span>
                    </div>
                  ))}
               </div>

               <div className="bg-indigo-900 text-white p-6 rounded-[1.5rem] text-center mb-6">
                  <p className="text-xs font-black opacity-70 uppercase mb-2">إجمالي العهدة (الكاش)</p>
                  <p className="text-4xl font-black text-yellow-400">{calculateTotalCash().toLocaleString()} <span className="text-sm">ريال</span></p>
               </div>

               <button 
                 onClick={handleSaveCashReport}
                 className="w-full py-4 bg-yellow-500 text-white rounded-[1.5rem] font-black text-lg shadow-lg hover:bg-yellow-600 active:scale-95 transition-all"
               >
                 حفظ وإرسال للإدارة ✅
               </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentSelectedShop = (availableShops || []).find(s => s && s.id === selectedShopId);

  return (
    <div className={`max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 ${isShopUser ? 'text-left' : 'text-right'} animate-in fade-in`} dir={isShopUser ? 'ltr' : 'rtl'}>
       <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm sticky top-24 space-y-4">
             <button onClick={() => { setReportType(null); setSelectedShopId(user?.shopId || ''); lastSelectedShopId.current = ''; }} className="w-full py-4 bg-gray-50 rounded-2xl text-[10px] font-black text-gray-400 hover:text-indigo-600 transition-all">
               {isShopUser ? '← Back to Menu' : '← العودة للقائمة'}
             </button>
             
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">{isShopUser ? 'Selected Date' : 'تاريخ العملية المختار'}</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl font-black text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  value={selectedDate} 
                  onChange={e=>setSelectedDate(e.target.value)} 
                  disabled={!!(systemStatus?.reconciliationEnabled && systemStatus?.forcedDate)}
                />
                {systemStatus?.reconciliationEnabled && systemStatus?.forcedDate && (
                  <p className="text-[8px] text-indigo-600 font-bold text-center">Locked by Admin 🔒</p>
                )}
             </div>

             <div className="bg-indigo-50 p-4 rounded-2xl text-center border border-indigo-100">
               <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">{isShopUser ? 'Current Report Type' : 'نوع التقرير الحالي'}</p>
               <p className="text-xl font-black text-indigo-900">
                 {reportType === 'reconciliation' ? (isShopUser ? '💰 Final Closing' : '💰 تقفيل نهائي') : (isShopUser ? '🔍 Spot Check' : '🔍 متابعة سبوت')}
               </p>
               {isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1 && (
                 <p className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-1 rounded-lg mt-2 animate-pulse">⚠️ This is the 2nd (Final) Closing</p>
               )}
             </div>
             
             {user?.role !== 'shop_user' && (
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setOwnerType('haitham')} className={`py-4 rounded-2xl font-black text-[10px] transition-all ${ownerType === 'haitham' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 border'}`}>هيثم</button>
                 <button onClick={() => setOwnerType('partner')} className={`py-4 rounded-2xl font-black text-[10px] transition-all ${ownerType === 'partner' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 border'}`}>شريك</button>
               </div>
             )}
             <select 
               className="w-full p-4 bg-indigo-50 text-indigo-900 rounded-2xl font-black text-xs border border-indigo-100 outline-none shadow-inner" 
               disabled={user?.role === 'shop_user'} 
               value={selectedShopId} 
               onChange={e => setSelectedShopId(e.target.value)}
             >
               <option value="">{isShopUser ? '-- Select Shop --' : '-- اختر المحل --'}</option>
               {filteredShopsByReportingStatus.filter(s => s && (ownerType === 'haitham' ? s.isHaitham : ownerType === 'partner' ? !s.isHaitham : true)).map(s => {
                 const spotCount = getShopSpotCount(s.id);
                 return (
                   <option key={s.id} value={s.id}>
                     {s.name} {spotCount > 0 ? `(🔍 ${spotCount})` : ''}
                   </option>
                 );
               })}
             </select>

             {!isShopUser && (
                <button onClick={() => setShowShopRequestModal(true)} className="w-full py-4 bg-white border border-indigo-100 rounded-2xl text-[10px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                   ➕ طلب إضافة محل جديد للقائمة
                </button>
             )}

             {selectedShopId && !isShopUser && shopHistory && (
               <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">بيانات سابقة للمقارنة 📜</h4>
                  
                  {shopHistory.lastRecon && (
                    <div className="bg-green-50 border-2 border-green-100 p-5 rounded-[2rem] shadow-sm">
                       <p className="text-[9px] font-black text-green-600 uppercase mb-2 border-b border-green-200 pb-1">آخر تقفيل نهائي تفصيلي</p>
                       <div className="space-y-1 mb-3">
                          {shopHistory.lastRecon.posMachines?.map((m, i) => (
                            <div key={i} className="flex justify-between text-[10px] font-bold text-green-900">
                               <span>TID {m.tid}:</span>
                               <span>{m.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[11px] font-black text-green-900 pt-1 border-t border-green-200">
                             <span>صافي الكاش:</span>
                             <span>{((shopHistory.lastRecon.cashReceived || 0) + (shopHistory.lastRecon.cashRemaining || 0) - (shopHistory.lastRecon.commission || 0)).toLocaleString()}</span>
                          </div>
                       </div>
                       <div className="bg-white p-3 rounded-xl border border-green-200 text-center">
                          <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">وقت التقفيل</p>
                          <p className="text-2xl font-black text-green-600 leading-none">
                            {new Date(shopHistory.lastRecon.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1">
                            {new Date(shopHistory.lastRecon.timestamp).toLocaleDateString('ar-EG')}
                          </p>
                       </div>
                    </div>
                  )}

                  {shopHistory.lastSpot && (
                    <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-[2rem] shadow-sm">
                       <p className="text-[9px] font-black text-amber-600 uppercase mb-2 border-b border-amber-200 pb-1">آخر متابعة (Spot Check)</p>
                       <div className="space-y-1 mb-3">
                          {shopHistory.lastSpot.posMachines?.map((m, i) => (
                            <div key={i} className="flex justify-between text-[10px] font-bold text-amber-900">
                               <span>TID {m.tid}:</span>
                               <span>{m.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[11px] font-black text-amber-900 pt-1 border-t border-amber-200">
                             <span>الكاش الموجود:</span>
                             <span>{((shopHistory.lastSpot.cashReceived || 0) + (shopHistory.lastSpot.cashRemaining || 0)).toLocaleString()}</span>
                          </div>
                       </div>
                       <div className="bg-white p-3 rounded-xl border border-amber-200 text-center">
                          <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">وقت المتابعة</p>
                          <p className="text-2xl font-black text-amber-600 leading-none">
                            {new Date(shopHistory.lastSpot.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1">
                            {new Date(shopHistory.lastSpot.timestamp).toLocaleDateString('ar-EG')}
                          </p>
                       </div>
                    </div>
                  )}
               </div>
             )}
          </div>
       </div>

       <div className="lg:col-span-2 space-y-6">
          {selectedShopId ? (
            <div className="bg-white p-10 rounded-[3rem] border shadow-xl animate-in slide-in-from-bottom-4">
               <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b pb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">{currentSelectedShop?.name}</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{currentSelectedShop?.location}</p>
                  </div>
                  {!isShopUser && (
                    <div className="flex gap-2">
                      <button onClick={() => { setNewMachineData({ shopId: selectedShopId, type: 'standard' }); setShowMachineRequestModal(true); }} className="px-4 py-2 bg-green-50 text-green-600 border border-green-100 rounded-xl font-black text-[10px] hover:bg-green-600 hover:text-white transition-all">🏧 إضافة ماكينة</button>
                      <button onClick={() => { setRenameData({ shopId: selectedShopId, newName: currentSelectedShop?.name || '' }); setShowRenameRequestModal(true); }} className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl font-black text-[10px] hover:bg-orange-600 hover:text-white transition-all">✏️ تعديل الاسم</button>
                    </div>
                  )}
               </div>

               <div className="space-y-6 mb-10">
                 {(posMachines || []).map((m, idx) => m && (
                    <div key={m.id || idx} className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">🏧 TID: {m.tid}</span>
                        <button onClick={() => {
                          const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
                          input.onchange = (e: any) => {
                            const f = e.target.files[0];
                            if(f) { const r = new FileReader(); r.onload = async(re) => { const c = await compressImage(re.target?.result as string); setPosMachines(p => p.map((it, i) => i === idx ? { ...it, zReportImage: c } : it)); }; r.readAsDataURL(f); }
                          }; input.click();
                        }} className={`text-[8px] font-black px-4 py-2 rounded-full shadow-sm transition-all ${m.zReportImage ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-600 animate-pulse border border-red-100'}`}>
                          {m.zReportImage ? (isShopUser ? '✅ Report Captured' : '✅ تم تصوير التقرير') : (isShopUser ? '📸 Capture Z-Report' : '📸 تصوير Z-Report')}
                        </button>
                      </div>
                      <input 
                        type="number" 
                        className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl text-center text-2xl font-black outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 shadow-sm" 
                        placeholder={isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1 ? "Final Machine Total" : "0.00"} 
                        value={m.amount || ''} 
                        onChange={e => setPosMachines(p => p.map((it, i) => i === idx ? { ...it, amount: Number(e.target.value) } : it))} 
                      />
                    </div>
                 ))}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                 <div className={`bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-xl ${isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1 ? 'col-span-2 md:col-span-2' : ''}`}>
                   <h4 className="text-sm font-black mb-4 uppercase tracking-tight opacity-70">
                      {isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1 
                        ? (isShopUser ? '💰 Remaining Cash (On Hand)' : '💰 الكاش المتبقي معك الآن (بعد تسليم المحصل)')
                        : (isShopUser ? '💵 Cash Collected / In Drawer' : '💵 الكاش المحصل / الموجود بالدرج')}
                   </h4>
                   <input type="number" className="w-full p-5 bg-white/10 rounded-2xl text-center text-3xl font-black outline-none border-2 border-white/20 focus:border-white transition-all" placeholder="0.00" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                 </div>
                 
                 {!(isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1) && (
                    <div className="bg-orange-600 text-white p-8 rounded-[2.5rem] shadow-xl">
                      <h4 className="text-sm font-black mb-4 uppercase tracking-tight opacity-70">{isShopUser ? '✂️ Commission / Expenses' : '✂️ العمولة / المصاريف الإدارية'}</h4>
                      <input type="number" className="w-full p-5 bg-white/10 rounded-2xl text-center text-3xl font-black outline-none border-2 border-white/20 focus:border-white transition-all" placeholder="0.00" value={commissionAmount} onChange={e => setCommissionAmount(e.target.value)} />
                    </div>
                 )}
               </div>

               {isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1 && currentShopReconStats.firstReport && (
                  <div className="bg-green-50 p-6 rounded-[2rem] mb-10 border border-green-200 text-center">
                     <p className="text-[10px] font-black text-green-600 uppercase mb-2">Cash Handed to Collector (1st Closing)</p>
                     <p className="text-3xl font-black text-green-800">{currentShopReconStats.firstReport.cashReceived.toLocaleString()}</p>
                  </div>
               )}

               <button onClick={() => setShowConfirmModal(true)} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-all hover:bg-indigo-700">{isShopUser ? 'Submit Data Now ✅' : 'إرسال البيانات الآن ✅'}</button>
            </div>
          ) : (
            <div className="bg-white p-24 rounded-[4rem] border-4 border-dashed border-gray-100 text-center text-gray-300 font-black text-xl flex flex-col items-center justify-center gap-6 animate-pulse">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl">🏪</div>
              {isShopUser ? 'Please select a shop from the list to start' : 'يرجى اختيار المحل من القائمة لبدء إدخال البيانات'}
            </div>
          )}
       </div>

       {showShopRequestModal && (
         <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 text-right overflow-y-auto max-h-[90vh]">
             <h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tight text-indigo-900">➕ طلب إضافة محل جديد</h3>
             <div className="space-y-5">
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">اسم المحل</label><input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={newShopData.requestedName || ''} onChange={e=>setNewShopData({...newShopData, requestedName: e.target.value})} /></div>
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">المنطقة</label><input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={newShopData.requestedLocation || ''} onChange={e=>setNewShopData({...newShopData, requestedLocation: e.target.value})} /></div>
               
               <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                 <button onClick={()=>setNewShopData({...newShopData, isHaitham: true})} className={`flex-1 py-4 rounded-xl font-black text-xs ${newShopData.isHaitham ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>هيثم 👑</button>
                 <button onClick={()=>setNewShopData({...newShopData, isHaitham: false})} className={`flex-1 py-4 rounded-xl font-black text-xs ${!newShopData.isHaitham ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>شريك 🤝</button>
               </div>

               {!newShopData.isHaitham && (
                 <div>
                   <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">اختر الشريك</label>
                   <select 
                     className="w-full p-4 bg-orange-50 border border-orange-100 text-orange-600 rounded-2xl font-black outline-none appearance-none"
                     value={newShopData.partnerName || ''}
                     onChange={e => setNewShopData({ ...newShopData, partnerName: e.target.value })}
                   >
                     <option value="">-- اختر الشريك من القائمة --</option>
                     {uniquePartners.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                 </div>
               )}

               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3">بيانات الماكينة (اختياري)</h4>
                  <div className="space-y-3">
                    <input type="text" placeholder="رقم TID (8 أرقام)" className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={newShopData.initialTid || ''} onChange={e=>setNewShopData({...newShopData, initialTid: e.target.value})} maxLength={8} />
                    <input type="text" placeholder="الكود الثلاثي" maxLength={3} className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={newShopData.initialTripleCode || ''} onChange={e=>setNewShopData({...newShopData, initialTripleCode: e.target.value})} />
                  </div>
               </div>

               <div className="flex gap-3 pt-6 border-t mt-4">
                 <button onClick={handleAddShopRequest} className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl">إرسال الطلب ✅</button>
                 <button onClick={()=>setShowShopRequestModal(false)} className="px-10 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-lg">إلغاء</button>
               </div>
             </div>
           </div>
         </div>
       )}

       {showMachineRequestModal && (
         <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 text-right">
             <h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tight text-green-700">🏧 طلب إضافة ماكينة</h3>
             <div className="space-y-5">
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">رقم TID (8 أرقام)</label><input type="text" className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-black text-xl" value={newMachineData.tid || ''} onChange={e=>setNewMachineData({...newMachineData, tid: e.target.value})} maxLength={8} /></div>
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">الكود الثلاثي (اختياري)</label><input type="text" maxLength={3} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={newMachineData.tripleCode || ''} onChange={e=>setNewMachineData({...newMachineData, tripleCode: e.target.value})} /></div>
               
               <div>
                 <label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">نوع الماكينة</label>
                 <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                   <button 
                     onClick={()=>setNewMachineData({...newMachineData, type: 'standard'})} 
                     className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${newMachineData.type === 'standard' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}
                   >
                     وصول (Standard)
                   </button>
                   <button 
                     onClick={()=>setNewMachineData({...newMachineData, type: 'hala'})} 
                     className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${newMachineData.type === 'hala' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}
                   >
                     هلا (Hala)
                   </button>
                 </div>
               </div>

               <div className="flex gap-3 pt-6 border-t mt-4">
                 <button onClick={handleAddMachineRequest} className="flex-1 bg-green-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl">إرسال الطلب ✅</button>
                 <button onClick={()=>setShowMachineRequestModal(false)} className="px-10 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-lg">إلغاء</button>
               </div>
             </div>
           </div>
         </div>
       )}

       {showRenameRequestModal && (
         <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 text-right">
             <h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tight text-orange-700">✏️ طلب تعديل اسم المحل</h3>
             <div className="space-y-5">
               <div><label className="text-[11px] font-black text-gray-400 mb-2 block uppercase tracking-widest">الاسم الجديد</label><input type="text" className="w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-xl" value={renameData.newName || ''} onChange={e=>setRenameData({...renameData, newName: e.target.value})} /></div>
               <div className="flex gap-3 pt-6 border-t mt-4">
                 <button onClick={handleRenameRequest} className="flex-1 bg-orange-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl">إرسال الطلب ✅</button>
                 <button onClick={()=>setShowRenameRequestModal(false)} className="px-10 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-lg">إلغاء</button>
               </div>
             </div>
           </div>
         </div>
       )}

       {showConfirmModal && (
          <div className="fixed inset-0 bg-black/95 z-[1500] flex items-center justify-center p-4 backdrop-blur-md">
             <div className="bg-white p-12 rounded-[4rem] max-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 animate-bounce">✅</div>
                <h3 className="text-2xl font-black mb-8">
                   {isShopUser 
                     ? (reportType === 'reconciliation' && currentShopReconStats.count === 1 ? 'Confirm Final Closing (2/2)?' : 'Are you sure data is correct?') 
                     : (reportType === 'reconciliation' && currentShopReconStats.count === 1 ? 'تأكيد التقفيل النهائي (2/2)؟' : 'هل أنت متأكد من صحة البيانات المدخلة؟')}
                </h3>

                <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100 space-y-3 text-right" dir={isShopUser ? 'ltr' : 'rtl'}>
                    <div className="flex justify-between items-center border-b border-gray-200/50 pb-3">
                       <span className="text-xs font-black text-gray-400">{isShopUser ? 'Total Machines' : 'إجمالي الماكينات'}</span>
                       <span className="text-lg font-black text-indigo-600 font-mono">{posMachines.reduce((a,b)=>a+(b.amount||0),0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200/50 pb-3">
                       <span className="text-xs font-black text-gray-400">
                          {isShopUser 
                            ? (reportType === 'reconciliation' && currentShopReconStats.count === 1 ? 'Remaining Cash (On Hand)' : 'Cash') 
                            : (reportType === 'reconciliation' && currentShopReconStats.count === 1 ? 'الكاش المتبقي (باليد)' : 'الكاش')}
                       </span>
                       <span className="text-lg font-black text-green-600 font-mono">{Number(cashAmount).toLocaleString()}</span>
                    </div>
                    {!(isShopUser && reportType === 'reconciliation' && currentShopReconStats.count === 1) && (
                      <div className="flex justify-between items-center border-b border-gray-200/50 pb-3">
                         <span className="text-xs font-black text-gray-400">{isShopUser ? 'Commission' : 'العمولة'}</span>
                         <span className="text-lg font-black text-orange-600 font-mono">{Number(commissionAmount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-sm font-black text-gray-900">{isShopUser ? 'Net Cash' : 'صافي الكاش (Net Cash)'}</span>
                       <span className="text-2xl font-black text-gray-900 font-mono">
                         {(Number(cashAmount) - Number(commissionAmount)).toLocaleString()}
                       </span>
                    </div>
                </div>

                <button onClick={() => { 
                   const shop = (availableShops || []).find(s => s && s.id === selectedShopId);
                   if (!shop) return setShowConfirmModal(false);

                   if (reportType === 'reconciliation' && currentShopReconStats.count >= 2) {
                        alert(isShopUser ? '⚠️ This shop is already fully closed for today.' : '⚠️ تم الانتهاء من تقفيل هذا المحل بالكامل لهذا اليوم (تم إدخال التقفيلين).');
                        setShowConfirmModal(false);
                        setReportType(null);
                        return;
                   }

                   const isSecondClosing = reportType === 'reconciliation' && currentShopReconStats.count === 1;
                   
                   let finalCashReceived = 0;
                   let finalCashRemaining = 0;

                   if (isShopUser) {
                      finalCashReceived = isSecondClosing ? 0 : Number(cashAmount); 
                      finalCashRemaining = isSecondClosing ? Number(cashAmount) : 0;
                   } else {
                      // Collector Logic
                      // If Haitham Shop -> Cash is Collected
                      // If Partner Shop -> Cash stays in Drawer (Not collected)
                      if (shop.isHaitham) {
                         finalCashReceived = Number(cashAmount);
                         finalCashRemaining = 0;
                      } else {
                         finalCashReceived = 0;
                         finalCashRemaining = Number(cashAmount);
                      }
                   }

                   onAddReport({ 
                     id: `rep-${Date.now()}-${Math.random()}`, 
                     userId: user?.username || 'unknown', 
                     username: user?.username || 'unknown', 
                     shopId: shop.id, 
                     shopName: shop.name, 
                     location: shop.location, 
                     category: shop.category, 
                     partnerName: shop.partnerName, 
                     isHaitham: !!shop.isHaitham, 
                     date: selectedDate, 
                     reportType: reportType!, 
                     posMachines: posMachines || [], 
                     cashReceived: (reportType === 'spot-check') ? Number(cashAmount) : finalCashReceived, 
                     cashRemaining: (reportType === 'spot-check') ? 0 : finalCashRemaining,
                     commission: Number(commissionAmount) || 0, 
                     timestamp: Date.now(), 
                     isReview: user?.role === 'reviewer' 
                   }); 
                   
                   setShowConfirmModal(false); 
                   setSelectedShopId('');
                   setPosMachines([]);
                   setCashAmount('');
                   setCommissionAmount('');
                   lastSelectedShopId.current = '';
                }} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl mb-4 shadow-xl active:scale-95 transition-all hover:bg-indigo-700">{isShopUser ? 'Confirm & Submit Report' : 'تأكيد وإرسال التقرير'}</button>
                <button onClick={() => setShowConfirmModal(false)} className="w-full py-6 bg-gray-100 text-gray-500 rounded-[2rem] font-black text-xl active:scale-95 transition-all">{isShopUser ? 'Back to Review' : 'رجوع للمراجعة'}</button>
             </div>
          </div>
       )}
    </div>
  );
};

export default UserDashboard;
