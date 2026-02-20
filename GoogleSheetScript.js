/**
 * GLOBAL STREET - JEDDAH
 * Final Robust Webhook v2.0
 * 
 * طريقة التركيب:
 * 1. Extensions > Apps Script
 * 2. استبدل الكود بالكامل بهذا الكود.
 * 3. Deploy > New Deployment > Web App.
 * 4. Execute as: Me | Who has access: Anyone.
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = getOrCreateSheet(ss, "Log_All_Sync");
  
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var record = payload.record;
    
    // تسجيل الحركة في اللوج العام
    logSheet.appendRow([new Date(), action, JSON.stringify(record).substring(0, 5000)]);

    // توجيه البيانات حسب نوع الأكشن
    if (action === "Final_Reports" || action === "Spot_Check_Reports" || action === "Instant_Logs") {
      processReports(ss, record, action);
    } 
    else if (action === "Shops_Database") {
      processShops(ss, record);
    } 
    else if (action === "Requests_Log" || action === "Instant_Machine_Req" || action === "Instant_Shop_Req" || action === "Instant_Rename_Req") {
      processRequests(ss, record, action);
    } 
    else if (action === "Partners_List") {
      processPartners(ss, record);
    }
    else if (action === "System_Config") {
      processConfig(ss, record);
    }

    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "action": action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logSheet.appendRow([new Date(), "ERROR", err.toString()]);
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) { 
    sheet = ss.insertSheet(name);
    // تنسيق الهيدر لو الشيت جديد
    if (name === "Log_All_Sync") sheet.appendRow(["Timestamp", "Action", "Raw Data"]);
  }
  return sheet;
}

function processReports(ss, data, action) {
  var sheet = getOrCreateSheet(ss, "Reports_Archive");
  if (sheet.getLastRow() === 0) {
    var headers = ["ID", "التاريخ", "المحل", "الموظف", "النوع", "كاش مستلم", "كاش متبقي", "عمولة", "صافي الكاش", "إجمالي الماكينات", "الإجمالي الكلي", "ملاحظات", "وقت المزامنة"];
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#cfe2f3");
  }
  
  var reports = Array.isArray(data) ? data : [data];
  reports.forEach(function(r) {
    if (!r) return;
    var mSum = (r.posMachines || []).reduce(function(acc, m) { return acc + (Number(m.amount) || 0); }, 0);
    var netC = (Number(r.cashReceived) || 0) + (Number(r.cashRemaining) || 0) - (Number(r.commission) || 0);
    
    sheet.appendRow([
      r.id,
      r.date,
      r.shopName,
      r.username,
      r.reportType === "reconciliation" ? "تقفيل" : "متابعة",
      r.cashReceived,
      r.cashRemaining,
      r.commission,
      netC,
      mSum,
      (netC + mSum),
      r.notes || "",
      new Date()
    ]);
  });
}

function processShops(ss, data) {
  var sheet = getOrCreateSheet(ss, "Shops_Database");
  sheet.clear();
  var headers = ["Shop ID", "الاسم", "الموقع/الزون", "التصنيف", "المالك", "الشريك", "ملاحظات"];
  sheet.appendRow(headers);
  sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#d9ead3");
  
  if (Array.isArray(data)) {
    data.forEach(function(s) {
      sheet.appendRow([s.id, s.name, s.location, s.category, s.isHaitham ? "هيثم" : "شريك", s.partnerName || "N/A", s.notes || ""]);
    });
  }
}

function processRequests(ss, data, action) {
  var sheet = getOrCreateSheet(ss, "Requests_Log");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["وقت الطلب", "النوع", "التفاصيل", "بواسطة", "الحالة"]);
  }

  if (action === "Instant_Machine_Req") {
    sheet.appendRow([new Date(), "إضافة ماكينة", "محل: " + data.shopName + " | TID: " + data.tid, data.username, data.status]);
  } else if (action === "Instant_Shop_Req") {
    sheet.appendRow([new Date(), "إضافة محل", "الاسم: " + data.requestedName + " | زون: " + data.requestedLocation, data.username, data.status]);
  } else if (action === "Instant_Rename_Req") {
    sheet.appendRow([new Date(), "تعديل اسم", "من: " + data.oldName + " | إلى: " + data.newName, data.username, data.status]);
  } else if (action === "Requests_Log") {
     // معالجة المصفوفات الكاملة عند المزامنة اليدوية
     if (data.machines) data.machines.forEach(function(m){ sheet.appendRow([new Date(m.requestDate), "ماكينة", m.tid, m.username, m.status]); });
     if (data.shops) data.shops.forEach(function(s){ sheet.appendRow([new Date(s.requestDate), "محل", s.requestedName, s.username, s.status]); });
  }
}

function processPartners(ss, data) {
  var sheet = getOrCreateSheet(ss, "Partners_List");
  sheet.clear();
  sheet.appendRow(["اسم الشريك", "تاريخ التحديث"]);
  if (Array.isArray(data)) {
    data.forEach(function(p) { sheet.appendRow([p, new Date()]); });
  }
}

function processConfig(ss, data) {
  var sheet = getOrCreateSheet(ss, "System_Config");
  sheet.clear();
  sheet.appendRow(["الإعداد", "القيمة"]);
  sheet.appendRow(["بوابة التقفيل", data.status.reconciliationEnabled ? "مفتوحة" : "مغلقة"]);
  sheet.appendRow(["عدد الموظفين", (data.users || []).length]);
  sheet.appendRow(["آخر تحديث شامل", new Date()]);
}