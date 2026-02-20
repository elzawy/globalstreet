
import React, { useState, useMemo, useEffect } from 'react';
import { DailyReport, ReportType, Shop, MachineRequest, ShopRequest, SystemStatus, AdminMessage, UserAssignment, ShopMachine, ShopRenameRequest, POSMachine, AccountRegistrationRequest, GlobalAlert, CashReport } from '../types';
import { cloudService } from '../cloudService';
import { ADMIN_CREDENTIALS, SECOND_ADMIN_CREDENTIALS } from '../constants';

declare var XLSX: any;
declare var jspdf: any;

interface AdminDashboardProps {
  reports: DailyReport[];
  shops: Shop[];
  partners: string[];
  categories: string[];
  locations: string[];
  machineRequests: MachineRequest[];
  shopRequests: ShopRequest[];
  renameRequests: ShopRenameRequest[];
  accountRegistrations: AccountRegistrationRequest[];
  cashReports?: CashReport[];
  systemStatus: SystemStatus;
  messages: AdminMessage[];
  assignments: UserAssignment[];
  dynamicUsers: any[];
  onUpdateStatus: (s: SystemStatus) => void;
  onSendMessage: (m: AdminMessage) => void;
  onUpdateAssignments: (a: UserAssignment[]) => void;
  onUpdateShops: (shops: Shop[]) => void;
  onUpdateMachineRequests: (reqs: MachineRequest[]) => void;
  onUpdateShopRequests: (reqs: ShopRequest[]) => void;
  onUpdateRenameRequests: (reqs: ShopRenameRequest[]) => void;
  onUpdateAccountRegistrations: (reqs: AccountRegistrationRequest[]) => void;
  onUpdatePartners: (partners: string[]) => void;
  onUpdateCategories: (categories: string[]) => void;
  onUpdateLocations: (locations: string[]) => void;
  onUpdateUsers: (users: any[]) => void;
  onUpdateReport: (report: DailyReport) => void;
  onUpdateCashReport?: (report: CashReport) => void;
  onRefresh: () => void;
  onLogout: () => void;
  lastSyncTime?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  reports, shops, partners, categories, locations, machineRequests, shopRequests, renameRequests, accountRegistrations, cashReports = [], systemStatus, messages, assignments, dynamicUsers,
  onUpdateStatus, onSendMessage, onUpdateAssignments, onUpdateShops, onUpdateMachineRequests, onUpdateShopRequests, onUpdateRenameRequests, onUpdateAccountRegistrations, onUpdatePartners, onUpdateCategories, onUpdateLocations, onUpdateUsers, onUpdateReport, onUpdateCashReport, onRefresh,
  onLogout, lastSyncTime
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'performance' | 'analytics' | 'shop_details' | 'database' | 'approvals' | 'control' | 'accounts' | 'shop_accounts_data' | 'cash_reports'>('reports');
  const [reportsFilter, setReportsFilter] = useState<ReportType>('reconciliation');
  const [reportsUserFilter, setReportsUserFilter] = useState<string>('all');
  const [perfViewMode, setPerfViewMode] = useState<'shops' | 'users'>('shops');
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('ar-EG'));

  const [showApprovalHistory, setShowApprovalHistory] = useState(false);

  const [detailsShopId, setDetailsShopId] = useState('');
  const [detailsTimeRange, setDetailsTimeRange] = useState<'today' | 'yesterday' | 'week' | 'custom' | 'all'>('today');
  const [detailsOwnerFilter, setDetailsOwnerFilter] = useState<'all' | 'haitham' | 'partner'>('all');
  const [detailsPartnerFilter, setDetailsPartnerFilter] = useState('all');
  const [detailsLocationFilter, setDetailsLocationFilter] = useState('all');
  const [detailsCategoryFilter, setDetailsCategoryFilter] = useState('all');
  const [detailsUserFilter, setDetailsUserFilter] = useState('all');
  
  const [salesRankingSort, setSalesRankingSort] = useState<'highest' | 'lowest'>('highest');

  // Shop Accounts Data Filters
  const [saOwnerType, setSaOwnerType] = useState<'all' | 'haitham' | 'partner'>('all');
  const [saPartner, setSaPartner] = useState('all');
  const [saShopId, setSaShopId] = useState('all');
  const [saTimeRange, setSaTimeRange] = useState<'today' | 'yesterday' | 'week' | 'custom' | 'all'>('all');

  const [dbFilterOwner, setDbFilterOwner] = useState<'all' | 'haitham' | 'partners'>('all');
  const [dbFilterPartner, setDbFilterPartner] = useState<string>('all');
  const [dbFilterLocation, setDbFilterLocation] = useState<string>('all');
  const [dbFilterCategory, setDbFilterCategory] = useState<string>('all');
  const [dbFilterUser, setDbFilterUser] = useState<string>('all');
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Partial<Shop> | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingUserOriginalName, setEditingUserOriginalName] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalMachines, setModalMachines] = useState<{tid: string, tripleCode: string, type: 'standard' | 'hala'}[]>([]);

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [editTarget, setEditTarget] = useState<{type: 'partner' | 'category' | 'location', index: number, original: string, current: string} | null>(null);

  const [assignShopGroup, setAssignShopGroup] = useState<'haitham' | 'partner'>('haitham');

  const [alertCollector, setAlertCollector] = useState('');
  const [alertPartner, setAlertPartner] = useState('');

  const [selectedCashReport, setSelectedCashReport] = useState<CashReport | null>(null);
  const [isEditingCashReport, setIsEditingCashReport] = useState(false);
  const [editedCashDenominations, setEditedCashDenominations] = useState<any>({});

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };
  const [gateDate, setGateDate] = useState(getLocalDate());

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);

  const getYesterdayDate = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());
  const [ignoreDates, setIgnoreDates] = useState(false);

  useEffect(() => {
    if (systemStatus.forcedDate) {
      setGateDate(systemStatus.forcedDate);
    }
  }, [systemStatus.forcedDate]);

  const nonCollectorUsernames = useMemo(() => {
    return new Set((dynamicUsers || []).filter(u => u.role === 'shop_user' || u.role === 'partner').map(u => u.username));
  }, [dynamicUsers]);

  const collectorReports = useMemo(() => {
    return reports.filter(r => !nonCollectorUsernames.has(r.username));
  }, [reports, nonCollectorUsernames]);

  // --- CONSOLIDATED REPORTS LOGIC (MERGING COLLECTOR & PARTNER DATA) ---
  const consolidatedReports = useMemo(() => {
    const map = new Map<string, DailyReport>();
    
    // Process all valid reconciliation reports
    reports.forEach(r => {
      if (r.isDeleted || r.reportType !== 'reconciliation' || r.isReview) return;
      
      const key = `${r.date}_${r.shopId}`;
      const existing = map.get(key);
      const isCollector = !nonCollectorUsernames.has(r.username);
      
      if (!existing) {
        map.set(key, r);
        return;
      }
      
      const existingIsCollector = !nonCollectorUsernames.has(existing.username);
      
      // Logic: Collector Report > Partner Report. 
      // If same role type, Latest Timestamp > Oldest.
      if (isCollector && !existingIsCollector) {
         map.set(key, r);
      } else if (isCollector === existingIsCollector) {
         if (r.timestamp > existing.timestamp) map.set(key, r);
      }
    });

    return Array.from(map.values());
  }, [reports, nonCollectorUsernames]);

  const periodConsolidatedReports = useMemo(() => {
     return consolidatedReports.filter(r => ignoreDates || (r.date >= startDate && r.date <= endDate));
  }, [consolidatedReports, startDate, endDate, ignoreDates]);
  // --------------------------------------------------------------------

  const shopComparisonData = useMemo(() => {
    const filteredRawReports = reports.filter(r => {
      if (saTimeRange !== 'all') {
        const rDate = r.date;
        const today = getLocalDate();
        const yesterday = getYesterdayDate();
        if (saTimeRange === 'today' && rDate !== today) return false;
        if (saTimeRange === 'yesterday' && rDate !== yesterday) return false;
        if (saTimeRange === 'custom') {
          if (rDate < startDate || rDate > endDate) return false;
        }
        if (saTimeRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = weekAgo.toISOString().split('T')[0];
          if (rDate < weekAgoStr) return false;
        }
      }
      if (saOwnerType === 'haitham' && !r.isHaitham) return false;
      if (saOwnerType === 'partner' && r.isHaitham) return false;
      if (saOwnerType === 'partner' && saPartner !== 'all' && r.partnerName !== saPartner) return false;
      if (saShopId !== 'all' && r.shopId !== saShopId) return false;
      
      return r.reportType === 'reconciliation' && !r.isDeleted;
    });

    const groupedData: Record<string, {
      date: string;
      shopName: string;
      shopId: string;
      isHaitham: boolean;
      partnerName?: string;
      collectorData: { cash: number, machine: number, username: string, exists: boolean, report: DailyReport | null };
      shopUserData: { cash: number, machine: number, username: string, exists: boolean, report: DailyReport | null };
    }> = {};

    filteredRawReports.forEach(r => {
      const key = `${r.date}_${r.shopId}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          date: r.date,
          shopName: r.shopName,
          shopId: r.shopId,
          isHaitham: r.isHaitham,
          partnerName: r.partnerName,
          collectorData: { cash: 0, machine: 0, username: '-', exists: false, report: null },
          shopUserData: { cash: 0, machine: 0, username: '-', exists: false, report: null }
        };
      }

      const isCollector = !nonCollectorUsernames.has(r.username);
      const netC = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
      const mSum = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);

      if (isCollector) {
        groupedData[key].collectorData = { cash: netC, machine: mSum, username: r.username, exists: true, report: r };
      } else {
        groupedData[key].shopUserData = { cash: netC, machine: mSum, username: r.username, exists: true, report: r };
      }
    });

    return Object.values(groupedData).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, saTimeRange, startDate, endDate, saOwnerType, saPartner, saShopId, nonCollectorUsernames]);

  const saAvailableShopsList = useMemo(() => {
    return shops.filter(s => {
      if (saOwnerType === 'haitham' && !s.isHaitham) return false;
      if (saOwnerType === 'partner' && s.isHaitham) return false;
      if (saOwnerType === 'partner' && saPartner !== 'all' && s.partnerName !== saPartner) return false;
      return true;
    });
  }, [shops, saOwnerType, saPartner]);

  const availableAreas = useMemo(() => Array.from(new Set([...locations, ...shops.map(s => s.location)])), [locations, shops]);

  const isShopAssignedToUser = (shop: Shop, username: string) => {
    const assign = assignments.find(a => a.username === username);
    if (!assign) return false;
    const isIdAssigned = (assign.shopIds || []).includes(shop.id);
    const isPartnerAssigned = !shop.isHaitham && shop.partnerName && (assign.partnerNames || []).includes(shop.partnerName);
    return !!(isIdAssigned || isPartnerAssigned);
  };

  const smartAnalytics = useMemo(() => {
    // Uses consolidated reports to ensure Partner data is included if collector is missing
    const baseReports = periodConsolidatedReports;
    
    const haithamSales = baseReports.filter(r => r.isHaitham).reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0) + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0);
    const partnersSales = baseReports.filter(r => !r.isHaitham).reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0) + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0);
    const byCategory = categories.map(cat => ({
      name: cat,
      total: baseReports.filter(r => r.category === cat).reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0) + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0)
    })).filter(c => c.total > 0).sort((a,b) => b.total - a.total);
    const byLocation = availableAreas.map(loc => ({
      name: loc,
      total: baseReports.filter(r => r.location === loc).reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0) + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0)
    })).filter(l => l.total > 0).sort((a,b) => b.total - a.total);
    const byPartner = partners.map(p => ({
      name: p,
      total: baseReports.filter(r => r.partnerName === p).reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0) + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0)
    })).filter(p => p.total > 0).sort((a,b) => b.total - a.total);
    return { haithamSales, partnersSales, byCategory, byLocation, byPartner };
  }, [periodConsolidatedReports, categories, availableAreas, partners]);

  const globalTotals = useMemo(() => {
    const periodReports = periodConsolidatedReports;
    
    // 1. Total Machines (Global)
    const totalM = periodReports.reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0), 0);
    
    // 2. Haitham Machines
    const haithamM = periodReports.filter(r => r.isHaitham).reduce((sum, r) => sum + (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0), 0);
    
    // 3. Haitham Cash (Net)
    const haithamC = periodReports.filter(r => r.isHaitham).reduce((sum, r) => sum + (r.cashReceived || 0) - (r.commission || 0), 0);
    
    // 4. Partner Total (Machines + Net Cash)
    const partnersTotal = periodReports.filter(r => !r.isHaitham).reduce((sum, r) => {
      const m = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
      const c = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
      return sum + m + c;
    }, 0);

    // 5. Grand Total (Machines + Cash for everyone)
    const totalCashGlobal = periodReports.reduce((sum, r) => sum + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0);
    const grand = totalM + totalCashGlobal;

    return { totalM, haithamM, haithamC, partnersTotal, grand };
  }, [periodConsolidatedReports]);

  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        const dateMatch = ignoreDates || (r.date >= startDate && r.date <= endDate);
        const typeMatch = r.reportType === reportsFilter;
        const userMatch = reportsUserFilter === 'all' || r.username === reportsUserFilter;
        return dateMatch && typeMatch && userMatch && !r.isDeleted;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [reports, startDate, endDate, reportsFilter, reportsUserFilter, ignoreDates]);

  const filteredCashReports = useMemo(() => {
     return cashReports.filter(r => {
        const dateMatch = ignoreDates || (r.date >= startDate && r.date <= endDate);
        const userMatch = reportsUserFilter === 'all' || r.username === reportsUserFilter;
        return dateMatch && userMatch;
     }).sort((a,b) => b.timestamp - a.timestamp);
  }, [cashReports, startDate, endDate, reportsUserFilter, ignoreDates]);

  const detailsFilteredShops = useMemo(() => {
    return shops.filter(s => {
      if (detailsOwnerFilter === 'haitham' && !s.isHaitham) return false;
      if (detailsOwnerFilter === 'partner' && s.isHaitham) return false;
      if (detailsPartnerFilter !== 'all' && s.partnerName !== detailsPartnerFilter) return false;
      if (detailsLocationFilter !== 'all' && s.location !== detailsLocationFilter) return false;
      if (detailsCategoryFilter !== 'all' && s.category !== detailsCategoryFilter) return false;
      if (detailsUserFilter !== 'all' && !isShopAssignedToUser(s, detailsUserFilter)) return false;
      return true;
    });
  }, [shops, detailsOwnerFilter, detailsPartnerFilter, detailsLocationFilter, detailsCategoryFilter, detailsUserFilter, assignments]);

  const shopsRankingAnalysis = useMemo(() => {
    const shopIds = detailsFilteredShops.map(s => s.id);
    // Uses consolidated reports to show ranking correctly
    const relevantReports = consolidatedReports.filter(r => 
      shopIds.includes(r.shopId) && 
      !r.isDeleted && 
      r.reportType === 'reconciliation' && 
      !r.isReview &&
      (detailsTimeRange === 'today' ? r.date === getLocalDate() :
       detailsTimeRange === 'yesterday' ? r.date === getYesterdayDate() :
       detailsTimeRange === 'custom' ? (r.date >= startDate && r.date <= endDate) : true)
    );
    const shopAggregates: Record<string, { shop: Shop, total: number, count: number }> = {};
    detailsFilteredShops.forEach(s => { shopAggregates[s.id] = { shop: s, total: 0, count: 0 }; });
    relevantReports.forEach(r => {
       if (shopAggregates[r.shopId]) {
          const mSum = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
          const netC = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
          shopAggregates[r.shopId].total += (mSum + netC);
          shopAggregates[r.shopId].count += 1;
       }
    });
    const rankedList = Object.values(shopAggregates).filter(item => item.total > 0 || item.count > 0).sort((a, b) => salesRankingSort === 'highest' ? b.total - a.total : a.total - b.total);
    return rankedList;
  }, [detailsFilteredShops, consolidatedReports, detailsTimeRange, startDate, endDate, salesRankingSort]);

  const shopDetailedStats = useMemo(() => {
    if (!detailsShopId) return null;
    let targetShopIds = detailsShopId === 'ALL_FILTERED' ? detailsFilteredShops.map(s => s.id) : [detailsShopId];
    let title = detailsShopId === 'ALL_FILTERED' ? (detailsLocationFilter !== 'all' ? `إجمالي منطقة ${detailsLocationFilter}` : "إجمالي المحلات المفلترة") : (shops.find(s=>s.id===detailsShopId)?.name || "");
    
    // Uses consolidated reports for detailed stats numbers
    const periodReports = consolidatedReports.filter(r => {
      if (!targetShopIds.includes(r.shopId) || r.isDeleted || r.reportType !== 'reconciliation' || r.isReview) return false;
      if (detailsTimeRange === 'today') return r.date === getLocalDate();
      if (detailsTimeRange === 'yesterday') return r.date === getYesterdayDate();
      if (detailsTimeRange === 'custom') return r.date >= startDate && r.date <= endDate;
      return true;
    }).sort((a,b) => b.timestamp - a.timestamp);

    const machineData: Record<string, any> = {};
    let tCR = 0, tCRem = 0, tComm = 0;
    periodReports.forEach(r => {
      r.posMachines?.forEach(m => {
        const tidKey = m.tid || 'ماكينة غير معرفة';
        if (!machineData[tidKey]) machineData[tidKey] = { tid: tidKey, tripleCode: m.tripleCode, amount: 0, type: m.type };
        machineData[tidKey].amount += (m.amount || 0);
        if (m.tripleCode && !machineData[tidKey].tripleCode) machineData[tidKey].tripleCode = m.tripleCode;
      });
      tCR += (r.cashReceived || 0); tCRem += (r.cashRemaining || 0); tComm += (r.commission || 0);
    });
    const machines = Object.values(machineData).sort((a:any, b:any) => b.amount - a.amount);
    const machinesTotal = machines.reduce((s, m:any) => s + m.amount, 0);
    const netCash = (tCR + tCRem) - tComm;
    return { title, machines, machinesTotal, totalCashReceived: tCR, totalCashRemaining: tCRem, totalCommission: tComm, netCash, grandTotal: machinesTotal + netCash, reportCount: periodReports.length, individualReports: periodReports };
  }, [detailsShopId, detailsTimeRange, consolidatedReports, shops, startDate, endDate, detailsFilteredShops, detailsLocationFilter]);

  const shopsStats = useMemo(() => {
    // Uses consolidated reports for shop performance
    const periodReports = periodConsolidatedReports;
    return shops.map(shop => {
        const shopReports = periodReports.filter(r => r.shopId === shop.id);
        const machineTotal = shopReports.reduce((sum, r) => sum + (r.posMachines?.reduce((sM, m) => sM + (m.amount || 0), 0) || 0), 0);
        const netCash = shopReports.reduce((sum, r) => sum + (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0), 0);
        return { ...shop, machineTotal, netCash, grandTotal: machineTotal + netCash, reportCount: shopReports.length };
    }).sort((a, b) => b.grandTotal - a.grandTotal);
  }, [periodConsolidatedReports, shops]);

  const usersStats = useMemo(() => {
    // Keep using Collector Reports for User Performance (because we want to see what *they* did)
    const periodReports = collectorReports.filter(r => !r.isDeleted && r.reportType === 'reconciliation' && !r.isReview && (ignoreDates || (r.date >= startDate && r.date <= endDate)));
    const collectorUsers = dynamicUsers.filter(u => u.role !== 'shop_user' && u.role !== 'partner');
    return collectorUsers.map(user => {
      const userReports = periodReports.filter(r => r.username === user.username);
      let machineTotal = 0; let cashNet = 0;
      userReports.forEach(r => {
        machineTotal += (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
        cashNet += (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
      });
      return { username: user.username, machineTotal, cashNet, grandTotal: machineTotal + cashNet, reportCount: userReports.length };
    }).sort((a, b) => b.grandTotal - a.grandTotal);
  }, [collectorReports, startDate, endDate, ignoreDates, dynamicUsers]);

  const filteredDbShops = useMemo(() => {
    return shops.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(dbSearchQuery.toLowerCase());
      const ownerMatch = dbFilterOwner === 'all' || (dbFilterOwner === 'haitham' && s.isHaitham) || (dbFilterOwner === 'partners' && !s.isHaitham);
      const partnerMatch = dbFilterPartner === 'all' || s.partnerName === dbFilterPartner;
      const locationMatch = dbFilterLocation === 'all' || s.location === dbFilterLocation;
      const categoryMatch = dbFilterCategory === 'all' || s.category === dbFilterCategory;
      const userMatch = dbFilterUser === 'all' || isShopAssignedToUser(s, dbFilterUser);
      return nameMatch && ownerMatch && partnerMatch && locationMatch && categoryMatch && userMatch;
    });
  }, [shops, dbSearchQuery, dbFilterOwner, dbFilterPartner, dbFilterLocation, dbFilterCategory, dbFilterUser, assignments]);

  const handleExportExcel = (dataToExport: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportComparisonExcel = () => {
    const data = shopComparisonData.map(row => {
      const diffCash = row.shopUserData.cash - row.collectorData.cash;
      const diffMachine = row.shopUserData.machine - row.collectorData.machine;
      return {
        'التاريخ': row.date,
        'المحل': row.shopName,
        'المالك': row.isHaitham ? 'هيثم' : row.partnerName,
        'تحصيل المحصل (كاش)': row.collectorData.cash,
        'تحصيل المحصل (ماكينة)': row.collectorData.machine,
        'إدخال المحل (كاش)': row.shopUserData.cash,
        'إدخال المحل (ماكينة)': row.shopUserData.machine,
        'فارق الكاش': diffCash,
        'فارق الماكينة': diffMachine,
        'اسم المحصل': row.collectorData.username,
        'اسم يوزر المحل': row.shopUserData.username
      };
    });
    handleExportExcel(data, `Shop_vs_Collector_Report_${startDate}_to_${endDate}`);
  };

  const handleExportRankingDetails = () => {
    const exportData: any[] = [];
    const rankedShopIds = shopsRankingAnalysis.map(item => item.shop.id);
    // Export consolidated data
    consolidatedReports.forEach(r => {
      if (
        rankedShopIds.includes(r.shopId) && !r.isDeleted && r.reportType === 'reconciliation' && !r.isReview &&
        (detailsTimeRange === 'today' ? r.date === getLocalDate() : detailsTimeRange === 'yesterday' ? r.date === getYesterdayDate() : detailsTimeRange === 'custom' ? (r.date >= startDate && r.date <= endDate) : true)
      ) {
        const mSum = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
        const netC = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
        exportData.push({ 'التاريخ': r.date, 'اسم المحل': r.shopName, 'المالك/الشريك': r.isHaitham ? 'هيثم' : r.partnerName, 'المنطقة': r.location, 'التصنيف': r.category, 'إجمالي الماكينات': mSum, 'صافي الكاش': netC, 'العمولة': r.commission, 'الإجمالي الكلي': mSum + netC, 'الموظف': r.username });
      }
    });
    exportData.sort((a, b) => new Date(b['التاريخ']).getTime() - new Date(a['التاريخ']).getTime());
    handleExportExcel(exportData, `Ranked_Sales_Details_${salesRankingSort}_${detailsTimeRange}`);
  };

  const handleExportReportsExcel = () => {
    const data = filteredReports.map(r => {
      const mSum = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
      const mHala = r.posMachines?.filter(m => m.type === 'hala').reduce((s, m) => s + (m.amount || 0), 0) || 0;
      const mWosul = r.posMachines?.filter(m => m.type === 'standard').reduce((s, m) => s + (m.amount || 0), 0) || 0;
      
      const netC = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
      return { 
        'المحل': r.shopName, 
        'الموظف': r.username, 
        'التاريخ': r.date, 
        'النوع': r.reportType === 'reconciliation' ? 'تقفيل' : 'متابعة', 
        'الحالة': r.isReview ? 'مراجعة' : 'فعلي', 
        'مجموع ماكينات هلا': mHala,
        'مجموع ماكينات وصول': mWosul,
        'إجمالي الماكينات': mSum, 
        'صافي الكاش': netC, 
        'العمولة': r.commission, 
        'الإجمالي الكلي': mSum + netC 
      };
    });
    handleExportExcel(data, `Reports_${startDate}_to_${endDate}`);
  };

  const handleExportReportsPDF = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const head = [['المحل', 'الموظف', 'التاريخ', 'النوع', 'الماكينات', 'صافي الكاش', 'العمولة', 'الإجمالي']];
    const body = filteredReports.map(r => {
      const mSum = (r.posMachines?.reduce((s, m) => s + (m.amount || 0), 0) || 0);
      const netC = (r.cashReceived || 0) + (r.cashRemaining || 0) - (r.commission || 0);
      return [r.shopName, r.username, r.date, r.reportType === 'reconciliation' ? 'تقفيل' : 'متابعة', mSum.toLocaleString(), netC.toLocaleString(), r.commission.toLocaleString(), (mSum + netC).toLocaleString()];
    });
    (doc as any).autoTable({ head: head, body: body, styles: { font: 'Courier', halign: 'right' }, headStyles: { fillColor: [79, 70, 229] } });
    doc.save(`Reports_${startDate}_to_${endDate}.pdf`);
  };

  const handleSaveShop = () => {
    if (!editingShop || !editingShop.name) return;
    const standardTids: ShopMachine[] = modalMachines.filter(m => m.type === 'standard').map(m => ({ tid: m.tid, tripleCode: m.tripleCode }));
    const halaTids: ShopMachine[] = modalMachines.filter(m => m.type === 'hala').map(m => ({ tid: m.tid, tripleCode: m.tripleCode }));
    const shopToSave: Shop = { id: editingShop.id || `shop-${Date.now()}`, name: editingShop.name, location: editingShop.location || 'غير محدد', category: editingShop.category || 'عام', isHaitham: editingShop.isHaitham ?? true, partnerName: editingShop.isHaitham ? undefined : editingShop.partnerName, standardTids: standardTids, halaTids: halaTids, notes: editingShop.notes || '', };
    onUpdateShops(editingShop.id ? shops.map(s => s.id === editingShop.id ? shopToSave : s) : [...shops, shopToSave]);
    setIsShopModalOpen(false);
  };

  const handleSaveEditedReport = () => {
    if (!editingReport) return;
    onUpdateReport(editingReport);
    setIsReportModalOpen(false);
    setEditingReport(null);
  };

  const saveEditedManagementItem = () => {
    if (!editTarget) return;
    const { type, index, current } = editTarget;
    if (!current.trim()) return alert('لا يمكن ترك الحقل فارغاً');
    if (type === 'partner') { const updated = [...partners]; updated[index] = current.trim(); onUpdatePartners(updated); }
    else if (type === 'category') { const updated = [...categories]; updated[index] = current.trim(); onUpdateCategories(updated); }
    else if (type === 'location') { const updated = [...locations]; updated[index] = current.trim(); onUpdateLocations(updated); }
    setEditTarget(null);
  };

  const toggleAssignment = (username: string, type: 'partner' | 'shop', value: string) => {
    const currentAssignments = assignments || [];
    const newAssignments = [...currentAssignments].map(a => ({ ...a, shopIds: [...(a.shopIds || [])], partnerNames: [...(a.partnerNames || [])] }));
    let userAssign = newAssignments.find(a => a.username === username);
    if (!userAssign) { userAssign = { username, shopIds: [], partnerNames: [] }; newAssignments.push(userAssign); }
    if (type === 'shop') { userAssign.shopIds = (userAssign.shopIds || []).includes(value) ? userAssign.shopIds.filter(id => id !== value) : [...(userAssign.shopIds || []), value]; }
    else { userAssign.partnerNames = (userAssign.partnerNames || []).includes(value) ? userAssign.partnerNames.filter(p => p !== value) : [...(userAssign.partnerNames || []), value]; }
    onUpdateAssignments(newAssignments);
  };

  const allSystemAccounts = useMemo(() => {
      const staticAdmins = [{ username: ADMIN_CREDENTIALS.username, password: ADMIN_CREDENTIALS.password, role: 'admin' as const, isStatic: true }, { username: SECOND_ADMIN_CREDENTIALS.username, password: SECOND_ADMIN_CREDENTIALS.password, role: 'admin' as const, isStatic: true }];
      const filteredDynamic = (dynamicUsers || []).filter(du => !staticAdmins.some(sa => sa.username === du.username));
      return [...staticAdmins, ...filteredDynamic.map(u => ({ ...u, role: u.role || 'user', isStatic: false }))];
  }, [dynamicUsers]);

  const handleSaveUser = () => {
      if (!editingUser.username || !editingUser.password) return alert('يرجى إكمال البيانات');
      const targetUsername = editingUserOriginalName || null;
      const newName = editingUser.username;
      if (targetUsername && newName !== targetUsername) {
         if (dynamicUsers.some(u => u.username === newName)) return alert('اسم المستخدم مسجل بالفعل لموظف آخر!');
      } else if (!targetUsername) {
         if (dynamicUsers.some(u => u.username === newName)) return alert('اسم المستخدم مسجل بالفعل!');
      }
      const newUser = { username: editingUser.username, password: editingUser.password, role: editingUser.role || 'user', partnerName: editingUser.partnerName || undefined, shopId: editingUser.shopId || undefined, phone: editingUser.phone || undefined };
      let updatedList;
      if (editingUserOriginalName) { updatedList = [...dynamicUsers.filter(u => u.username !== editingUserOriginalName), newUser]; } else { updatedList = [...dynamicUsers, newUser]; }
      onUpdateUsers(updatedList);
      setIsUserModalOpen(false);
      setEditingUserOriginalName(null);
  };

  const handleDeleteUser = (username: string) => {
    if (confirm(`هل أنت متأكد من حذف حساب "${username}" نهائياً من النظام؟`)) {
      const updatedList = dynamicUsers.filter(u => u.username !== username);
      onUpdateUsers(updatedList);
    }
  };

  const handleRefreshData = () => {
    onRefresh();
    setLastUpdated(new Date().toLocaleTimeString('ar-EG'));
  };

  const handleRequestSpot = (shopId: string) => {
    const currentRequests = systemStatus.activeSpotRequests || [];
    if (currentRequests.includes(shopId)) return;
    const newRequests = [...currentRequests, shopId];
    onUpdateStatus({ ...systemStatus, activeSpotRequests: newRequests });
    alert('✅ تم إرسال طلب إدخال البيانات للمحل بنجاح (سيصدر تنبيه صوتي للمستخدم)');
  };

  const handleCancelSpot = (shopId: string) => {
    const currentRequests = systemStatus.activeSpotRequests || [];
    const newRequests = currentRequests.filter(id => id !== shopId);
    onUpdateStatus({ ...systemStatus, activeSpotRequests: newRequests });
  };

  const handleSendGlobalAlert = (targetRole: 'user' | 'shop_user' | 'partner', targetId: string, message: string) => {
    if (!message) return;
    const newAlert: GlobalAlert = { id: `alert-${Date.now()}`, targetRole, targetId, message, timestamp: Date.now() };
    const currentAlerts = systemStatus.globalAlerts || [];
    const updatedAlerts = [...currentAlerts, newAlert].slice(-10);
    onUpdateStatus({ ...systemStatus, globalAlerts: updatedAlerts });
    alert('✅ تم إرسال الإنذار الصوتي والرسالة بنجاح');
  };

  const handleCancelAlert = (targetRole: 'user' | 'shop_user' | 'partner', targetId: string) => {
    const currentAlerts = systemStatus.globalAlerts || [];
    const updatedAlerts = currentAlerts.filter(a => !(a.targetRole === targetRole && a.targetId === targetId));
    onUpdateStatus({ ...systemStatus, globalAlerts: updatedAlerts });
    alert('✅ تم إلغاء الإنذار المحدد بنجاح');
  };

  const handleDeleteReport = (report: DailyReport) => {
    if (confirm('⚠️ هل أنت متأكد تماماً من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.')) {
      onUpdateReport({ ...report, isDeleted: true });
    }
  };

  const saveEditedCashReport = () => {
    if (!selectedCashReport || !onUpdateCashReport) return;
    const total = 
      (Number(editedCashDenominations.val500 || 0) * 500) +
      (Number(editedCashDenominations.val200 || 0) * 200) +
      (Number(editedCashDenominations.val100 || 0) * 100) +
      (Number(editedCashDenominations.val50 || 0) * 50) +
      (Number(editedCashDenominations.val20 || 0) * 20) +
      (Number(editedCashDenominations.val10 || 0) * 10) +
      (Number(editedCashDenominations.val5 || 0) * 5) +
      (Number(editedCashDenominations.val2 || 0) * 2) +
      (Number(editedCashDenominations.val1 || 0) * 1) +
      (Number(editedCashDenominations.val0_5 || 0) * 0.5) +
      (Number(editedCashDenominations.val0_25 || 0) * 0.25);

    const updatedReport = {
      ...selectedCashReport,
      denominations: {
        val500: Number(editedCashDenominations.val500 || 0),
        val200: Number(editedCashDenominations.val200 || 0),
        val100: Number(editedCashDenominations.val100 || 0),
        val50: Number(editedCashDenominations.val50 || 0),
        val20: Number(editedCashDenominations.val20 || 0),
        val10: Number(editedCashDenominations.val10 || 0),
        val5: Number(editedCashDenominations.val5 || 0),
        val2: Number(editedCashDenominations.val2 || 0),
        val1: Number(editedCashDenominations.val1 || 0),
        val0_5: Number(editedCashDenominations.val0_5 || 0),
        val0_25: Number(editedCashDenominations.val0_25 || 0),
      },
      totalAmount: total
    };
    
    onUpdateCashReport(updatedReport);
    setSelectedCashReport(updatedReport);
    setIsEditingCashReport(false);
    alert('✅ تم تحديث تقرير العهدة بنجاح');
  };

  const renderDenominationRow = (label: string, mult: number, key: string, count: number) => {
    if (isEditingCashReport) {
      return (
        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
           <span className="text-gray-500 font-bold text-xs">{label}</span>
           <div className="flex gap-4 items-center">
              <input 
                type="number" 
                className="w-20 p-2 bg-white border rounded-lg text-center font-black text-xs outline-none focus:border-indigo-600" 
                value={editedCashDenominations[key] !== undefined ? editedCashDenominations[key] : count} 
                onChange={(e) => setEditedCashDenominations({ ...editedCashDenominations, [key]: e.target.value })}
              />
              <span className="text-indigo-600 font-black text-xs w-16 text-left">
                = {((Number(editedCashDenominations[key] !== undefined ? editedCashDenominations[key] : count) || 0) * mult).toLocaleString()}
              </span>
           </div>
        </div>
      );
    }
    
    if (!count) return null;
    return (
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
         <span className="text-gray-500 font-bold text-xs">{label}</span>
         <div className="flex gap-4">
            <span className="text-gray-900 font-black text-xs">x {count}</span>
            <span className="text-indigo-600 font-black text-xs w-16 text-left">= {(count * mult).toLocaleString()}</span>
         </div>
      </div>
    );
  };

  const handleCopy = (val: number) => {
    navigator.clipboard.writeText(val.toString());
  };

  return (
    <div className="space-y-6 text-right pb-24 animate-in fade-in">
      <div className="flex justify-between items-center mb-2 px-2">
         <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${lastSyncTime === 'Offline' ? 'bg-red-500' : 'bg-green-500'} animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]`}></span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Global Sync Status</span>
              <span className="text-[8px] font-bold text-gray-400 mt-0.5">{lastSyncTime || 'CONNECTED & LIVE'}</span>
            </div>
         </div>
         <div className="flex gap-2 items-center">
             <div className="text-[9px] font-black text-gray-400 bg-white px-3 py-1 rounded-full border shadow-sm flex items-center gap-2">
                <span>آخر تحديث للسحابة: {lastUpdated}</span>
                <button onClick={handleRefreshData} className="text-indigo-600 hover:rotate-180 transition-all duration-500">🔄</button>
             </div>
             <button onClick={onLogout} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded-full text-[10px] font-black transition-all border border-red-100 shadow-sm flex items-center gap-1">
                 <span>خروج</span>
                 <span>🚪</span>
             </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-indigo-900 text-white p-6 rounded-[2rem] shadow-xl">
            <p className="text-[10px] font-black opacity-60 uppercase">إجمالي التحصيل العام</p>
            <p className="text-2xl font-black text-yellow-400">{globalTotals.grand.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase">كاش هيثم (مستلم)</p>
            <p className="text-2xl font-black text-green-600">{globalTotals.haithamC.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي الشركاء (كاش + ماكينات)</p>
            <p className="text-2xl font-black text-orange-600">{globalTotals.partnersTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي ماكينات هيثم</p>
            <p className="text-2xl font-black text-indigo-600">{globalTotals.haithamM.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase">حالة البوابة</p>
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className={`text-xl font-black ${systemStatus.reconciliationEnabled ? 'text-green-500' : 'text-red-500'}`}>
                      {systemStatus.reconciliationEnabled ? 'مفتوحة' : 'مغلقة'}
                  </p>
                  {systemStatus.reconciliationEnabled && systemStatus.forcedDate && (
                    <span className="text-[8px] font-bold text-gray-400">{systemStatus.forcedDate}</span>
                  )}
                </div>
                <button onClick={() => setIgnoreDates(!ignoreDates)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${ignoreDates ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>📅</button>
            </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 bg-white p-2 rounded-[2.5rem] border shadow-sm">
        {[
          { id: 'reports', label: 'التقارير', icon: '📝' },
          { id: 'performance', label: 'الأداء', icon: '📈' },
          { id: 'analytics', label: 'التحليلات الذكية', icon: '🧠' },
          { id: 'shop_accounts_data', label: 'بيانات المحلات', icon: '🏪' },
          { id: 'shop_details', label: 'مبيعات المحلات', icon: '🏪' },
          { id: 'database', label: 'المحلات', icon: '🏢' },
          { id: 'accounts', label: 'الحسابات', icon: '👤' },
          { id: 'approvals', label: 'الاعتمادات', icon: '🔔' },
          { id: 'control', label: 'الإعدادات', icon: '⚙️' },
          { id: 'cash_reports', label: 'عهدة المحصلين', icon: '💰' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-3 rounded-2xl font-black text-[11px] flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><span>{tab.icon}</span> {tab.label}</button>
        ))}
      </div>

      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-[2rem] border">
            <div className="flex gap-2">
              <input type="date" className="p-2 bg-gray-50 rounded-xl border text-[10px] font-black" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={ignoreDates} />
              <input type="date" className="p-2 bg-gray-50 rounded-xl border text-[10px] font-black" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={ignoreDates} />
            </div>
            <div className="flex gap-2 items-center">
              <select className="p-2 bg-indigo-50 border-indigo-100 text-indigo-600 rounded-xl border text-[10px] font-black outline-none" value={reportsUserFilter} onChange={e => setReportsUserFilter(e.target.value)}><option value="all">كل الموظفين</option>{dynamicUsers.filter(u => u.role !== 'shop_user' && u.role !== 'partner').map(u => <option key={u.username} value={u.username}>{u.username}</option>)}</select>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setReportsFilter('reconciliation')} className={`px-4 py-2 rounded-lg text-[10px] font-black ${reportsFilter === 'reconciliation' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>💰 التقفيل</button>
                <button onClick={() => setReportsFilter('spot-check')} className={`px-4 py-2 rounded-lg text-[10px] font-black ${reportsFilter === 'spot-check' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>🔍 المتابعة</button>
              </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handleExportReportsExcel} className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] hover:bg-green-700 shadow-md transition-all flex items-center gap-2"><span>Excel</span> 📊</button>
                <button onClick={handleExportReportsPDF} className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-[10px] hover:bg-red-700 shadow-md transition-all flex items-center gap-2"><span>PDF</span> 📄</button>
                <button onClick={handleRefreshData} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] hover:bg-indigo-700 shadow-md transition-all">تحديث 🔄</button>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <table className="w-full text-right table-auto">
              <thead className="bg-gray-50 border-b text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="p-1 md:p-6">المحل / الموظف</th><th className="p-1 md:p-6 text-center">الماكينات</th><th className="p-1 md:p-6 text-center">الكاش</th><th className="p-1 md:p-6 text-center text-orange-600">العمولة</th><th className="p-1 md:p-6 text-center text-indigo-600">الإجمالي</th><th className="p-1 md:p-6 text-center">الحالة</th><th className="p-1 md:p-6 text-center">المرفقات</th><th className="p-1 md:p-6 text-center">الإجراء</th></tr>
              </thead>
              <tbody className="divide-y text-[7px] md:text-xs font-bold">
                {filteredReports.map(r => {
                  const mSum = (r.posMachines?.reduce((s,m)=>s+(m.amount||0),0)||0);
                  const totalCash = (r.cashReceived || 0) + (r.cashRemaining || 0);
                  const netC = totalCash - (r.commission || 0);
                  const currentTotal = mSum + netC;
                  const reportTime = new Date(r.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${r.isReview ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-1 md:p-6">
                         <p className="text-gray-900 text-[8px] md:text-base font-black whitespace-normal break-words">{r.shopName}</p>
                         <p className="text-[6px] md:text-[10px] text-indigo-600 uppercase tracking-tighter font-black">
                            الموظف: {r.username} {nonCollectorUsernames.has(r.username) ? '(حساب محل)' : '(محصل)'} • {r.date} • {reportTime}
                         </p>
                      </td>
                      <td className="p-1 md:p-6 text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          {r.posMachines?.filter(m => (m.amount > 0 || m.tid)).map((m, mIdx) => (
                            <div key={mIdx} className="text-[6px] md:text-[8px] font-bold text-gray-400 whitespace-nowrap"><span className="text-indigo-500">{m.tid}</span>: {m.amount.toLocaleString()}</div>
                          ))}
                          <div 
                            onClick={() => handleCopy(mSum)}
                            className="text-[7px] md:text-xs font-black text-indigo-900 mt-1 pt-1 border-t border-indigo-50 w-full text-center cursor-pointer hover:bg-indigo-100 rounded" title="نسخ إجمالي الماكينات"
                          >
                            {mSum.toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td onClick={() => handleCopy(totalCash)} className="p-1 md:p-6 text-center text-green-600 font-black cursor-pointer hover:bg-green-50 hover:scale-110 transition-all" title="نسخ الكاش">
                        {totalCash.toLocaleString()}
                      </td>
                      <td onClick={() => handleCopy(r.commission || 0)} className="p-1 md:p-6 text-center text-orange-600 font-black cursor-pointer hover:bg-orange-50 hover:scale-110 transition-all" title="نسخ العمولة">
                        {r.commission.toLocaleString()}
                      </td>
                      <td onClick={() => handleCopy(currentTotal)} className="p-1 md:p-6 text-center text-indigo-600 font-black cursor-pointer hover:bg-indigo-50 hover:scale-110 transition-all" title="نسخ الإجمالي">
                        {currentTotal.toLocaleString()}
                      </td>
                      <td className="p-1 md:p-6 text-center"><span className={`text-[6px] md:text-[8px] font-black px-2 py-1 rounded-full ${r.isReview ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.isReview ? 'مراجعة' : 'فعلي'}</span></td>
                      <td className="p-1 md:p-6 text-center"><div className="flex justify-center gap-1">{r.notesAttachment && <button onClick={() => setSelectedImage(r.notesAttachment!)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🖼️</button>}{r.posMachines?.some(m => m.zReportImage) && <button onClick={() => setSelectedImage(r.posMachines.find(m=>m.zReportImage)?.zReportImage!)} className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs">📸</button>}</div></td>
                      <td className="p-1 md:p-6 text-center"><div className="flex justify-center gap-2"><button onClick={() => { setEditingReport(JSON.parse(JSON.stringify(r))); setIsReportModalOpen(true); }} className="text-indigo-600 font-black hover:scale-110 transition-transform text-[8px] md:text-sm">✏️</button><button onClick={() => handleDeleteReport(r)} className="text-red-600 font-black hover:scale-110 transition-transform text-[8px] md:text-sm">🗑️</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'shop_accounts_data' && (
        <div className="space-y-8 animate-in fade-in">
           <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center flex-wrap">
                 <select className="p-3 bg-gray-50 rounded-xl border font-black text-xs outline-none" value={saOwnerType} onChange={e => setSaOwnerType(e.target.value as any)}>
                    <option value="all">كل المجموعات</option>
                    <option value="haitham">مجموعة هيثم</option>
                    <option value="partner">الشركاء</option>
                 </select>
                 {saOwnerType === 'partner' && (
                    <select className="p-3 bg-gray-50 rounded-xl border font-black text-xs outline-none" value={saPartner} onChange={e => setSaPartner(e.target.value)}>
                       <option value="all">كل الشركاء</option>
                       {partners.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                 )}
                 <select className="p-3 bg-gray-50 rounded-xl border font-black text-xs outline-none" value={saShopId} onChange={e => setSaShopId(e.target.value)}>
                    <option value="all">كل المحلات</option>
                    {saAvailableShopsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <div className="flex gap-2">
                 <button onClick={()=>setSaTimeRange('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${saTimeRange === 'today' ? 'bg-indigo-600 text-white' : 'text-gray-400 bg-gray-50'}`}>اليوم</button>
                 <button onClick={()=>setSaTimeRange('yesterday')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${saTimeRange === 'yesterday' ? 'bg-indigo-600 text-white' : 'text-gray-400 bg-gray-50'}`}>أمس</button>
                 <button onClick={()=>setSaTimeRange('week')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${saTimeRange === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-400 bg-gray-50'}`}>أسبوع</button>
                 <button onClick={()=>setSaTimeRange('custom')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${saTimeRange === 'custom' ? 'bg-indigo-600 text-white' : 'text-gray-400 bg-gray-50'}`}>فترة</button>
                 <button onClick={()=>setSaTimeRange('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${saTimeRange === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 bg-gray-50'}`}>الكل</button>
                 <button onClick={handleExportComparisonExcel} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md hover:bg-green-700 transition-all mr-2 flex items-center gap-1">تصدير مقارنة Excel 📥</button>
              </div>
              {saTimeRange === 'custom' && (
                 <div className="flex gap-2">
                    <input type="date" className="p-2 bg-gray-50 rounded-xl text-xs font-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <input type="date" className="p-2 bg-gray-50 rounded-xl text-xs font-black" value={endDate} onChange={e => setEndDate(e.target.value)} />
                 </div>
              )}
           </div>

           <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
              <table className="w-full text-right table-auto">
                 <thead className="bg-gray-50 border-b text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <tr>
                       <th className="p-4">التاريخ / المحل</th>
                       <th className="p-4 text-center bg-indigo-50/50 w-1/4 border-l border-indigo-100">تقفيل المحصل (الأول)</th>
                       <th className="p-4 text-center bg-green-50/50 w-1/4 border-l border-green-100">تقفيل المحل (النهائي)</th>
                       <th className="p-4 text-center w-1/6 border-l border-gray-100">الفوارق (Diff)</th>
                       <th className="p-4 text-center w-1/6">تفاصيل الموظفين</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y text-[9px] font-bold">
                    {shopComparisonData.map((row, idx) => {
                       const diffCash = row.shopUserData.cash - row.collectorData.cash;
                       const diffMachine = row.shopUserData.machine - row.collectorData.machine;
                       const isMismatch = diffCash !== 0;

                       return (
                          <tr key={`${row.date}_${row.shopId}`} className={`hover:bg-gray-50 transition-colors ${isMismatch && row.collectorData.exists && row.shopUserData.exists ? 'bg-red-50' : ''}`}>
                             <td className="p-4">
                                <div className="text-[10px] text-gray-500 mb-1">{row.date}</div>
                                <p className="text-gray-900 font-black text-sm">{row.shopName}</p>
                                <p className="text-[8px] text-gray-400">{row.isHaitham ? 'هيثم' : row.partnerName}</p>
                             </td>
                             
                             <td className="p-4 text-center bg-indigo-50/20 border-l border-indigo-50 relative group">
                                {row.collectorData.exists ? (
                                   <div className="flex flex-col gap-1 items-center">
                                      <div className="text-indigo-600 font-black text-xs">{row.collectorData.cash.toLocaleString()} <span className="text-[8px] opacity-60">كاش</span></div>
                                      <div className="text-gray-500 text-[9px]">{row.collectorData.machine.toLocaleString()} <span className="text-[8px] opacity-60">ماكينات</span></div>
                                      <div className="absolute top-2 left-2 hidden group-hover:flex gap-1">
                                         <button onClick={() => { setEditingReport(JSON.parse(JSON.stringify(row.collectorData.report))); setIsReportModalOpen(true); }} className="w-5 h-5 bg-white rounded-md shadow flex items-center justify-center text-[10px] text-indigo-600 hover:bg-indigo-50">✏️</button>
                                         <button onClick={() => handleDeleteReport(row.collectorData.report!)} className="w-5 h-5 bg-white rounded-md shadow flex items-center justify-center text-[10px] text-red-600 hover:bg-red-50">×</button>
                                      </div>
                                   </div>
                                ) : (
                                   <span className="text-gray-300 italic">--</span>
                                )}
                             </td>

                             <td className="p-4 text-center bg-green-50/20 border-l border-green-50 relative group">
                                {row.shopUserData.exists ? (
                                   <div className="flex flex-col gap-1 items-center">
                                      <div className="text-green-600 font-black text-xs">{row.shopUserData.cash.toLocaleString()} <span className="text-[8px] opacity-60">كاش</span></div>
                                      <div className="text-gray-500 text-[9px]">{row.shopUserData.machine.toLocaleString()} <span className="text-[8px] opacity-60">ماكينات</span></div>
                                      <div className="absolute top-2 left-2 hidden group-hover:flex gap-1">
                                         <button onClick={() => { setEditingReport(JSON.parse(JSON.stringify(row.shopUserData.report))); setIsReportModalOpen(true); }} className="w-5 h-5 bg-white rounded-md shadow flex items-center justify-center text-[10px] text-green-600 hover:bg-green-50">✏️</button>
                                         <button onClick={() => handleDeleteReport(row.shopUserData.report!)} className="w-5 h-5 bg-white rounded-md shadow flex items-center justify-center text-[10px] text-red-600 hover:bg-red-50">×</button>
                                      </div>
                                   </div>
                                ) : (
                                   <span className="text-gray-300 italic">--</span>
                                )}
                             </td>

                             <td className="p-4 text-center border-l border-gray-50">
                                {row.collectorData.exists && row.shopUserData.exists ? (
                                   <div className="flex flex-col gap-1">
                                      <div className={`font-black text-xs ${diffCash < 0 ? 'text-red-600' : diffCash > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                         {diffCash > 0 ? '+' : ''}{diffCash.toLocaleString()} <span className="text-[8px] opacity-60 text-gray-400">كاش</span>
                                      </div>
                                      {diffMachine !== 0 && (
                                         <div className="text-[9px] text-red-400 font-bold">{diffMachine > 0 ? '+' : ''}{diffMachine} <span className="text-[8px] opacity-60 text-gray-400">ماكينات</span></div>
                                      )}
                                   </div>
                                ) : (
                                   <span className="text-gray-300 text-[8px]">غير مكتمل</span>
                                )}
                             </td>

                             <td className="p-4 text-center">
                                <div className="text-[8px] text-gray-500 space-y-1">
                                   <div className="bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">{row.collectorData.username !== '-' ? `محصل: ${row.collectorData.username}` : '-'}</div>
                                   <div className="bg-green-50 px-2 py-0.5 rounded text-green-700">{row.shopUserData.username !== '-' ? `محل: ${row.shopUserData.username}` : '-'}</div>
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                    {shopComparisonData.length === 0 && (
                       <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">لا توجد بيانات للمقارنة في هذه الفترة</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
      
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-center"><div className="flex bg-white p-1 rounded-2xl border shadow-sm"><button onClick={() => setPerfViewMode('shops')} className={`px-8 py-3 rounded-xl font-black text-[11px] ${perfViewMode === 'shops' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>🏢 أداء المحلات</button><button onClick={() => setPerfViewMode('users')} className={`px-8 py-3 rounded-xl font-black text-[11px] ${perfViewMode === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>👤 أداء الموظفين</button></div></div>
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <table className="w-full text-right table-auto">
              <thead className="bg-gray-50 border-b text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest"><tr><th className="p-1 md:p-6">العنصر</th><th className="p-1 md:p-6 text-center">التقارير</th><th className="p-1 md:p-6 text-center">الماكينات</th><th className="p-1 md:p-6 text-center text-green-600">الكاش (صافي)</th><th className="p-1 md:p-6 text-center text-indigo-600">الإجمالي</th></tr></thead>
              <tbody className="divide-y text-[7px] md:text-xs font-bold">
                {(perfViewMode === 'shops' ? shopsStats : usersStats).filter(x => x.reportCount > 0).map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-1 md:p-6 whitespace-normal break-words">{(item as any).name || (item as any).username}</td>
                    <td className="p-1 md:p-6 text-center">{item.reportCount}</td>
                    <td className="p-1 md:p-6 text-center">{item.machineTotal.toLocaleString()}</td
>                    <td className="p-1 md:p-6 text-center text-green-600">{item.cashNet !== undefined ? item.cashNet.toLocaleString() : (item as any).netCash.toLocaleString()}</td>
                    <td className="p-1 md:p-6 text-center text-lg text-indigo-600 font-black">{item.grandTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (smartAnalytics && (
        <div className="space-y-8 animate-in fade-in">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-xl"><h4 className="text-sm font-black opacity-60 uppercase mb-2 tracking-widest">مجموعة هيثم 👑</h4><p className="text-4xl font-black text-yellow-400">{smartAnalytics.haithamSales.toLocaleString()}</p></div>
              <div className="bg-orange-600 text-white p-10 rounded-[3rem] shadow-xl"><h4 className="text-sm font-black opacity-60 uppercase mb-2 tracking-widest">الشركاء 🤝</h4><p className="text-4xl font-black">{smartAnalytics.partnersSales.toLocaleString()}</p></div>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[3rem] border shadow-sm"><h4 className="text-xs font-black text-indigo-600 uppercase mb-6 border-b pb-4 tracking-widest">📊 حسب التصنيف</h4><div className="space-y-4">{smartAnalytics.byCategory.map(c => (<div key={c.name} className="flex justify-between text-[10px] font-black border-b border-gray-50 pb-2"><span>{c.name}</span><span>{c.total.toLocaleString()}</span></div>))}</div></div>
              <div className="bg-white p-8 rounded-[3rem] border shadow-sm"><h4 className="text-xs font-black text-green-600 uppercase mb-6 border-b pb-4 tracking-widest">📍 حسب المنطقة</h4><div className="space-y-4">{smartAnalytics.byLocation.map(l => (<div key={l.name} className="flex justify-between text-[10px] font-black border-b border-gray-50 pb-2"><span>{l.name}</span><span>{l.total.toLocaleString()}</span></div>))}</div></div>
              <div className="bg-white p-8 rounded-[3rem] border shadow-sm"><h4 className="text-xs font-black text-orange-600 uppercase mb-6 border-b pb-4 tracking-widest">🤝 مبيعات الشركاء</h4><div className="space-y-4">{smartAnalytics.byPartner.map(p => (<div key={p.name} className="flex justify-between text-[10px] font-black border-b border-gray-50 pb-2"><span>{p.name}</span><span>{p.total.toLocaleString()}</span></div>))}</div></div>
           </div>
        </div>
      ))}
      
      {activeTab === 'shop_details' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6">
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
            <h3 className="text-xl font-black mb-6 tracking-tight">🔍 تفاصيل مبيعات المحلات والمناطق</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
              <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">الموظف المسؤول</label><select className="w-full p-3 bg-indigo-50 border-indigo-100 rounded-xl font-black text-[10px] border outline-none text-indigo-600" value={detailsUserFilter} onChange={e=>setDetailsUserFilter(e.target.value)}><option value="all">كل الموظفين</option>{dynamicUsers.filter(u => u.role !== 'shop_user' && u.role !== 'partner').map(u => <option key={u.username} value={u.username}>{u.username}</option>)}</select></div>
              <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">التبعية</label><select className="w-full p-3 bg-gray-50 rounded-xl font-black text-[10px] border outline-none" value={detailsOwnerFilter} onChange={e=>setDetailsOwnerFilter(e.target.value as any)}><option value="all">كل المجموعات</option><option value="haitham">مجموعة هيثم 👑</option><option value="partner">الشركاء 🤝</option></select></div>
              {detailsOwnerFilter === 'partner' && (<div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">الشريك</label><select className="w-full p-3 bg-gray-50 rounded-xl font-black text-[10px] border outline-none" value={detailsPartnerFilter} onChange={e=>setDetailsPartnerFilter(e.target.value)}><option value="all">كل الشركاء</option>{partners.map(p => <option key={p} value={p}>{p}</option>)}</select></div>)}
              <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">المنطقة / الزون</label><select className="w-full p-3 bg-gray-50 rounded-xl font-black text-[10px] border outline-none" value={detailsLocationFilter} onChange={e=>setDetailsLocationFilter(e.target.value)}><option value="all">كل المناطق</option>{availableAreas.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
              <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">التصنيف</label><select className="w-full p-3 bg-gray-50 rounded-xl font-black text-[10px] border outline-none" value={detailsCategoryFilter} onChange={e=>setDetailsCategoryFilter(e.target.value)}><option value="all">كل التصنيفات</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div className="mb-6"><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">اختيار المحل أو مراقبة مبيعات الزون</label><select className="w-full p-5 bg-indigo-50 text-indigo-900 rounded-[2rem] font-black text-sm border-2 border-indigo-100 outline-none shadow-inner" value={detailsShopId} onChange={e=>setDetailsShopId(e.target.value)}><option value="">-- اختر من القائمة --</option><option value="ALL_FILTERED">📊 إجمالي كافة المحلات المفلترة</option>{detailsFilteredShops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.isHaitham ? 'هيثم' : s.partnerName})</option>)}</select></div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={()=>setDetailsTimeRange('today')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${detailsTimeRange === 'today' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>اليوم</button>
              <button onClick={()=>setDetailsTimeRange('yesterday')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${detailsTimeRange === 'yesterday' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>أمس</button>
              <button onClick={()=>setDetailsTimeRange('week')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${detailsTimeRange === 'week' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>أسبوع</button>
              <button onClick={()=>setDetailsTimeRange('custom')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${detailsTimeRange === 'custom' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>فترة محددة</button>
              <button onClick={()=>setDetailsTimeRange('all')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${detailsTimeRange === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>من البداية</button>
            </div>
            {detailsTimeRange === 'custom' && (
              <div className="flex gap-2 justify-center mt-6 animate-in slide-in-from-top-2">
                <input type="date" className="p-2 bg-white rounded-xl border text-[10px] font-black outline-none focus:border-indigo-600 shadow-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <input type="date" className="p-2 bg-white rounded-xl border text-[10px] font-black outline-none focus:border-indigo-600 shadow-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          {shopDetailedStats && (
            <div className="space-y-10 animate-in zoom-in-95">
              <div className="bg-white p-10 rounded-[3rem] border shadow-xl">
                <div className="flex justify-between items-start mb-10 border-b pb-6">
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{shopDetailedStats.title}</h2>
                  <span className="bg-gray-900 text-white px-5 py-2 rounded-full font-black text-[10px] shadow-lg">{shopDetailedStats.reportCount} تقارير فعّالة</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl"><h4 className="text-[10px] font-black opacity-60 uppercase mb-2 tracking-widest">إجمالي الماكينات</h4><p className="text-4xl font-black">{shopDetailedStats.machinesTotal.toLocaleString()}</p></div>
                  <div className="bg-green-600 text-white p-8 rounded-[2.5rem] shadow-xl"><h4 className="text-[10px] font-black opacity-60 uppercase mb-2 tracking-widest">صافي الكاش</h4><p className="text-4xl font-black">{shopDetailedStats.netCash.toLocaleString()}</p></div>
                  <div className="bg-indigo-950 text-white p-8 rounded-[2.5rem] shadow-2xl"><h4 className="text-[10px] font-black text-yellow-400 uppercase mb-2 tracking-widest">الإجمالي الكلي</h4><p className="text-4xl font-black text-yellow-400">{shopDetailedStats.grandTotal.toLocaleString()}</p></div>
                </div>
                
                <div className="border-t pt-10">
                   <div className="flex flex-wrap justify-between items-center mb-6">
                      <h3 className="text-lg font-black uppercase text-gray-800 flex items-center gap-2"><span>📊</span> تحليل ترتيب المبيعات</h3>
                      <div className="flex gap-2">
                         <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setSalesRankingSort('highest')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${salesRankingSort === 'highest' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500'}`}>الأكثر مبيعاً 🔝</button>
                            <button onClick={() => setSalesRankingSort('lowest')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${salesRankingSort === 'lowest' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}>الأقل مبيعاً 🔻</button>
                         </div>
                         <button onClick={handleExportRankingDetails} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">تصدير التفاصيل (Excel) 📥</button>
                      </div>
                   </div>
                   
                   <div className="overflow-x-auto">
                      <table className="w-full text-right table-auto">
                         <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase">
                            <tr>
                               <th className="p-4 rounded-tr-2xl">#</th>
                               <th className="p-4">المحل</th>
                               <th className="p-4">التصنيف</th>
                               <th className="p-4 text-center">إجمالي المبيعات</th>
                               <th className="p-4 text-center rounded-tl-2xl">نسبة المشاركة</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y text-[10px] font-bold">
                            {shopsRankingAnalysis.map((item, idx) => {
                               const percentage = shopDetailedStats.grandTotal > 0 ? (item.total / shopDetailedStats.grandTotal) * 100 : 0;
                               return (
                                  <tr key={item.shop.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="p-4 text-gray-400">{idx + 1}</td>
                                     <td className="p-4">
                                        <p className="text-gray-900">{item.shop.name}</p>
                                        <p className="text-[8px] text-gray-400">{item.shop.isHaitham ? 'هيثم' : item.shop.partnerName}</p>
                                     </td>
                                     <td className="p-4 text-gray-500">{item.shop.category}</td>
                                     <td className="p-4 text-center font-black text-indigo-600">{item.total.toLocaleString()}</td>
                                     <td className="p-4 text-center">
                                        <div className="flex items-center gap-2 justify-center">
                                           <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                           </div>
                                           <span className="text-[8px] text-gray-400">{percentage.toFixed(1)}%</span>
                                        </div>
                                     </td>
                                  </tr>
                               );
                            })}
                            {shopsRankingAnalysis.length === 0 && (
                               <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">لا توجد بيانات للعرض</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'database' && (
         <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
             <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="بحث باسم المحل..." className="p-3 bg-gray-50 rounded-xl border text-xs font-black w-64 outline-none focus:border-indigo-600 shadow-sm" value={dbSearchQuery} onChange={e=>setDbSearchQuery(e.target.value)} />
                <select className="p-3 bg-indigo-50 border-indigo-100 text-indigo-600 rounded-xl border text-xs font-black outline-none shadow-sm" value={dbFilterUser} onChange={e=>setDbFilterUser(e.target.value)}><option value="all">كل الموظفين</option>{dynamicUsers.filter(u => u.role !== 'shop_user' && u.role !== 'partner').map(u => <option key={u.username} value={u.username}>{u.username}</option>)}</select>
                <select className="p-3 bg-gray-50 rounded-xl border text-xs font-black outline-none shadow-sm" value={dbFilterOwner} onChange={e=>{setDbFilterOwner(e.target.value as any); setDbFilterPartner('all');}}><option value="all">كل المالكين</option><option value="haitham">هيثم 👑</option><option value="partners">الشركاء 🤝</option></select>
                {dbFilterOwner === 'partners' && (
                  <select className="p-3 bg-orange-50 border-orange-100 text-orange-600 rounded-xl border text-xs font-black outline-none shadow-sm animate-in slide-in-from-right-2" value={dbFilterPartner} onChange={e=>setDbFilterPartner(e.target.value)}>
                    <option value="all">كل الشركاء</option>
                    {partners.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                <select className="p-3 bg-gray-50 rounded-xl border text-xs font-black outline-none shadow-sm" value={dbFilterLocation} onChange={e=>setDbFilterLocation(e.target.value)}><option value="all">كل المناطق</option>{availableAreas.map(l => <option key={l} value={l}>{l}</option>)}</select>
                <div className="flex-1"></div>
                <button onClick={() => { setEditingShop({ isHaitham: true, standardTids: [], halaTids: [], notes: '', category: 'عام' }); setModalMachines([]); setIsShopModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg">+ إضافة محل جديد</button>
             </div>
             <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setIsCategoryModalOpen(true)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] border border-indigo-100 hover:bg-indigo-100 transition-colors">إدارة التصنيفات 📂</button>
                <button onClick={() => setIsPartnerModalOpen(true)} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl font-black text-[10px] border border-orange-100 hover:bg-orange-100 transition-colors">إدارة الشركاء 🤝</button>
                <button onClick={() => setIsLocationModalOpen(true)} className="bg-green-50 text-green-600 px-4 py-2 rounded-xl font-black text-[10px] border border-green-100 hover:bg-green-100 transition-colors">إدارة المناطق 📍</button>
             </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <table className="w-full text-right table-auto">
              <thead className="bg-gray-50 border-b text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest"><tr><th className="p-1 md:p-6">المحل / المنطقة</th><th className="p-1 md:p-6 text-center">الماكينات</th><th className="p-1 md:p-6 text-center text-indigo-600">إجمالي التقفيل</th><th className="p-1 md:p-6 text-center">إرسال طلب بيانات</th><th className="p-1 md:p-6 text-center">الإجراء</th></tr></thead>
              <tbody className="divide-y text-[7px] md:text-xs font-bold">
                {filteredDbShops.map(s => {
                  const isRequested = (systemStatus.activeSpotRequests || []).includes(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-1 md:p-6"><p className="text-gray-900 text-[8px] md:text-base font-black whitespace-normal break-words">{s.name}</p><p className="text-[6px] md:text-[10px] text-indigo-600 uppercase tracking-tighter">{s.location}</p></td>
                      <td className="p-1 md:p-6 text-center font-black">{(s.standardTids?.length || 0) + (s.halaTids?.length || 0)}</td>
                      <td className="p-1 md:p-6 text-center text-indigo-600 font-black">{shopsStats.find(x => x.id === s.id)?.grandTotal.toLocaleString() || 0}</td>
                      <td className="p-1 md:p-6 text-center">
                        {isRequested ? (
                          <button onClick={() => handleCancelSpot(s.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-[9px] border border-red-100 shadow-sm animate-pulse">إلغاء الطلب ❌</button>
                        ) : (
                          <button onClick={() => handleRequestSpot(s.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] shadow-md hover:bg-indigo-700 transition-all">🔔 طلب مراجعة فورية</button>
                        )}
                      </td>
                      <td className="p-1 md:p-6 text-center"><button onClick={() => { setEditingShop(s); const mStandard = (s.standardTids || []).map(m => typeof m === 'string' ? {tid: m, tripleCode: '', type: 'standard' as const} : {tid: m.tid, tripleCode: m.tripleCode || '', type: 'standard' as const}); const mHala = (s.halaTids || []).map(m => typeof m === 'string' ? {tid: m, tripleCode: '', type: 'hala' as const} : {tid: m.tid, tripleCode: m.tripleCode || '', type: 'hala' as const}); setModalMachines([...mStandard, ...mHala]); setIsShopModalOpen(true); }} className="text-indigo-600 font-black">تعديل ✏️</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ... (Approvals Tab) ... */}
      {activeTab === 'approvals' && (
        <div className="space-y-8 animate-in fade-in">
           <div className="text-center mb-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">نظام الاعتمادات والأرشفة</h2>
              <p className="text-gray-400 font-bold text-xs uppercase mt-1">الموافقة على طلبات الماكينات والمحلات من الموظفين</p>
           </div>
           <div className="flex justify-center mb-8">
              <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
                 <button onClick={() => setShowApprovalHistory(false)} className={`px-8 py-3 rounded-xl font-black text-[11px] transition-all ${!showApprovalHistory ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>الطلبات المعلقة ⏳</button>
                 <button onClick={() => setShowApprovalHistory(true)} className={`px-8 py-3 rounded-xl font-black text-[11px] transition-all ${showApprovalHistory ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>سجل الاعتمادات 📜</button>
              </div>
           </div>
           <section className="bg-white p-8 rounded-[3rem] border shadow-sm">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tight">🏧 طلبات الماكينات</h3>
              <div className="space-y-4">
                 {(machineRequests || []).filter(r => showApprovalHistory ? r.status !== 'pending' : r.status === 'pending').sort((a,b) => b.requestDate - a.requestDate).map(req => (
                    <div key={req.id} className={`flex flex-wrap items-center justify-between p-6 rounded-[2rem] border transition-all ${req.status === 'approved' ? 'bg-green-50/50 border-green-200' : req.status === 'rejected' ? 'bg-red-50/50 border-red-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
                       <div>
                          <p className="text-sm font-black text-indigo-900">{req.shopName}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-tighter">TID: {req.tid} | {req.type === 'standard' ? 'وصول' : 'هلا'} | الموظف: {req.username}</p>
                          {req.status !== 'pending' && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${req.status === 'approved' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{req.status === 'approved' ? 'تم الاعتماد ✅' : 'مرفوض ❌'}</span>}
                       </div>
                       <div className="flex gap-2">
                          {req.zReportImage && <button onClick={() => setSelectedImage(req.zReportImage!)} className="bg-white px-3 py-1 rounded-lg text-xs font-black shadow-sm">Z-Report 📸</button>}
                          {req.status === 'pending' && (
                            <>
                              <button onClick={async () => { const targetShop = shops.find(s => s.id === req.shopId); if (targetShop) { const m: ShopMachine = { tid: req.tid, tripleCode: req.tripleCode }; if (req.type === 'standard') targetShop.standardTids = [...(targetShop.standardTids || []), m]; else targetShop.halaTids = [...(targetShop.halaTids || []), m]; onUpdateShops([...shops]); const updatedReq: MachineRequest = { ...req, status: 'approved' }; onUpdateMachineRequests(machineRequests.map(mr => mr.id === req.id ? updatedReq : mr)); await cloudService.saveData(`mreq_${req.id}`, updatedReq); alert('✅ تم اعتماد الماكينة بنجاح'); } }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">اعتماد ✅</button>
                              <button onClick={async () => { const updatedReq: MachineRequest = { ...req, status: 'rejected' }; onUpdateMachineRequests(machineRequests.map(mr => mr.id === req.id ? updatedReq : mr)); await cloudService.saveData(`mreq_${req.id}`, updatedReq); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black">رفض ×</button>
                            </>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
           <section className="bg-white p-8 rounded-[3rem] border shadow-sm mt-8">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tight">🏪 طلبات إضافة محلات جديدة</h3>
              <div className="space-y-4">
                 {(shopRequests || []).filter(r => showApprovalHistory ? r.status !== 'pending' : r.status === 'pending').sort((a,b) => b.requestDate - a.requestDate).map(req => (
                    <div key={req.id} className={`flex flex-wrap items-center justify-between p-6 rounded-[2rem] border transition-all ${req.status === 'approved' ? 'bg-green-50/50 border-green-200' : req.status === 'rejected' ? 'bg-red-50/50 border-red-200' : 'bg-green-50/50 border-green-100'}`}>
                       <div>
                          <p className="text-sm font-black text-green-900">{req.requestedName}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-tighter">المنطقة: {req.requestedLocation} | المالك: {req.isHaitham ? 'هيثم' : `شريك (${req.partnerName})`} | الموظف: {req.username}</p>
                          {req.status !== 'pending' && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${req.status === 'approved' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{req.status === 'approved' ? 'تم الاعتماد ✅' : 'مرفوض ❌'}</span>}
                       </div>
                       <div className="flex gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={async () => { const newShop: Shop = { id: `shop-${Date.now()}`, name: req.requestedName, location: req.requestedLocation, category: req.requestedCategory || 'عام', isHaitham: req.isHaitham, partnerName: req.partnerName, standardTids: req.initialTid ? [{ tid: req.initialTid, tripleCode: req.initialTripleCode }] : [], halaTids: [], notes: 'محل مضاف بطلب موظف' }; onUpdateShops([...shops, newShop]); const updatedReq: ShopRequest = { ...req, status: 'approved' }; onUpdateShopRequests(shopRequests.map(sr => sr.id === req.id ? updatedReq : sr)); await cloudService.saveData(`sreq_${req.id}`, updatedReq); alert('✅ تم اعتماد وإضافة المحل بنجاح'); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">اعتماد ✅</button>
                              <button onClick={async () => { const updatedReq: ShopRequest = { ...req, status: 'rejected' }; onUpdateShopRequests(shopRequests.map(sr => sr.id === req.id ? updatedReq : sr)); await cloudService.saveData(`sreq_${req.id}`, updatedReq); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black">رفض ×</button>
                            </>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
           <section className="bg-white p-8 rounded-[3rem] border shadow-sm mt-8">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tight">✏️ طلبات تعديل أسماء المحلات</h3>
              <div className="space-y-4">
                 {(renameRequests || []).filter(r => showApprovalHistory ? r.status !== 'pending' : r.status === 'pending').sort((a,b) => b.requestDate - a.requestDate).map(req => (
                    <div key={req.id} className={`flex flex-wrap items-center justify-between p-6 rounded-[2rem] border transition-all ${req.status === 'approved' ? 'bg-green-50/50 border-green-200' : req.status === 'rejected' ? 'bg-red-50/50 border-red-200' : 'bg-orange-50/50 border-orange-100'}`}>
                       <div>
                          <p className="text-sm font-black text-orange-900">من: {req.oldName}</p>
                          <p className="text-sm font-black text-indigo-900">إلى: {req.newName}</p>
                          {req.status !== 'pending' && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${req.status === 'approved' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{req.status === 'approved' ? 'تم الاعتماد ✅' : 'مرفوض ❌'}</span>}
                       </div>
                       <div className="flex gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={async () => { const updatedShops = shops.map(s => s.id === req.shopId ? { ...s, name: req.newName } : s); onUpdateShops(updatedShops); const updatedReq: ShopRenameRequest = { ...req, status: 'approved' }; onUpdateRenameRequests(renameRequests.map(rr => rr.id === req.id ? updatedReq : rr)); await cloudService.saveData(`rnreq_${req.id}`, updatedReq); alert('✅ تم تغيير اسم المحل بنجاح'); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">اعتماد ✅</button>
                              <button onClick={async () => { const updatedReq: ShopRenameRequest = { ...req, status: 'rejected' }; onUpdateRenameRequests(renameRequests.map(rr => rr.id === req.id ? updatedReq : rr)); await cloudService.saveData(`rnreq_${req.id}`, updatedReq); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black">رفض ×</button>
                            </>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
           <section className="bg-white p-8 rounded-[3rem] border shadow-sm mt-8 border-indigo-200">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tight text-indigo-700">👤 طلبات تسجيل حسابات المحلات</h3>
              <div className="space-y-4">
                 {(accountRegistrations || []).filter(r => showApprovalHistory ? r.status !== 'pending' : r.status === 'pending').sort((a,b) => b.requestDate - a.requestDate).map(req => (
                    <div key={req.id} className={`flex flex-wrap items-center justify-between p-6 rounded-[2rem] border transition-all ${req.status === 'approved' ? 'bg-green-50/50 border-green-200' : req.status === 'rejected' ? 'bg-red-50/50 border-red-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
                       <div>
                          <p className="text-sm font-black text-gray-900">{req.shopName}</p>
                          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Username: {req.username} | Pass: {req.password}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-tighter">WhatsApp: {req.whatsapp}</p>
                          {req.status !== 'pending' && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${req.status === 'approved' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{req.status === 'approved' ? 'تم الاعتماد ✅' : 'مرفوض ❌'}</span>}
                       </div>
                       <div className="flex gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={async () => { const newUser = { username: req.username, password: req.password, role: 'shop_user', phone: req.whatsapp }; const updatedUsers = [...dynamicUsers.filter(u => u.username !== newUser.username), newUser]; onUpdateUsers(updatedUsers); const updatedReq: AccountRegistrationRequest = { ...req, status: 'approved' }; onUpdateAccountRegistrations(accountRegistrations.map(ar => ar.id === req.id ? updatedReq : ar)); await cloudService.saveData(`accreg_${req.id}`, updatedReq); alert(`✅ Account Approved! Username: ${req.username} | Pass: ${req.password}`); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">اعتماد ✅</button>
                              <button onClick={async () => { const updatedReq: AccountRegistrationRequest = { ...req, status: 'rejected' }; onUpdateAccountRegistrations(accountRegistrations.map(ar => ar.id === req.id ? updatedReq : ar)); await cloudService.saveData(`accreg_${req.id}`, updatedReq); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black">رفض ×</button>
                            </>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
              <h3 className="text-xl font-black uppercase">👥 إدارة حسابات الموظفين والشركاء</h3>
              <button onClick={() => { setEditingUser({ username: '', password: '', role: 'user' }); setEditingUserOriginalName(null); setIsUserModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs shadow-lg">+ إضافة حساب جديد</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allSystemAccounts.map(u => (
                <div key={u.username} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-md ${u.isStatic ? 'border-indigo-100' : ''}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div><h4 className="text-lg font-black text-gray-900 uppercase">{u.username}</h4><span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : u.role === 'partner' ? 'bg-orange-100 text-orange-600' : u.role === 'haitham_manager' ? 'bg-indigo-100 text-indigo-600' : u.role === 'reviewer' ? 'bg-amber-100 text-amber-600' : u.role === 'shop_user' ? 'bg-blue-100 text-blue-600' : u.role === 'partnership_manager' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>{u.role}</span></div>
                      {!u.isStatic && (
                        <div className="flex gap-2">
                           <button onClick={() => { setEditingUser(u); setEditingUserOriginalName(u.username); setIsUserModalOpen(true); }} className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs">✏️</button>
                           <button onClick={() => handleDeleteUser(u.username)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-xs">×</button>
                        </div>
                      )}
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-[10px] font-black text-gray-400 uppercase">كلمة المرور</span>
                        <div className="flex items-center gap-2">
                           <p className="font-black text-xs">{visiblePasswords[u.username] ? u.password : '••••••••'}</p>
                           <button onClick={() => setVisiblePasswords(p => ({ ...p, [u.username]: !p[u.username] }))} className="text-[10px]">👁️</button>
                        </div>
                      </div>
                      {(u.role === 'user' || u.role === 'haitham_manager' || u.role === 'partnership_manager') && (
                        <button onClick={() => setSelectedUserForAssign(u.username)} className={`w-full py-3 rounded-xl text-[10px] font-black transition-all ${selectedUserForAssign === u.username ? 'bg-indigo-600 text-white' : 'bg-white border text-indigo-600 hover:bg-indigo-50'}`}>إدارة المخصصات 🗺️</button>
                      )}
                      {u.role === 'partner' && (
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black text-center">
                          شريك: {u.partnerName || 'غير محدد'}
                        </div>
                      )}
                      {u.role === 'shop_user' && (
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black text-center">
                          محل: {shops.find(s=>s.id===u.shopId)?.name || 'غير محدد'}
                        </div>
                      )}
                      {u.phone && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-xl mt-2 justify-center border border-green-100">
                          <span className="text-green-600 text-xs">📞</span>
                          <span className="text-[10px] font-black text-green-700">{u.phone}</span>
                          <a href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-[9px] underline text-green-600 font-bold">محادثة واتساب</a>
                        </div>
                      )}
                   </div>
                </div>
              ))}
           </div>
           {selectedUserForAssign && (
              <div className="bg-white p-8 rounded-[3rem] border shadow-xl animate-in slide-in-from-bottom-6">
                  <div className="flex justify-between items-center mb-8 border-b pb-4">
                     <h3 className="text-xl font-black uppercase">🗺️ تخصيص لـ ({selectedUserForAssign})</h3>
                     <button onClick={() => setSelectedUserForAssign('')} className="bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-xs font-black">إغلاق</button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div>
                        <h4 className="text-[11px] font-black text-orange-600 uppercase mb-4 tracking-widest border-b pb-2">🤝 تخصيص الشركاء</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                           {partners.map(p => {
                              const isAssigned = (assignments || []).find(a => a.username === selectedUserForAssign)?.partnerNames?.includes(p);
                              return (<button key={p} onClick={() => toggleAssignment(selectedUserForAssign, 'partner', p)} className={`p-3 rounded-xl text-[9px] font-black transition-all border ${isAssigned ? 'bg-orange-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{p}</button>);
                           })}
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                           <h4 className="text-[11px] font-black text-indigo-600 uppercase">🏢 تخصيص محلات فردية</h4>
                           <div className="flex bg-gray-100 p-1 rounded-lg">
                              <button onClick={() => setAssignShopGroup('haitham')} className={`px-4 py-1 rounded-md text-[9px] font-black ${assignShopGroup === 'haitham' ? 'bg-white text-indigo-600' : 'text-gray-400'}`}>هيثم</button>
                              <button onClick={() => setAssignShopGroup('partner')} className={`px-4 py-1 rounded-md text-[9px] font-black ${assignShopGroup === 'partner' ? 'bg-white text-orange-600' : 'text-gray-400'}`}>شركاء</button>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                           {shops.filter(s => assignShopGroup === 'haitham' ? s.isHaitham : !s.isHaitham).map(s => {
                              const isAssigned = (assignments || []).find(a => a.username === selectedUserForAssign)?.shopIds?.includes(s.id);
                              return (<button key={s.id} onClick={() => toggleAssignment(selectedUserForAssign, 'shop', s.id)} className={`p-3 rounded-xl text-[9px] font-black transition-all border ${isAssigned ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{s.name}</button>);
                           })}
                        </div>
                     </div>
                  </div>
              </div>
           )}
        </div>
      )}

      {/* ... (Existing Control Tab) ... */}
      {activeTab === 'control' && (
        // ... (Existing implementation of control) ...
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
            <h3 className="text-xl font-black mb-6 text-center">⚙️ التحكم بالنظام</h3>
            
            <div className="mb-10 bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-100 shadow-sm">
               <h4 className="text-lg font-black text-red-600 uppercase mb-6 flex items-center gap-2">
                 <span>📢</span> نظام التوجيه والإنذارات المباشرة
               </h4>
               
               <div className="space-y-8">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                     <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">1. توجيه المحصلين الميدانيين</label>
                     <div className="flex flex-wrap gap-3 items-center">
                        <select className="flex-1 p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none" value={alertCollector} onChange={e => setAlertCollector(e.target.value)}>
                           <option value="">اختر المحصل...</option>
                           {dynamicUsers.filter(u => u.role === 'user').map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                        </select>
                        <button onClick={() => { if(!alertCollector) return alert('اختر محصل أولاً'); handleSendGlobalAlert('user', alertCollector, '🚨 عاجل: ابدأ فوراً بعمل جولات (Spot Check) لجميع المحلات المخصصة لك الآن!'); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-indigo-700 shadow-md">أمر ببدء السبوت (Spot) 🔍</button>
                        <button onClick={() => { if(!alertCollector) return alert('اختر محصل أولاً'); handleSendGlobalAlert('user', alertCollector, '💰 عاجل: ابدأ فوراً بعمليات التقفيل النهائي لجميع المحلات المخصصة لك!'); }} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-green-700 shadow-md">أمر ببدء التقفيل 💰</button>
                        <button onClick={() => { if(!alertCollector) return alert('اختر محصل أولاً'); handleCancelAlert('user', alertCollector); }} className="bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-black text-[10px] hover:bg-gray-300 shadow-md">إلغاء 🔕</button>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50">
                     <label className="text-[10px] font-black text-blue-400 uppercase mb-2 block">2. إنذار جماعي لحسابات المحلات (Shop Accounts)</label>
                     <div className="flex flex-wrap gap-3">
                        <button onClick={() => handleSendGlobalAlert('shop_user', 'all', 'URGENT: Please start entering SPOT CHECK data for your shop immediately!')} className="flex-1 bg-indigo-50 text-indigo-600 border border-indigo-100 px-6 py-4 rounded-xl font-black text-[11px] hover:bg-indigo-600 hover:text-white transition-all shadow-sm">BroadCast: Start Spot Check (English) 📢</button>
                        <button onClick={() => handleSendGlobalAlert('shop_user', 'all', 'URGENT: Please start entering FINAL CLOSING data for your shop immediately!')} className="flex-1 bg-green-50 text-green-600 border border-green-100 px-6 py-4 rounded-xl font-black text-[11px] hover:bg-green-600 hover:text-white transition-all shadow-sm">BroadCast: Start Final Closing (English) 📢</button>
                        <button onClick={() => handleCancelAlert('shop_user', 'all')} className="flex-1 bg-red-100 text-red-600 border border-red-200 px-6 py-4 rounded-xl font-black text-[11px] hover:bg-red-200 transition-all shadow-sm">Cancel All Alarms 🔕</button>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                     <label className="text-[10px] font-black text-orange-400 uppercase mb-2 block">3. توجيه الشركاء</label>
                     <div className="flex flex-wrap gap-3 items-center">
                        <select className="flex-1 p-3 bg-gray-50 border rounded-xl font-black text-xs outline-none" value={alertPartner} onChange={e => setAlertPartner(e.target.value)}>
                           <option value="">اختر الشريك...</option>
                           {partners.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button onClick={() => { if(!alertPartner) return alert('اختر شريك أولاً'); handleSendGlobalAlert('partner', alertPartner, 'الرجاء البدء بإدخال بيانات التقفيل لمحلاتك الآن.'); }} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black text-[10px] hover:bg-orange-700 shadow-md">طلب إدخال بيانات التقفيل 📝</button>
                        <button onClick={() => { if(!alertPartner) return alert('اختر شريك أولاً'); handleCancelAlert('partner', alertPartner); }} className="bg-gray-200 text-gray-600 px-8 py-3 rounded-xl font-black text-[10px] hover:bg-gray-300 shadow-md">إلغاء 🔕</button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="max-w-md mx-auto p-8 border rounded-[2rem] space-y-4 bg-gray-50">
               <h4 className="text-sm font-black text-gray-600 uppercase mb-4">بوابة التقفيل النهائي</h4>
               
               <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-4 shadow-sm">
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">تاريخ التقفيل الموحد</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-gray-50 border rounded-xl font-black text-center outline-none focus:border-indigo-600 transition-all" 
                    value={gateDate} 
                    onChange={e => setGateDate(e.target.value)}
                    disabled={systemStatus.reconciliationEnabled}
                  />
                  <p className="text-[9px] text-gray-400 mt-2 text-center">
                    {systemStatus.reconciliationEnabled ? '⚠️ لا يمكن تغيير التاريخ أثناء فتح البوابة' : 'اختر التاريخ الذي سيظهر افتراضياً لجميع المستخدمين'}
                  </p>
               </div>

               <button 
                 onClick={() => { 
                    const newStatus = !systemStatus.reconciliationEnabled;
                    onUpdateStatus({ 
                      ...systemStatus, 
                      reconciliationEnabled: newStatus,
                      forcedDate: newStatus ? gateDate : undefined // Set forced date only when enabling
                    }); 
                 }} 
                 className={`w-full py-6 rounded-2xl font-black text-xl transition-all shadow-xl ${systemStatus.reconciliationEnabled ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
               >
                 {systemStatus.reconciliationEnabled ? '🔒 إغلاق البوابة الآن' : '🔓 فتح البوابة وتعميم التاريخ'}
               </button>
               <p className="text-[10px] font-bold text-gray-400 mt-2 text-center">عند إغلاق البوابة، لن يتمكن الموظفون من إرسال تقارير "التقفيل النهائي".</p>
            </div>
            
            <div className="mt-10 pt-10 border-t flex flex-col items-center">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">إدارة التحديثات</span>
               <button onClick={handleRefreshData} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:shadow-lg active:scale-95 transition-all">تحديث كافة البيانات من السحاب 🔄</button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Existing Modals: Reports, Shop, etc.) ... */}
      {isReportModalOpen && editingReport && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh] text-right">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-2xl font-black uppercase">✏️ تعديل بيانات التقرير</h3>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{editingReport.shopName}</span>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">تاريخ التقرير</label>
                    <input type="date" className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none" value={editingReport.date} onChange={e => setEditingReport({...editingReport, date: e.target.value})} />
                 </div>
                 <div className="bg-gray-50 p-6 rounded-[2rem] border space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-tight">🏧 مبيعات الماكينات</h4>
                    {(editingReport.posMachines || []).map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-3">
                         <div className="flex-1">
                            <label className="text-[8px] font-black text-gray-400 mb-1 block uppercase">TID: {m.tid}</label>
                            <input type="number" className="w-full p-3 bg-white border rounded-xl font-black text-xs outline-none focus:border-indigo-600 shadow-sm" value={m.amount || 0} onChange={e => { const newMachines = [...editingReport.posMachines]; newMachines[idx] = { ...newMachines[idx], amount: Number(e.target.value) }; setEditingReport({...editingReport, posMachines: newMachines}); }} />
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl">
                       <h4 className="text-[10px] font-black opacity-60 uppercase mb-3">الكاش</h4>
                       <input type="number" className="w-full p-3 bg-white/10 rounded-xl text-center text-lg font-black outline-none border border-white/20 focus:border-white" value={editingReport.isHaitham || editingReport.reportType === 'spot-check' ? editingReport.cashReceived : editingReport.cashRemaining} onChange={e => { if (editingReport.isHaitham || editingReport.reportType === 'spot-check') { setEditingReport({...editingReport, cashReceived: Number(e.target.value)}); } else { setEditingReport({...editingReport, cashRemaining: Number(e.target.value)}); } }} />
                    </div>
                    <div className="bg-orange-600 text-white p-6 rounded-[2rem] shadow-xl">
                       <h4 className="text-[10px] font-black opacity-60 uppercase mb-3">العمولة</h4>
                       <input type="number" className="w-full p-3 bg-white/10 rounded-xl text-center text-lg font-black outline-none border border-white/20 focus:border-white" value={editingReport.commission || 0} onChange={e => setEditingReport({...editingReport, commission: Number(e.target.value)})} />
                    </div>
                 </div>
                 <div><label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">ملاحظات التقرير</label><textarea className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none min-h-[100px]" value={editingReport.notes || ''} onChange={e => setEditingReport({...editingReport, notes: e.target.value})} /></div>
                 <div className="flex gap-4 pt-4"><button onClick={handleSaveEditedReport} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">حفظ التعديلات ✅</button><button onClick={() => setIsReportModalOpen(false)} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black">إلغاء</button></div>
              </div>
           </div>
        </div>
      )}
      
      {isShopModalOpen && (<div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh] text-right"><h3 className="text-2xl font-black mb-8 border-b pb-4 uppercase">🏢 إضافة/تعديل محل</h3><div className="space-y-6"><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">اسم المحل</label><input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none" value={editingShop?.name || ''} onChange={e=>setEditingShop({...editingShop, name: e.target.value})} /></div><div><label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">المنطقة</label><select className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none" value={editingShop?.location || ''} onChange={e=>setEditingShop({...editingShop, location: e.target.value})}><option value="">اختر منطقة</option>{availableAreas.map(l=><option key={l} value={l}>{l}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">التصنيف</label><select className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none" value={editingShop?.category || ''} onChange={e=>setEditingShop({...editingShop, category: e.target.value})}><option value="">اختر تصنيف</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div><label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">التبعية</label><div className="flex gap-2 p-1 bg-gray-100 rounded-2xl"><button onClick={()=>setEditingShop({...editingShop, isHaitham: true})} className={`flex-1 py-3 rounded-xl font-black text-xs ${editingShop?.isHaitham ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>هيثم</button><button onClick={()=>setEditingShop({...editingShop, isHaitham: false})} className={`flex-1 py-3 rounded-xl font-black text-xs ${!editingShop?.isHaitham ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>شريك</button></div></div></div>{!editingShop?.isHaitham && (<div><label className="text-[10px] text-gray-400 block mb-2 uppercase font-black">اسم الشريك</label><select className="w-full p-4 bg-gray-50 border rounded-2xl font-black outline-none" value={editingShop?.partnerName || ''} onChange={e=>setEditingShop({...editingShop, partnerName: e.target.value})}><option value="">اختر شريك</option>{partners.map(p=><option key={p} value={p}>{p}</option>)}</select></div>)}<div className="bg-gray-50 p-6 rounded-[2rem] border space-y-4"><div className="flex justify-between items-center"><h4 className="text-xs font-black uppercase">🏧 الماكينات التابعة</h4><button onClick={()=>setModalMachines([...modalMachines, {tid: '', tripleCode: '', type: 'standard'}])} className="bg-indigo-600 text-white px-4 py-1 rounded-lg text-[10px] font-black">+ إضافة ماكينة</button></div>{modalMachines.map((m, idx) => (<div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"><div><label className="text-[8px] font-black text-gray-400 mb-1 block uppercase">رقم TID</label><input type="text" className="w-full p-2 bg-white border rounded-xl text-xs font-black" value={m.tid} onChange={e=>setModalMachines(modalMachines.map((item,i)=>i===idx?{...item, tid: e.target.value}:item))} /></div><div><label className="text-[8px] font-black text-gray-400 mb-1 block uppercase">الكود الثلاثي</label><input type="text" maxLength={3} className="w-full p-2 bg-white border rounded-xl text-xs font-black" value={m.tripleCode} onChange={e=>setModalMachines(modalMachines.map((item,i)=>i===idx?{...item, tripleCode: e.target.value}:item))} /></div><div><label className="text-[8px] font-black text-gray-400 mb-1 block uppercase">النوع</label><select className="w-full p-2 bg-white border rounded-xl text-xs font-black" value={m.type} onChange={e=>setModalMachines(modalMachines.map((item,i)=>i===idx?{...item, type: e.target.value as any}:item))}><option value="standard">وصول</option><option value="hala">هلا</option></select></div><button onClick={()=>setModalMachines(modalMachines.filter((_,i)=>i!==idx))} className="bg-red-50 text-red-600 p-2 rounded-xl text-xs">×</button></div>))}</div><div className="flex gap-4 pt-4"><button onClick={handleSaveShop} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">حفظ</button><button onClick={()=>setIsShopModalOpen(false)} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black">إلغاء</button></div></div></div></div>)}
      
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[1200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] max-w-lg w-full shadow-2xl animate-in zoom-in-95 text-right overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black mb-8 border-b pb-4 uppercase text-indigo-900">
              {editingUserOriginalName ? '✏️ تعديل بيانات الحساب' : '👤 إضافة حساب جديد'}
            </h3>
            <div className="space-y-4">
              
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 block uppercase">اسم المستخدم (Login ID)</label>
                <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-sm outline-none focus:border-indigo-600" placeholder="Username" value={editingUser?.username || ''} onChange={e=>setEditingUser({...editingUser, username: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 block uppercase">كلمة المرور</label>
                <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-sm outline-none focus:border-indigo-600" placeholder="Password" value={editingUser?.password || ''} onChange={e=>setEditingUser({...editingUser, password: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 block uppercase">نوع الصلاحية (Role)</label>
                <select className="w-full p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl font-black text-sm outline-none focus:border-indigo-600 text-indigo-700" value={editingUser?.role || 'user'} onChange={e=>setEditingUser({...editingUser, role: e.target.value})}>
                  <option value="user">محصل ميداني (Collector)</option>
                  <option value="shop_user">حساب محل (Shop User)</option>
                  <option value="partner">شريك (Partner)</option>
                  <option value="reviewer">مراقب / مراجع (Reviewer)</option>
                  <option value="haitham_manager">مدير مجموعة هيثم</option>
                  <option value="partnership_manager">مسئول شراكة (Partnership Manager)</option>
                </select>
              </div>

              {editingUser?.role === 'partner' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-orange-400 mb-1 block uppercase">ربط بالشريك</label>
                  <select className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl font-black text-sm outline-none focus:border-orange-600 text-orange-700" value={editingUser?.partnerName || ''} onChange={e=>setEditingUser({...editingUser, partnerName: e.target.value})}>
                    <option value="">-- اختر الشريك --</option>
                    {partners.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {editingUser?.role === 'shop_user' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-blue-400 mb-1 block uppercase">ربط بالمحل</label>
                  <select className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-sm outline-none focus:border-blue-600 text-blue-700" value={editingUser?.shopId || ''} onChange={e=>setEditingUser({...editingUser, shopId: e.target.value})}>
                    <option value="">-- اختر المحل --</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 block uppercase">رقم الهاتف / الواتساب (اختياري)</label>
                <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-sm outline-none focus:border-green-600" placeholder="05xxxxxxxx" value={editingUser?.phone || ''} onChange={e=>setEditingUser({...editingUser, phone: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4 border-t mt-4">
                <button onClick={handleSaveUser} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all">حفظ البيانات ✅</button>
                <button onClick={()=>setIsUserModalOpen(false)} className="px-10 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">إلغاء</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {isPartnerModalOpen && (<div className="fixed inset-0 bg-black/95 z-[1100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white p-8 rounded-[3rem] max-w-xl w-full text-right shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="text-2xl font-black">🤝 إدارة الشركاء</h3><button onClick={() => setIsPartnerModalOpen(false)} className="text-gray-400 text-4xl">&times;</button></div><div className="flex gap-2 mb-6"><input type="text" placeholder="اسم شريك جديد..." className="flex-1 p-4 bg-gray-50 border rounded-2xl text-right font-black outline-none focus:border-indigo-600" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && newPartnerName.trim()) { onUpdatePartners([...partners, newPartnerName.trim()]); setNewPartnerName(''); } }} /><button onClick={() => { if(newPartnerName.trim()) { onUpdatePartners([...partners, newPartnerName.trim()]); setNewPartnerName(''); } }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm">إضافة</button></div><div className="overflow-y-auto flex-1 custom-scrollbar space-y-2">{partners.map((p, idx) => (<div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border transition-all hover:bg-white">{editTarget?.type === 'partner' && editTarget.index === idx ? (<div className="flex-1 flex gap-2"><input className="flex-1 p-2 border-2 border-indigo-200 rounded-xl font-black text-xs outline-none" value={editTarget.current} onChange={e => setEditTarget({...editTarget, current: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveEditedManagementItem()} /><button onClick={saveEditedManagementItem} className="bg-green-600 text-white px-3 py-1 rounded-lg font-black text-[10px]">حفظ</button><button onClick={() => setEditTarget(null)} className="text-gray-400 font-black text-[10px]">إلغاء</button></div>) : (<><span className="font-black text-gray-900 text-xs">{p}</span><div className="flex gap-3"><button onClick={() => setEditTarget({type: 'partner', index: idx, original: p, current: p})} className="text-indigo-600 font-black text-xs">تعديل</button><button onClick={() => { if(confirm('هل تريد حذف هذا الشريك من القائمة؟')) onUpdatePartners(partners.filter((_, i) => i !== idx)); }} className="text-red-600 font-black text-xs">حذف</button></div></>)}</div>))}</div></div></div>)}
      {isCategoryModalOpen && (<div className="fixed inset-0 bg-black/95 z-[1100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white p-8 rounded-[3rem] max-w-xl w-full text-right shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="text-2xl font-black">📂 إدارة التصنيفات</h3><button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 text-4xl">&times;</button></div><div className="flex gap-2 mb-6"><input type="text" placeholder="تصنيف جديد..." className="flex-1 p-4 bg-gray-50 border rounded-2xl text-right font-black outline-none focus:border-indigo-600" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && newCategoryName.trim()) { onUpdateCategories([...categories, newCategoryName.trim()]); setNewCategoryName(''); } }} /><button onClick={() => { if(newCategoryName.trim()) { onUpdateCategories([...categories, newCategoryName.trim()]); setNewCategoryName(''); } }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm">إضافة</button></div><div className="overflow-y-auto flex-1 custom-scrollbar space-y-2">{categories.map((c, idx) => (<div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border transition-all hover:bg-white">{editTarget?.type === 'category' && editTarget.index === idx ? (<div className="flex-1 flex gap-2"><input className="flex-1 p-2 border-2 border-indigo-200 rounded-xl font-black text-xs outline-none" value={editTarget.current} onChange={e => setEditTarget({...editTarget, current: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveEditedManagementItem()} /><button onClick={saveEditedManagementItem} className="bg-green-600 text-white px-3 py-1 rounded-lg font-black text-[10px]">حفظ</button><button onClick={() => setEditTarget(null)} className="text-gray-400 font-black text-[10px]">إلغاء</button></div>) : (<><span className="font-black text-gray-900 text-xs">{c}</span><div className="flex gap-3"><button onClick={() => setEditTarget({type: 'category', index: idx, original: c, current: c})} className="text-indigo-600 font-black text-xs">تعديل</button><button onClick={() => { if(confirm('حذف التصنيف قد يؤدي لمشاكل في فلترة المحلات، هل أنت متأكد؟')) onUpdateCategories(categories.filter((_, i) => i !== idx)); }} className="text-red-600 font-black text-xs">حذف</button></div></>)}</div>))}</div></div></div>)}
      {isLocationModalOpen && (<div className="fixed inset-0 bg-black/95 z-[1100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white p-8 rounded-[3rem] max-w-xl w-full text-right shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="text-2xl font-black">📍 إدارة المناطق</h3><button onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 text-4xl">&times;</button></div><div className="flex gap-2 mb-6"><input type="text" placeholder="منطقة جديدة..." className="flex-1 p-4 bg-gray-50 border rounded-2xl text-right font-black outline-none focus:border-indigo-600" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && newLocationName.trim()) { onUpdateLocations([...locations, newLocationName.trim()]); setNewLocationName(''); } }} /><button onClick={() => { if(newLocationName.trim()) { onUpdateLocations([...locations, newLocationName.trim()]); setNewLocationName(''); } }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm">إضافة</button></div><div className="overflow-y-auto flex-1 custom-scrollbar space-y-2">{locations.map((l, idx) => (<div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border transition-all hover:bg-white">{editTarget?.type === 'location' && editTarget.index === idx ? (<div className="flex-1 flex gap-2"><input className="flex-1 p-2 border-2 border-indigo-200 rounded-xl font-black text-xs outline-none" value={editTarget.current} onChange={e => setEditTarget({...editTarget, current: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveEditedManagementItem()} /><button onClick={saveEditedManagementItem} className="bg-green-600 text-white px-3 py-1 rounded-lg font-black text-[10px]">حفظ</button><button onClick={() => setEditTarget(null)} className="text-gray-400 font-black text-[10px]">إلغاء</button></div>) : (<><span className="font-black text-gray-900 text-xs">{l}</span><div className="flex gap-3"><button onClick={() => setEditTarget({type: 'location', index: idx, original: l, current: l})} className="text-indigo-600 font-black text-xs">تعديل</button><button onClick={() => { if(confirm('هل تريد حذف هذه المنطقة من القائمة؟')) onUpdateLocations(locations.filter((_, i) => i !== idx)); }} className="text-red-600 font-black text-xs">حذف</button></div></>)}</div>))}</div></div></div>)}

      {selectedCashReport && (
        <div className="fixed inset-0 bg-black/95 z-[1300] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white p-8 rounded-[3rem] max-w-md w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <div>
                   <h3 className="text-xl font-black">💰 تفاصيل العهدة</h3>
                   {isEditingCashReport && <span className="text-[10px] text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded-md">وضع التعديل ✏️</span>}
                 </div>
                 <button onClick={() => { setSelectedCashReport(null); setIsEditingCashReport(false); }} className="text-gray-400 text-2xl">&times;</button>
              </div>
              <div className="space-y-2 mb-6 text-right">
                 {!isEditingCashReport ? (
                   <div className="flex justify-between font-black text-xs text-gray-400 border-b pb-2"><span>الفئة</span><span>العدد / القيمة</span></div>
                 ) : (
                   <div className="flex justify-between font-black text-xs text-indigo-600 border-b pb-2"><span>الفئة</span><span>تعديل العدد</span></div>
                 )}
                 {renderDenominationRow('500 ريال', 500, 'val500', selectedCashReport.denominations.val500)}
                 {renderDenominationRow('200 ريال', 200, 'val200', selectedCashReport.denominations.val200)}
                 {renderDenominationRow('100 ريال', 100, 'val100', selectedCashReport.denominations.val100)}
                 {renderDenominationRow('50 ريال', 50, 'val50', selectedCashReport.denominations.val50)}
                 {renderDenominationRow('20 ريال', 20, 'val20', selectedCashReport.denominations.val20)}
                 {renderDenominationRow('10 ريال', 10, 'val10', selectedCashReport.denominations.val10)}
                 {renderDenominationRow('5 ريال', 5, 'val5', selectedCashReport.denominations.val5)}
                 {renderDenominationRow('2 ريال', 2, 'val2', selectedCashReport.denominations.val2)}
                 {renderDenominationRow('1 ريال', 1, 'val1', selectedCashReport.denominations.val1)}
                 {renderDenominationRow('0.50 هللة', 0.5, 'val0_5', selectedCashReport.denominations.val0_5)}
                 {renderDenominationRow('0.25 هللة', 0.25, 'val0_25', selectedCashReport.denominations.val0_25)}
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl text-center mb-4">
                 <p className="text-xs font-black text-indigo-400 uppercase mb-1">الإجمالي الكلي</p>
                 <p className="text-2xl font-black text-indigo-600">
                   {isEditingCashReport ? (
                      ((Number(editedCashDenominations.val500||0)*500) + (Number(editedCashDenominations.val200||0)*200) + (Number(editedCashDenominations.val100||0)*100) + (Number(editedCashDenominations.val50||0)*50) + (Number(editedCashDenominations.val20||0)*20) + (Number(editedCashDenominations.val10||0)*10) + (Number(editedCashDenominations.val5||0)*5) + (Number(editedCashDenominations.val2||0)*2) + (Number(editedCashDenominations.val1||0)*1) + (Number(editedCashDenominations.val0_5||0)*0.5) + (Number(editedCashDenominations.val0_25||0)*0.25)).toLocaleString()
                   ) : (
                      selectedCashReport.totalAmount.toLocaleString()
                   )}
                 </p>
              </div>
              
              <div className="flex gap-2">
                {!isEditingCashReport ? (
                  <button onClick={() => { setEditedCashDenominations(selectedCashReport.denominations); setIsEditingCashReport(true); }} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:bg-indigo-700 shadow-md transition-all">تعديل البيانات ✏️</button>
                ) : (
                  <>
                    <button onClick={saveEditedCashReport} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-sm hover:bg-green-700 shadow-md transition-all">حفظ التغييرات ✅</button>
                    <button onClick={() => setIsEditingCashReport(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black text-sm hover:bg-gray-200 transition-all">إلغاء ❌</button>
                  </>
                )}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'cash_reports' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-[2rem] border">
              <div className="flex gap-2">
                 <input type="date" className="p-2 bg-gray-50 rounded-xl border text-[10px] font-black" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={ignoreDates} />
                 <input type="date" className="p-2 bg-gray-50 rounded-xl border text-[10px] font-black" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={ignoreDates} />
              </div>
              <div className="flex gap-2 items-center">
                 <select className="p-2 bg-indigo-50 border-indigo-100 text-indigo-600 rounded-xl border text-[10px] font-black outline-none" value={reportsUserFilter} onChange={e => setReportsUserFilter(e.target.value)}><option value="all">كل المحصلين</option>{dynamicUsers.filter(u => u.role === 'user').map(u => <option key={u.username} value={u.username}>{u.username}</option>)}</select>
                 <button onClick={() => setIgnoreDates(!ignoreDates)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${ignoreDates ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>📅</button>
              </div>
           </div>
           <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <table className="w-full text-right table-auto">
              <thead className="bg-gray-50 border-b text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="p-1 md:p-6">المحصل</th><th className="p-1 md:p-6 text-center">التاريخ</th><th className="p-1 md:p-6 text-center">تفاصيل الفئات</th><th className="p-1 md:p-6 text-center text-indigo-600">الإجمالي</th></tr>
              </thead>
              <tbody className="divide-y text-[7px] md:text-xs font-bold">
                 {filteredCashReports.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                       <td className="p-1 md:p-6"><p className="text-gray-900 font-black">{r.username}</p><p className="text-[8px] text-gray-400">{new Date(r.timestamp).toLocaleTimeString('ar-EG')}</p></td>
                       <td className="p-1 md:p-6 text-center">{r.date}</td>
                       <td className="p-1 md:p-6 text-center">
                          <button onClick={() => { setSelectedCashReport(r); setIsEditingCashReport(false); }} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm">عرض التفاصيل 👁️</button>
                       </td>
                       <td className="p-1 md:p-6 text-center font-black text-indigo-600 text-lg">{r.totalAmount.toLocaleString()}</td>
                    </tr>
                 ))}
                 {filteredCashReports.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">لا توجد تقارير عهدة في هذه الفترة</td></tr>
                 )}
              </tbody>
            </table>
           </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
