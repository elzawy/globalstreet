
import { Shop } from './types';

export const ADMIN_CREDENTIALS = {
  username: 'zawy',
  password: 'zawy'
};

export const SECOND_ADMIN_CREDENTIALS = {
  username: 'ismail',
  password: '2026'
};

export const STATIC_USERS = [
  ...Array.from({ length: 15 }, (_, i) => ({
    username: `${i + 1}`,
    password: `${i + 1}`,
    role: 'user'
  }))
];

export const PARTNERS = [
  'إبراهيم محمود حمدان',
  'elvan boz',
  'SAMET DENIZDOLDURAN',
  'راسم تركمان',
  'Ismail Tasci',
  'وسام زيدان',
  'Miss Karnittar Uthaiwan',
  'محمد معتز العسلي',
  'ساجد',
  'سلام حمدان',
  'أحمد مطلق',
  'غيث عبد الرحمن مازي'
];

// قاعدة البيانات المستخرجة من الشيت المرفق
const rawShops = [
  // --- مجموعة هيثم (👑 MR HAITHAM) ---
  { name: 'المطعم الإيراني', cat: 'مطاعم رئيسية', isHaitham: true, tids: [{ tid: '81946778', triple: 'GS-501' }, { tid: '81946798', triple: 'GS-503' }] },
  { name: 'المطعم اليمني', cat: 'مطاعم رئيسية', isHaitham: true, tids: [{ tid: '81440080', triple: 'GS-634' }, { tid: '81440087', triple: 'GS-636' }] },
  { name: 'المطعم الياباني', cat: 'مطاعم رئيسية', isHaitham: true, tids: [{ tid: '81945744', triple: 'GS-563' }, { tid: '81945783', triple: 'GS-565' }] },
  { name: 'مطعم وكافية الشعراوي', cat: 'مطاعم رئيسية', isHaitham: true, tids: [{ tid: '81946844', triple: 'GS-507' }, { tid: '81946845', triple: 'GS-508' }] },
  { name: 'توبروز مساج تايلاندي', cat: 'محلات بوابة', isHaitham: true, tids: [{ tid: '', triple: 'GS-522' }, { tid: '', triple: 'GS-516' }] },
  
  // المراكب (Floating Units)
  { name: 'مركب 1', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81945683', triple: 'GS-558' }] },
  { name: 'مركب 2', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81440075', triple: 'GS-633' }] },
  { name: 'مركب 3', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81945743', triple: 'GS-562' }] },
  { name: 'مركب 4', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81440081', triple: 'GS-635' }] },
  { name: 'مركب 5', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81440071', triple: 'GS-632' }] },
  { name: 'مركب 6', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946842', triple: 'GS-505' }] },
  { name: 'مركب 7', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946843', triple: 'GS-506' }] },
  { name: 'مركب 8', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946796', triple: 'GS-502' }] },
  { name: 'مركب 9', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946862', triple: 'GS-593' }] },
  { name: 'مركب 10', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946846', triple: 'GS-509' }] },

  // تروليات هيثم المحددة بالاسم
  { name: 'ترولي باستا', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81942584', triple: 'GS-513' }] },
  { name: 'ترولي بيتزا', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81944962', triple: 'GS-537' }] },
  { name: 'ترولي نجيتس', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946799', triple: 'GS-504' }] },
  { name: 'ترولي دوناتس', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946878', triple: 'GS-597' }] },
  { name: 'ترولي عصائر', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946864', triple: 'GS-595' }] },
  { name: 'ترولي ايس كريم', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946863', triple: 'GS-594' }] },
  { name: 'ترولي فريز', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81946070', triple: 'GS-626' }] },
  { name: 'ترولي بيرجر', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '81944958', triple: 'GS-536' }] },
  { name: 'TROLLY 9 INDOMIE', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '', triple: 'GS-613' }] },
  { name: 'TROLLY 7 NOODLES', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '', triple: 'GS-616' }] },
  { name: 'TROLLY 3 POP CORN', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '', triple: 'GS-618' }] },
  { name: 'واندرلاند TROLLY 20 WAFFLE', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '', triple: 'GS-519' }] },
  { name: 'واندرلاند TROLLY 21 Strawberry', cat: 'فلوتنج + ترولي', isHaitham: true, tids: [{ tid: '', triple: 'GS-520' }] },

  // أكشاك هيثم (Kiosks)
  { name: 'k6 mango tango', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440062', triple: 'GS-629' }] },
  { name: 'k8 churroz', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440068', triple: 'GS-630' }] },
  { name: 'k10 thai fresh fruits', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440070', triple: 'GS-631' }] },
  { name: 'k12 cozy cup', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440042', triple: 'GS-605' }] },
  { name: 'k15 نكهه الشرق', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440023', triple: 'GS-603' }] },
  { name: 'k18 popcorn', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440015', triple: 'GS-601' }] },
  { name: 'k19 كشك', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942714', triple: 'GS-521' }] },
  { name: 'k21 كشك', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440020', triple: 'GS-602' }] },
  { name: 'k25 كشك', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81945781', triple: 'GS-564' }] },
  { name: 'k26 yooki ya hana', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942577', triple: 'GS-512' }] },
  { name: 'k27 w.matcha', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946040', triple: 'GS-570' }] },
  { name: 'k28 كشك', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81945994', triple: 'GS-532' }] },
  { name: 'k29 فطير مشلتت', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81945979', triple: 'GS-531' }] },
  { name: 'k31 سندوتشات الحرش', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81945970', triple: 'GS-530' }] },
  { name: 'k32 حواوشي', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81944964', triple: 'GS-539' }, { tid: '81945854', triple: 'GS-529' }] },
  { name: 'k35 tai fruits', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '', triple: 'GS-518' }] },
  { name: 'k38 senior fries', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946850', triple: 'GS-510' }] },
  { name: 'k40 mango tango', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946854', triple: 'GS-511' }] },
  { name: 'k41 habube', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946920', triple: 'GS-598' }] },
  { name: 'k42 fresh bites', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946938', triple: 'GS-599' }] },
  { name: 'k43 M. Churros', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81943021', triple: 'GS-614' }] },
  { name: 'k44 كشك', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946940', triple: 'GS-600' }] },
  { name: 'k46 كشك', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946865', triple: 'GS-596' }] },
  { name: 'k49 noodels zone', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81946069', triple: 'GS-625' }] },
  { name: 'k54 oh my fries', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81944963', triple: 'GS-538' }] },
  { name: 'k56 mr h.dog', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942775', triple: 'GS-554' }] },
  { name: 'k57 mango tango', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942772', triple: 'GS-553' }] },
  { name: 'k58 delicious dumplings', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942776', triple: 'GS-555' }] },
  { name: 'k59 the hurros', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942756', triple: 'GS-527' }] },
  { name: 'k60 shrimpy', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81942779', triple: 'GS-556' }] },
  { name: 'k61 strawberry tanghulu', cat: 'اكشاك', isHaitham: true, tids: [{ tid: '81440059', triple: 'GS-628' }] },

  // أجنحة الدول (هيثم)
  { name: 'مصر - كشري رقم 35 و 36', cat: 'جناح مصر', isHaitham: true, tids: [{ tid: '81946036', triple: 'GS-533' }] },
  { name: 'مصر - عصير رقم 2', cat: 'جناح مصر', isHaitham: true, tids: [{ tid: '81942666', triple: 'GS-517' }] },
  { name: 'الكويت - محل رقم 7 و 8', cat: 'جناح الكويت', isHaitham: true, tids: [{ tid: '', triple: 'GS-514' }] },
  { name: 'تايلاند - محل 1 و 2 عصير', cat: 'جناح تايلاند', isHaitham: true, tids: [{ tid: '81942623', triple: 'GS-515' }] },
  { name: 'سوريا - محل رقم 31', cat: 'جناح سوريا', isHaitham: true, tids: [{ tid: '81946037', triple: 'GS-534' }] },
  { name: 'الصين - محل رقم 18', cat: 'جناح الصين', isHaitham: true, tids: [{ tid: '', triple: 'GS-610' }] },
  { name: 'تركيا - محل رقم 13', cat: 'جناح تركيا', isHaitham: true, tids: [] },

  // --- محلات الشركاء (🤝 PARTNERS) ---
  { name: 'مطعم عيون بيروت', cat: 'مطاعم + كافيه', partner: 'إبراهيم محمود حمدان' },
  { name: 'مطعم نرجس الشام', cat: 'مطاعم + كافيه', partner: 'إبراهيم محمود حمدان' },
  { name: 'مطعم تقسيم التركي', cat: 'مطاعم + كافيه', partner: 'elvan boz' },
  { name: 'café shop (امام شيراز)', cat: 'مطاعم + كافيه', partner: 'SAMET DENIZDOLDURAN' },
  { name: 'محل بوابة رقم 1', cat: 'محلات بوابة', partner: 'راسم تركمان' },
  { name: 'محل شاورما DONER ON FIRES رقم 2', cat: 'محلات بوابة', partner: 'Ismail Tasci' },
  { name: 'محل بوابة رقم 3', cat: 'محلات بوابة', partner: 'وسام زيدان' },
  { name: 'محل اعشاب رقم 5 بوابة', cat: 'محلات بوابة', partner: 'Miss Karnittar Uthaiwan' },
  { name: 'محل رقم 6 و 7 بوابة', cat: 'محلات بوابة', partner: 'محمد معتز العسلي' },
  { name: 'محل رقم 8 و 9 بوابة MARHABA', cat: 'محلات بوابة', partner: 'ساجد' },
  { name: 'محل رقم 10 و 11 بوابة', cat: 'محلات بوابة', partner: 'وسام زيدان' },
  { name: 'محل اكسسوار رقم 12 و 13 بوابة', cat: 'محلات بوابة', partner: 'سلام حمدان' },
  { name: 'محل كوفي انتويلا 14 و 15 بوابة', cat: 'محلات بوابة', partner: 'elvan boz' },
  
  // أكشاك الشركاء
  { name: 'K2 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K3 بوظه تركية تركيا', cat: 'اكشاك', partner: 'محمد معتز العسلي' },
  { name: 'K5 شاورما DONER', cat: 'اكشاك', partner: 'Ismail Tasci' },
  { name: 'K7 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K14 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K20 بوظه تركية سوريا', cat: 'اكشاك', partner: 'محمد معتز العسلي' },
  { name: 'K22 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K30 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K34 شاورما DONER', cat: 'اكشاك', partner: 'Ismail Tasci' },
  { name: 'K36 بوظه تركية تايلاند', cat: 'اكشاك', partner: 'محمد معتز العسلي' },
  { name: 'K39 كشك شريك', cat: 'اكشاك', partner: 'وسام زيدان' },
  { name: 'K45 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K47 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K51 شاورما DONER', cat: 'اكشاك', partner: 'Ismail Tasci' },
  { name: 'K52 بوظه تركيه الصين', cat: 'اكشاك', partner: 'محمد معتز العسلي' },
  { name: 'K53 كشك شريك', cat: 'اكشاك', partner: 'وسام زيدان' },
  { name: 'K55 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },
  { name: 'K62 KARAK TEA', cat: 'اكشاك', partner: 'ساجد' },

  // أجنحة الدول (شركاء)
  { name: 'محل 1 و 2 جناح تركيا', cat: 'جناح تركيا', partner: 'SAMET DENIZDOLDURAN' },
  { name: 'محل 9 و 10 جناح تركيا', cat: 'جناح تركيا', partner: 'SAMET DENIZDOLDURAN' },
  { name: 'محل 13 و 14 جناح سوريا', cat: 'جناح سوريا', partner: 'راسم تركمان' },
  { name: 'محل 3 و 4 جناح سوريا', cat: 'جناح سوريا', partner: 'وسام زيدان' },
  { name: 'محل شاورما 19 و 20 سوريا', cat: 'جناح سوريا', partner: 'سلام حمدان' },
  { name: 'محل اكسسوار 21 و 22 سوريا', cat: 'جناح سوريا', partner: 'سلام حمدان' },
  { name: 'محل اكسسوار 11 و 12 و 13 المغرب', cat: 'جناح المغرب', partner: 'سلام حمدان' },
  { name: 'محل رقم 45 جناح المغرب', cat: 'جناح المغرب', partner: 'راسم تركمان' },
  { name: 'محل رقم 28 و 29 المغرب', cat: 'جناح المغرب', partner: 'محمد معتز العسلي' },
  { name: 'محل اكسسوار 17 و 18 اليابان', cat: 'جناح اليابان', partner: 'سلام حمدان' },
  { name: 'محل زيوت 9 و 10 الصين', cat: 'جناح الصين', partner: 'سلام حمدان' },
  { name: 'محل اكسسوار 44 و 45 الصين', cat: 'جناح الصين', partner: 'سلام حمدان' },
  { name: 'محل اكسسوار 12 و 13 الصين', cat: 'جناح الصين', partner: 'سلام حمدان', tids: [{ tid: '81945727', triple: 'GS-260' }] },
  { name: 'محل رقم 4 جناح الصين', cat: 'جناح الصين', partner: 'وسام زيدان' },

  // تروليات الشركاء
  { name: 'ترولي كستنا امام التركي', cat: 'فلوتنج + ترولي', partner: 'محمد معتز العسلي' },
  { name: 'T2 KARAK TEA', cat: 'فلوتنج + ترولي', partner: 'ساجد' },
  { name: 'T5 ترولي الصيني والمجلس', cat: 'فلوتنج + ترولي', partner: 'elvan boz' },
  { name: 'T8 كستنا مقابل الحديقة', cat: 'فلوتنج + ترولي', partner: 'محمد معتز العسلي' },
  { name: 'T11 KARAK TEA', cat: 'فلوتنج + ترولي', partner: 'ساجد' },
  { name: 'T17 ترولي شريك', cat: 'فلوتنج + ترولي', partner: 'وسام زيدان' },
  { name: 'T21 كستنا بوابة الصين', cat: 'فلوتنج + ترولي', partner: 'محمد معتز العسلي' },
  { name: 'ترولي مجلس KARAK TEA', cat: 'فلوتنج + ترولي', partner: 'ساجد' },
  { name: 'ترولي KARAK البوابة الأولى', cat: 'فلوتنج + ترولي', partner: 'ساجد' },
  { name: 'ترولي KARAK البوابة الثانية', cat: 'فلوتنج + ترولي', partner: 'ساجد' },
  { name: 'SAMET TROLLY 1', cat: 'فلوتنج + ترولي', partner: 'SAMET DENIZDOLDURAN', tids: [{ tid: '81945516', triple: '' }] },
  { name: 'SAMET TROLLY 2', cat: 'فلوتنج + ترولي', partner: 'SAMET DENIZDOLDURAN', tids: [{ tid: '81945517', triple: '' }] },

  // بائعين متجولين وألعاب
  ...Array.from({ length: 15 }, (_, i) => ({ name: `BALLON ${i + 1}`, cat: 'بائع متجول', partner: 'سلام حمدان' })),
  ...Array.from({ length: 8 }, (_, i) => ({ name: `SKILLS GAMES ${i + 1}`, cat: 'ألعاب', partner: 'أحمد مطلق' })),
  ...Array.from({ length: 14 }, (_, i) => ({ name: `VIDEOS GAMES ${i + 1}`, cat: 'ألعاب', partner: 'غيث عبد الرحمن مازي' })),
];

export const SHOPS: Shop[] = rawShops.map((s, idx) => ({
  id: s.isHaitham ? `hth-${idx + 1}` : `sh-${idx + 1}`,
  name: s.name,
  location: s.cat,
  category: s.cat,
  isHaitham: s.isHaitham || false,
  partnerName: s.partner || undefined,
  standardTids: (s as any).tids ? (s as any).tids.map((t: any) => ({ tid: t.tid, tripleCode: t.triple })) : [],
  halaTids: []
}));

export const STORAGE_KEY = 'global_street_v19_final';
export const USERS = STATIC_USERS;
