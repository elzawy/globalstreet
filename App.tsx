
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, DailyReport, Shop, MachineRequest, ShopRequest, ShopRenameRequest, SystemStatus, UserAssignment, AccountRegistrationRequest, CashReport } from './types';
import { ADMIN_CREDENTIALS, SECOND_ADMIN_CREDENTIALS, USERS as STATIC_USERS, SHOPS as INITIAL_SHOPS, STORAGE_KEY, PARTNERS as INITIAL_PARTNERS } from './constants';
import { cloudService } from './cloudService';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import PartnershipManagerDashboard from './components/PartnershipManagerDashboard';
import ReviewerDashboard from './components/ReviewerDashboard';

const SESSION_KEY = 'gs_session_user';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cloudCount, setCloudCount] = useState(0);
  
  // States
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [shops, setShops] = useState<Shop[]>(INITIAL_SHOPS);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ reconciliationEnabled: true, activeSpotRequests: [] });
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [machineRequests, setMachineRequests] = useState<MachineRequest[]>([]);
  const [shopRequests, setShopRequests] = useState<ShopRequest[]>([]);
  const [renameRequests, setRenameRequests] = useState<ShopRenameRequest[]>([]);
  const [accountRegistrations, setAccountRegistrations] = useState<AccountRegistrationRequest[]>([]);
  const [cashReports, setCashReports] = useState<CashReport[]>([]); // New State
  const [systemUsers, setSystemUsers] = useState<any[]>(STATIC_USERS);
  const [systemPartners, setSystemPartners] = useState<string[]>(INITIAL_PARTNERS);
  const [systemCategories, setSystemCategories] = useState<string[]>(['مطاعم', 'أكشاك', 'فلوتنج', 'أجنحة', 'ألعاب']);
  const [systemLocations, setSystemLocations] = useState<string[]>(['بوابة', 'منطقة المطاعم', 'الأجنحة', 'ساحة الألعاب']);

  const isSavingRef = useRef(false);

  // Updated: accept forceFull parameter
  const pullData = useCallback(async (isSilent = false, forceFull = false) => {
    if (isSavingRef.current) return; 
    
    if (!isSilent) setIsLoading(true);
    else setIsAutoRefreshing(true);

    try {
      // Pass forceFull to cloudService
      const data = await cloudService.fetchAllData(forceFull);
      if (data) {
        setIsOnline(true);
        setCloudCount(data._rowCount || 0);
        
        if (data.reports) setReports(data.reports.filter((r: any) => r && r.id));
        if (data.shops && data.shops.length > 0) setShops(data.shops.filter((s: any) => s && s.id));
        else setShops(INITIAL_SHOPS);
        
        if (data.system_status) setSystemStatus({ 
          ...data.system_status, 
          activeSpotRequests: Array.isArray(data.system_status.activeSpotRequests) ? data.system_status.activeSpotRequests : [] 
        });
        
        if (data.assignments) setAssignments(Array.isArray(data.assignments) ? data.assignments.filter((a: any) => a && a.username) : []);
        if (data.machine_requests) setMachineRequests(data.machine_requests.filter((r: any) => r && r.id));
        if (data.shop_requests) setShopRequests(data.shop_requests.filter((r: any) => r && r.id));
        if (data.rename_requests) setRenameRequests(data.rename_requests.filter((r: any) => r && r.id));
        if (data.account_registrations) setAccountRegistrations(data.account_registrations.filter((r: any) => r && r.id));
        if (data.cash_reports) setCashReports(data.cash_reports.filter((r: any) => r && r.id)); // Load Cash Reports
        
        // Handle Users Logic: load users directly without forcing monitor
        if (data.users && data.users.length > 0) {
           let loadedUsers = data.users.filter((u: any) => u && u.username);
           setSystemUsers(loadedUsers);
        } else {
           setSystemUsers(STATIC_USERS);
        }

        if (data.partners && data.partners.length > 0) setSystemPartners(data.partners.filter((p: any) => p));
        if (data.categories && data.categories.length > 0) setSystemCategories(data.categories.filter((c: any) => c));
        if (data.locations && data.locations.length > 0) setSystemLocations(data.locations.filter((l: any) => l));
      } else {
        setIsOnline(false);
      }
    } catch (e) {
      console.error("Sync Error:", e);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
      setIsAutoRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    // Smart Polling
    const handlePoll = () => {
      if (document.visibilityState === 'visible') {
        pullData(true); // Regular polling is still partial sync
      }
    };

    const interval = setInterval(handlePoll, 20000);
    
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullData(true);
      }
    };
    
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentUser, pullData]);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    pullData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج من النظام؟')) {
      localStorage.removeItem(SESSION_KEY);
      setCurrentUser(null);
      setReports([]);
    }
  };

  const save = async (key: string, data: any) => {
    isSavingRef.current = true;

    // Optimistic UI updates
    if (key === 'system_status') setSystemStatus(data);
    else if (key === 'shops') setShops(data);
    else if (key === 'assignments') setAssignments(data);
    else if (key === 'partners') setSystemPartners(data);
    else if (key === 'categories') setSystemCategories(data);
    else if (key === 'locations') setSystemLocations(data);
    else if (key === 'users') setSystemUsers(data);
    else if (key.startsWith('rep_')) setReports(prev => [data, ...prev.filter(r => r && r.id !== data.id)].sort((a,b)=>b.timestamp-a.timestamp));
    else if (key.startsWith('accreg_')) setAccountRegistrations(prev => [data, ...prev.filter(r => r && r.id !== data.id)]);
    else if (key.startsWith('cashrep_')) setCashReports(prev => [data, ...prev.filter(r => r && r.id !== data.id)].sort((a,b)=>b.timestamp-a.timestamp));
    
    const success = await cloudService.saveData(key, data);
    setIsOnline(success);

    setTimeout(() => {
      isSavingRef.current = false;
      pullData(true);
    }, 1000);
    
    return success;
  };

  const handleLogin = (u: string, p: string) => {
    let found: User | null = null;
    
    if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
      found = { id: 'admin', username: u, role: 'admin' };
    } 
    else if (u === SECOND_ADMIN_CREDENTIALS.username && p === SECOND_ADMIN_CREDENTIALS.password) {
      found = { id: 'admin2', username: u, role: 'admin' };
    } 
    else {
      // Dynamic Check (Works for normal users AND monitor now)
      const userRecord = (systemUsers || []).find(us => us && us.username === u && us.password === p);
      if (userRecord) {
        found = { 
          id: u, 
          username: u, 
          role: userRecord.role || 'user',
          partnerName: userRecord.partnerName,
          shopId: userRecord.shopId
        };
      }
    }

    if (found) {
      setCurrentUser(found);
      localStorage.setItem(SESSION_KEY, JSON.stringify(found));
      return true;
    }
    return false;
  };

  const handleRegisterAccount = async (shopName: string, whatsapp: string, username: string, password: string) => {
    const newReg: AccountRegistrationRequest = {
      id: `accreg-${Date.now()}`,
      shopName,
      whatsapp,
      username,
      password,
      status: 'pending',
      requestDate: Date.now()
    };
    return await save(`accreg_${newReg.id}`, newReg);
  };

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-indigo-400 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white font-black text-xs tracking-tighter uppercase animate-pulse">جاري مزامنة بيانات النظام...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} onRegisterAccount={handleRegisterAccount} />;

  // Render Logic based on Role
  if (currentUser.role === 'admin') {
    // ADMIN: Using the New Professional Full-Screen Layout
    return (
      <AdminDashboard 
        reports={reports} shops={shops} machineRequests={machineRequests} shopRequests={shopRequests}
        renameRequests={renameRequests} accountRegistrations={accountRegistrations} 
        cashReports={cashReports}
        systemStatus={systemStatus} messages={[]} assignments={assignments} 
        partners={systemPartners} categories={systemCategories} 
        locations={systemLocations} 
        dynamicUsers={systemUsers}
        onUpdateStatus={(s) => save('system_status', s)}
        onSendMessage={() => {}}
        onUpdateAssignments={(a) => save('assignments', a)}
        onUpdateShops={(s) => save('shops', s)}
        onUpdateMachineRequests={(reqs) => setMachineRequests(reqs)}
        onUpdateShopRequests={(reqs) => setShopRequests(reqs)}
        onUpdateRenameRequests={(reqs) => setRenameRequests(reqs)}
        onUpdateAccountRegistrations={(reqs) => setAccountRegistrations(reqs)}
        onUpdatePartners={(p) => save('partners', p)}
        onUpdateCategories={(c) => save('categories', c)}
        onUpdateLocations={(l) => save('locations', l)}
        onUpdateUsers={(u) => save('users', u)}
        onUpdateReport={(r) => save(`rep_${r.id}`, r)}
        onUpdateCashReport={(r) => save(`cashrep_${r.id}`, r)}
        onRefresh={() => pullData(false, true)}
        onLogout={handleLogout}
        lastSyncTime={cloudCount > 0 ? 'Connected' : 'Offline'}
      />
    );
  } else if (currentUser.role === 'partnership_manager') {
    return (
      <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
        <header className="bg-teal-700 border-b border-teal-600 sticky top-0 z-50 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">P</div>
            <div>
              <h1 className="text-xs font-black text-white tracking-tighter uppercase leading-none">PARTNERSHIP PORTAL</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isAutoRefreshing ? 'bg-blue-300 animate-ping' : (isOnline ? 'bg-green-400' : 'bg-red-400')}`}></span>
                <span className="text-[8px] font-black text-teal-100 uppercase tracking-widest">
                  {isAutoRefreshing ? 'جاري التحديث...' : (isOnline ? 'متصل' : 'أوفلاين')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => pullData(false, true)} className="p-2 hover:bg-teal-600 rounded-full transition-all text-white" title="تحديث شامل">🔄</button>
             <button onClick={handleLogout} className="text-[10px] font-black bg-red-500/20 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all shadow-sm">خروج 🚪</button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-0 md:p-4">
           <PartnershipManagerDashboard 
             user={currentUser}
             allReports={reports}
             shops={shops}
             assignments={assignments.find(a => a.username === currentUser.username)}
             systemStatus={systemStatus}
             onAddShopRequest={(sr) => save(`sreq_${sr.id}`, sr)}
             onAddMachineRequest={(mr) => save(`mreq_${mr.id}`, mr)}
             onAddRenameRequest={(rr) => save(`rnreq_${rr.id}`, rr)}
             onRefresh={() => pullData(true, true)}
           />
        </main>
      </div>
    );
  } else if (currentUser.role === 'reviewer') {
    // REVIEWER: Full Screen Layout (No App Header)
    return (
      <ReviewerDashboard 
        user={currentUser}
        reports={reports}
        shops={shops}
        partners={systemPartners}
        categories={systemCategories}
        locations={systemLocations}
        onRefresh={() => pullData(true, true)}
        onLogout={handleLogout} // Passed logout handler
      />
    );
  } else {
    return (
      <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
        <header className="bg-white border-b sticky top-0 z-50 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">G</div>
            <div>
              <h1 className="text-xs font-black text-gray-800 tracking-tighter uppercase leading-none">GLOBAL STREET</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isAutoRefreshing ? 'bg-blue-500 animate-ping' : (isOnline ? 'bg-green-500' : 'bg-red-500')}`}></span>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  {isAutoRefreshing ? 'جاري التحديث...' : (isOnline ? `متصل (${cloudCount})` : 'أوفلاين')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => pullData(false, true)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-indigo-600" title="تحديث شامل">🔄</button>
             <button onClick={handleLogout} className="text-[10px] font-black bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm">خروج 🚪</button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 mt-4">
          <UserDashboard 
            user={currentUser} allReports={reports} availableShops={shops} systemStatus={systemStatus} messages={[]}
            assignments={Array.isArray(assignments) ? assignments.find(a => a && a.username === currentUser.username) : undefined}
            cashReports={cashReports}
            onUpdateCashReport={(cr) => save(`cashrep_${cr.id}`, cr)}
            onAddReport={(r) => {
              if (currentUser.role === 'shop_user' && currentUser.shopId) {
                const newRequests = (systemStatus.activeSpotRequests || []).filter(id => id !== currentUser.shopId);
                save('system_status', { ...systemStatus, activeSpotRequests: newRequests });
              }
              save(`rep_${r.id}`, r);
            }}
            onAddMachineRequest={(mr) => save(`mreq_${mr.id}`, mr)}
            onAddShopRequest={(sr) => save(`sreq_${sr.id}`, sr)}
            onAddRenameRequest={(rr) => save(`rnreq_${rr.id}`, rr)}
            onRefreshStatus={() => pullData(true, true)}
          />
        </main>
      </div>
    );
  }
};

export default App;
