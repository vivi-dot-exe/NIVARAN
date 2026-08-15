import React from 'react';
import { X, Mail, Users, Phone, ShieldCheck, MapPin, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ContactUsModal: React.FC<ContactUsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode
}) => {
  if (!isOpen) return null;

  const teamMembers = [
    { name: 'Vaibhavi Tiwari', phone: '+91 98765 12345' },
    { name: 'Kishan Jha', phone: '+91 98765 12346' },
    { name: 'Nitin Jha', phone: '+91 98765 12347' },
    { name: 'Rishi Jhunjhunwala', phone: '+91 98765 12348' },
    { name: 'Prachi', phone: '+91 98765 12349' },
    { name: 'Vedant', phone: '+91 98765 12350' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#7A0C38] text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold uppercase tracking-wide font-heading">
                  Contact Us • Team AlphaClan
                </h3>
                <p className="text-xs text-amber-200">
                  DARPG NIVARAN Civic Grievance Triage Platform
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
            
            {/* Team & Email Card */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-[#1E3A8A] text-white">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block uppercase">Development Team</span>
                  <h4 className="text-lg font-black text-[#7A0C38]">Team: AlphaClan</h4>
                  <p className="text-xs text-slate-600 font-medium">Smart India Hackathon Team</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <Mail className="w-5 h-5 text-rose-700 shrink-0" />
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block uppercase">Official Email</span>
                  <a href="mailto:alphaclain6@gmail.com" className="text-xs font-mono font-extrabold text-rose-900 underline">
                    alphaclain6@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Team Members Grid */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-[#7A0C38]" />
                <span>AlphaClan Team Members</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMembers.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {m.name}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-600 flex items-center space-x-1 justify-end">
                        <Phone className="w-3 h-3 text-[#7A0C38]" />
                        <span>{m.phone}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address / Headquarters */}
            <div className={`p-4 rounded-xl border text-xs flex items-center space-x-3 ${
              isDarkMode ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <MapPin className="w-5 h-5 text-[#7A0C38] shrink-0" />
              <div>
                <strong className="block text-slate-900">National Informatics Centre (NIC) • DARPG Nodal Cell</strong>
                <span>Department of Administrative Reforms and Public Grievances, Sardar Patel Bhawan, Sansad Marg, New Delhi 110001</span>
              </div>
            </div>

          </div>

          {/* Footer Close Button */}
          <div className={`p-4 border-t flex justify-end ${
            isDarkMode ? 'border-slate-800 bg-slate-955' : 'border-slate-200 bg-slate-50'
          }`}>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold text-xs transition shadow-md"
            >
              Close Window
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
