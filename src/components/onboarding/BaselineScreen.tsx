import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ChevronLeft, Bell } from 'lucide-react';

interface BaselineScreenProps {
  onStartNow: () => void;
  onLater: () => void;
  onBack: () => void;
  onRequestNotificationPermission?: () => Promise<void>;
  remindersEnabled?: boolean;
}

export function BaselineScreen({ onStartNow, onLater, onBack, onRequestNotificationPermission, remindersEnabled = false }: BaselineScreenProps) {
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  return (
    <div className="min-h-screen bg-[#ece5de] flex items-center justify-center p-6 relative">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 p-2 bg-white/60 rounded-full text-[#8d654c] hover:bg-white/80 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="max-w-[390px] w-full space-y-8">
        {/* Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#ffb757] to-[#ffb757]/70 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-12 h-12 text-white" strokeWidth={2} />
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-semibold text-[#8d654c]">
            You're all set!
          </h1>
          <p className="text-lg text-[#8d654c]/70 leading-relaxed px-4">
            Would you like to take your first check-in now? It takes about 5 minutes.
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/60 rounded-2xl p-5 space-y-3"
        >
          <h3 className="font-semibold text-[#8d654c] text-center">What to expect:</h3>
          <div className="space-y-2 text-sm text-[#8d654c]/80">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffb757]" />
              <span>A few questions about your recent mood and stress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffb757]" />
              <span>Quick, playful focus activities between sections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffb757]" />
              <span>A gentle summary to help you reflect</span>
            </div>
          </div>
        </motion.div>

        {/* Allow Notifications button — must be a direct button tap so browser grants permission */}
        {remindersEnabled && onRequestNotificationPermission && !permissionRequested && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <button
              onClick={() => {
                // requestPermission() fires synchronously inside this handler — preserves user gesture
                onRequestNotificationPermission().then(() => {
                  setPermissionRequested(true);
                  setPermissionGranted(typeof Notification !== 'undefined' && Notification.permission === 'granted');
                });
              }}
              className="w-full py-4 bg-white/80 border-2 border-[#ffb757] text-[#8d654c] rounded-2xl font-semibold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Bell className="w-5 h-5 text-[#ffb757]" />
              Allow Notifications
            </button>
          </motion.div>
        )}

        {permissionRequested && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center text-sm py-2 rounded-xl ${permissionGranted ? 'text-green-600 bg-green-50' : 'text-[#8d654c]/60 bg-white/40'}`}
          >
            {permissionGranted ? '✅ Notifications enabled' : '🔕 Notifications not enabled — you can change this in Profile later'}
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <button
            onClick={onStartNow}
            className="w-full py-4 bg-[#ffb757] text-white rounded-2xl font-semibold text-lg shadow-lg shadow-[#ffb757]/20 active:scale-[0.98] transition-transform"
          >
            Start Check-in
          </button>
        </motion.div>
      </div>
    </div>
  );
}