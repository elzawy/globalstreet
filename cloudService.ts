
import { STORAGE_KEY } from './constants';

const SUPABASE_URL = 'https://mmbkhcgrmhwxluhifwcj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYmtoY2dybWh3eGx1aGlmd2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY5OTIsImV4cCI6MjA4NTQzMjk5Mn0.dTALyEYUX05TyX9iLlbrwEU4v07BXo2qyMTFcxmgn3M';

interface CacheItem {
  data: any;
  updated_at: string;
}

class CloudService {
  private url = SUPABASE_URL;
  private key = SUPABASE_KEY;
  private isSyncing = false;
  
  // Local Memory Cache of Raw Rows (Key -> {data, updated_at})
  private rawCache: Map<string, CacheItem> = new Map();
  private rawCacheLoaded = false;

  constructor() {
    setInterval(() => this.processPendingSyncs(), 20000);
  }

  private getHeaders(isUpsert = false) {
    const headers: any = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    if (isUpsert) {
      headers['Prefer'] = 'resolution=merge-duplicates';
    }
    return headers;
  }

  // Load raw cache from localStorage to memory
  private loadRawCache() {
    if (this.rawCacheLoaded) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY + '_raw_db_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.rawCache = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error("Failed to load raw cache", e);
    }
    this.rawCacheLoaded = true;
  }

  // Save memory cache to localStorage
  private persistRawCache() {
    try {
      const obj = Object.fromEntries(this.rawCache);
      localStorage.setItem(STORAGE_KEY + '_raw_db_v2', JSON.stringify(obj));
    } catch (e) {
      console.error("Failed to persist raw cache", e);
    }
  }

  // Get the latest updated_at timestamp from the cache
  private getLastTimestamp(): string | null {
    let maxTime = 0;
    for (const item of this.rawCache.values()) {
      const ts = new Date(item.updated_at).getTime();
      if (ts > maxTime) maxTime = ts;
    }
    return maxTime > 0 ? new Date(maxTime).toISOString() : null;
  }

  // Transform raw rows into the application state object
  private buildAppState(): any {
    const result: any = { 
      reports: [], machine_requests: [], shop_requests: [], rename_requests: [], account_registrations: [], cash_reports: [],
      shops: [], assignments: [], users: [], partners: [], categories: [], locations: [],
      system_status: { reconciliationEnabled: true },
      _rowCount: this.rawCache.size
    };

    this.rawCache.forEach((value, key) => {
      const data = value.data;
      if (key.startsWith('rep_')) result.reports.push(data);
      else if (key.startsWith('mreq_')) result.machine_requests.push(data);
      else if (key.startsWith('sreq_')) result.shop_requests.push(data);
      else if (key.startsWith('rnreq_')) result.rename_requests.push(data);
      else if (key.startsWith('accreg_')) result.account_registrations.push(data);
      else if (key.startsWith('cashrep_')) result.cash_reports.push(data);
      else result[key] = data;
    });

    // Sort reports by timestamp descending
    result.reports.sort((a: any, b: any) => b.timestamp - a.timestamp);
    result.cash_reports.sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    return result;
  }

  async saveData(key: string, data: any): Promise<boolean> {
    this.loadRawCache();
    
    // Optimistic Update
    const now = new Date().toISOString();
    this.rawCache.set(key, { data, updated_at: now });
    this.persistRawCache();

    try {
      const response = await fetch(`${this.url}/rest/v1/globalstreet?on_conflict=key`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          key: key,
          data: data,
          updated_at: now
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        this.addToPendingQueue(key, data);
        return false;
      }

      return true;
    } catch (e) {
      console.error("Network Exception during Cloud Save:", e);
      this.addToPendingQueue(key, data);
      return false;
    }
  }

  private addToPendingQueue(key: string, data: any) {
    const pending = JSON.parse(localStorage.getItem(STORAGE_KEY + '_pending') || '[]');
    const filtered = pending.filter((item: any) => item.key !== key);
    filtered.push({ key, data, ts: Date.now() });
    localStorage.setItem(STORAGE_KEY + '_pending', JSON.stringify(filtered));
  }

  private async processPendingSyncs() {
    if (this.isSyncing) return;
    const pending = JSON.parse(localStorage.getItem(STORAGE_KEY + '_pending') || '[]');
    if (pending.length === 0) return;

    this.isSyncing = true;
    const remaining = [];

    for (const item of pending) {
      try {
        const res = await fetch(`${this.url}/rest/v1/globalstreet?on_conflict=key`, {
          method: 'POST',
          headers: this.getHeaders(true),
          body: JSON.stringify({ key: item.key, data: item.data, updated_at: new Date(item.ts).toISOString() }),
          cache: 'no-store'
        });
        if (!res.ok) remaining.push(item);
      } catch (e) {
        remaining.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEY + '_pending', JSON.stringify(remaining));
    this.isSyncing = false;
  }

  // Updated: Accepts forceFull parameter to bypass delta sync
  async fetchAllData(forceFull = false): Promise<any> {
    this.loadRawCache();

    try {
      const lastTs = this.getLastTimestamp();
      let query = `select=key,data,updated_at&order=updated_at.asc`;
      
      // DELTA SYNC: Only fetch rows updated since the last known timestamp
      // BUT: If forceFull is true, we ignore the timestamp and fetch everything
      if (lastTs && !forceFull) {
        query += `&updated_at=gt.${lastTs}`;
      }

      const response = await fetch(`${this.url}/rest/v1/globalstreet?${query}`, {
        method: 'GET',
        headers: this.getHeaders(),
        cache: 'no-store'
      });

      if (response.ok) {
        const newRows = await response.json();
        
        if (newRows.length > 0) {
          // Merge new rows into cache
          newRows.forEach((row: any) => {
            this.rawCache.set(row.key, { data: row.data, updated_at: row.updated_at });
          });
          this.persistRawCache();
        }

        // Always return full state constructed from local cache
        return this.buildAppState();
      }
      throw new Error("Cloud fetch failed");
    } catch (e) {
      console.warn("Offline or sync error, returning local cache:", e);
      // Return local cache if offline
      return this.buildAppState();
    }
  }
}

export const cloudService = new CloudService();