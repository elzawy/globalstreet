
export type UserRole = 'admin' | 'user' | 'partner' | 'reviewer' | 'shop_user' | 'haitham_manager' | 'partnership_manager';
export type ReportType = 'spot-check' | 'reconciliation';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  partnerName?: string; 
  shopId?: string; // خاص بحسابات المحلات لربط المستخدم بمحل واحد فقط
  phone?: string; // رقم الواتساب
}

export interface AdminMessage {
  id: string;
  text: string;
  to: 'all' | string; 
  timestamp: number;
  readBy: string[];
}

export interface UserAssignment {
  username: string;
  shopIds: string[];
  partnerNames: string[];
}

export interface GlobalAlert {
  id: string;
  targetRole: 'user' | 'shop_user' | 'partner' | 'haitham_manager';
  targetId: string; // 'all' or username/partnerName
  message: string;
  timestamp: number;
}

export interface SystemStatus {
  reconciliationEnabled: boolean;
  forcedDate?: string; // تاريخ إجباري لجميع المستخدمين
  globalMessage?: string;
  activeSpotRequests?: string[]; // قائمة بمعرفات المحلات المطلوب منها إدخال بيانات حالاً
  globalAlerts?: GlobalAlert[]; // التنبيهات العامة والإنذارات
}

export interface POSMachine {
  id: string;
  tid: string;
  tripleCode?: string; 
  amount: number;
  type: 'standard' | 'hala' | 'manual';
  zReportImage?: string; 
}

export interface ShopMachine {
  tid: string;
  tripleCode?: string; 
}

export interface DailyReport {
  id: string;
  userId: string;
  username: string;
  shopName: string;
  shopId: string;
  location: string;
  category?: string;
  partnerName?: string;
  isHaitham: boolean;
  date: string;
  reportType: ReportType;
  posMachines: POSMachine[];
  cashReceived: number; 
  cashRemaining: number; 
  commission: number; 
  notes?: string;
  notesAttachment?: string; 
  timestamp: number;
  isReview?: boolean;
  isDeleted?: boolean; // تمييز التقرير كمحذوف
}

export interface CashReport {
  id: string;
  userId: string;
  username: string;
  date: string;
  denominations: {
    val500: number;
    val200: number;
    val100: number;
    val50: number;
    val20: number;
    val10: number;
    val5: number;
    val2: number;
    val1: number;
    val0_5: number;
    val0_25: number;
  };
  totalAmount: number;
  timestamp: number;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  category?: string; 
  partnerName?: string;
  isHaitham: boolean;
  standardTids: (string | ShopMachine)[]; 
  halaTids: (string | ShopMachine)[];     
  notes?: string; 
}

export interface MachineRequest {
  id: string;
  shopId: string;
  shopName: string;
  tid: string;
  tripleCode?: string; 
  type: 'standard' | 'hala';
  zReportImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  username: string;
  requestDate: number;
}

export interface ShopRequest {
  id: string;
  userId: string;
  username: string;
  requestedName: string;
  requestedLocation: string;
  requestedCategory?: string;
  partnerName?: string;
  isHaitham: boolean;
  initialTid?: string;
  initialTripleCode?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: number;
}

export interface ShopRenameRequest {
  id: string;
  shopId: string;
  oldName: string;
  newName: string;
  status: 'pending' | 'approved' | 'rejected';
  username: string;
  requestDate: number;
}

export interface AccountRegistrationRequest {
  id: string;
  shopName: string;
  whatsapp: string;
  username: string;
  password: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: number;
}