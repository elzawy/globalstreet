
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (u: string, p: string) => boolean;
  onRegisterAccount: (shopName: string, whatsapp: string, username: string, password: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegisterAccount }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showRegister, setShowRegister] = useState(false);
  const [regShopName, setRegShopName] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMessage, setRegMessage] = useState({ text: '', isError: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = onLogin(username, password);
    if (!success) {
      setError('خطأ في اسم المستخدم أو كلمة المرور');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage({ text: '', isError: false });
    
    if (!regShopName || !regWhatsapp || !regUsername || !regPassword) {
      setRegMessage({ text: 'Please fill all fields', isError: true });
      return;
    }

    setIsSubmitting(true);
    const success = await onRegisterAccount(regShopName, regWhatsapp, regUsername, regPassword);
    setIsSubmitting(false);
    
    if (success) {
      setRegMessage({ text: 'Success! Your request has been sent for admin approval.', isError: false });
      setRegShopName('');
      setRegWhatsapp('');
      setRegUsername('');
      setRegPassword('');
      setTimeout(() => setShowRegister(false), 3000);
    } else {
      setRegMessage({ text: 'Failed to send request. Try again.', isError: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-indigo-100 mb-6">G</div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">GLOBAL STREET</h2>
            <p className="text-indigo-600 font-bold text-sm tracking-widest uppercase">JEDDAH - نظام تحصيل المبيعات</p>
          </div>

          {!showRegister ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-right">
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right font-bold"
                  placeholder="ادخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="text-right">
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">كلمة المرور</label>
                <input
                  type="password"
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right font-bold"
                  placeholder="ادخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-xs font-black rounded-2xl text-center border border-red-100 animate-bounce">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all transform active:scale-[0.97] shadow-xl shadow-indigo-100"
              >
                تسجيل الدخول للنظام
              </button>
              
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-sm hover:bg-indigo-50 border border-indigo-100 transition-all uppercase tracking-widest"
              >
                Register New Shop Account
              </button>
            </form>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-black text-gray-800 text-center mb-6 uppercase tracking-tight">New Shop Registration</h3>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="text-left">
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Shop Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Enter your shop name"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                  />
                </div>

                <div className="text-left">
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">WhatsApp Number</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="e.g. 05xxxxxxxx"
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                  />
                </div>

                <div className="text-left border-t pt-4">
                  <label className="block text-[9px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Requested Username</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-indigo-50 bg-indigo-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Set your username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                  />
                </div>

                <div className="text-left">
                  <label className="block text-[9px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Requested Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-indigo-50 bg-indigo-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Set your password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>

                {regMessage.text && (
                  <div className={`p-4 text-[10px] font-black rounded-2xl text-center border ${regMessage.isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {regMessage.text}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100"
                  >
                    {isSubmitting ? 'Sending...' : 'Register'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRegister(false); setRegMessage({ text: '', isError: false }); }}
                    className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm hover:bg-gray-200"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-gray-50 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} GLOBAL STREET - JEDDAH
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
