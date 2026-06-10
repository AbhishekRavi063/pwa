import { motion } from 'motion/react';
import { ArrowLeft, Brain, Gamepad2, Activity, PenLine, Clock, Clipboard, TrendingUp, BarChart3, Phone, Heart, MessageCircle, ExternalLink, X, BookOpen, Sparkles, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import mindHeartLogo from 'figma:asset/7b50bc9b5a475ae25095d66d462c3b7a4e725dc6.png';
import { CrisisResourcesModal } from './modals/CrisisResourcesModal';
import { getSensitiveValueSync, subscribeToSecureVault } from '../utils/secureVault';
import { loadNotificationPrefs, requestPermission, computeNextNotificationAt, registerFCMToken, saveNotificationPrefs } from '../utils/notificationManager';
import { getUserId } from '../utils/dataSync';

interface CheckInHubProps {
  isDarkMode?: boolean;
  onBack?: () => void;
  onStartCheckIn: () => void;
  onNavigateToGames?: () => void;
  onOpenDailyCheckIn?: () => void;
  onOpenJournal?: () => void;
  onNavigateToTrends?: () => void;
  onOpenJournalEntries?: () => void;
}

export function CheckInHub({ 
  isDarkMode = false, 
  onBack, 
  onStartCheckIn,
  onNavigateToGames,
  onOpenDailyCheckIn,
  onOpenJournal,
  onNavigateToTrends,
  onOpenJournalEntries
}: CheckInHubProps) {
  const [currentDate, setCurrentDate] = useState('');
  const [greeting, setGreeting] = useState('');
  const [dailyQuote, setDailyQuote] = useState({ text: '', author: '' });
  const [rotatingCTA, setRotatingCTA] = useState<{ text: string; action: () => void; icon: string }>({ text: '', action: () => {}, icon: '' });
  const [weekDays, setWeekDays] = useState<Array<{ date: number; day: string; fullDate: string; activities: string[] }>>([]);
  const [lastQuestionnaireDate, setLastQuestionnaireDate] = useState<string | null>(null);
  const [lastDayLogDate, setLastDayLogDate] = useState<string | null>(null);
  const [lastJournalDate, setLastJournalDate] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  // Show banner to existing users who enabled reminders but have no FCM token
  useEffect(() => {
    // Guard for iOS Safari (non-PWA) where Notification API doesn't exist
    if (typeof Notification === 'undefined') return;
    const prefs = loadNotificationPrefs();
    const alreadyDismissed = localStorage.getItem('mindcheck_notif_banner_dismissed');
    if (
      prefs.reminders &&
      Notification.permission !== 'granted' &&
      !alreadyDismissed
    ) {
      setShowNotifBanner(true);
    }
  }, []);

  // Wisdom quotes from Zen, Taoism, and Stoicism
  const wisdomQuotes = [
    // Zen
    { text: "The obstacle is the path.", author: "Shunryu Suzuki" },
    { text: "Let go or be dragged.", author: "D.T. Suzuki" },
    { text: "When walking, walk. When eating, eat.", author: "Thích Nhất Hạnh" },
    { text: "The present moment is the only moment available to us.", author: "Thích Nhất Hạnh" },
    { text: "Be master of mind rather than mastered by mind.", author: "Shunryu Suzuki" },
    { text: "Sitting quietly, doing nothing, spring comes, and the grass grows by itself.", author: "Matsuo Bashō" },
    { text: "Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.", author: "Wu Li" },
    
    // Taoism
    { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
    { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
    { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu" },
    { text: "Do you have the patience to wait till your mud settles and the water is clear?", author: "Lao Tzu" },
    { text: "The wise man is one who knows what he does not know.", author: "Lao Tzu" },
    { text: "Care about what other people think and you will always be their prisoner.", author: "Lao Tzu" },
    { text: "To the mind that is still, the whole universe surrenders.", author: "Lao Tzu" },
    
    // Stoicism
    { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
    { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
    { text: "Very little is needed to make a happy life.", author: "Marcus Aurelius" },
    { text: "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it.", author: "Marcus Aurelius" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "He who fears death will never do anything worth of a living man.", author: "Seneca" },
    { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
    { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
    { text: "Don't explain your philosophy. Embody it.", author: "Epictetus" },
    { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" }
  ];

  useEffect(() => {
    const refreshActivity = () => {
    // Set current date
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-US', options));

    // Select daily quote based on day of year (so it changes daily but is consistent throughout the day)
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const quoteIndex = dayOfYear % wisdomQuotes.length;
    setDailyQuote(wisdomQuotes[quoteIndex]);

    // Generate week days for calendar
    const week = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check activities for this date
      const activities = [];
      
      // Check questionnaires
      const phq9Last = getSensitiveValueSync<string | null>('mindcheck_last_phq9', null);
      const pssLast = getSensitiveValueSync<string | null>('mindcheck_last_pss', null);
      const rsesLast = getSensitiveValueSync<string | null>('mindcheck_last_rses', null);
      const gad7Last = getSensitiveValueSync<string | null>('mindcheck_last_gad7', null);
      
      if ([phq9Last, pssLast, rsesLast, gad7Last].some(d => d && d.split('T')[0] === dateStr)) {
        activities.push('questionnaire');
      }
      
      // Check day logs
      const emaData = getSensitiveValueSync<Record<string, any[]>>('mindcheck_ema_data', {});
      if (emaData[dateStr]) {
        activities.push('daylog');
      }
      
      // Check journal
      const journalEntries = getSensitiveValueSync<any[]>('mindcheck_journal_entries_all', []);
      if (journalEntries.some((e: any) => {
        if (!e.timestamp) return false;
        const ts = typeof e.timestamp === 'number' ? new Date(e.timestamp).toISOString() : String(e.timestamp);
        return ts.split('T')[0] === dateStr;
      })) {
        activities.push('journal');
      }
      
      // Check games (if you have storage for this)
      const gamesData = localStorage.getItem(`mindcheck_games_${dateStr}`);
      if (gamesData) {
        activities.push('game');
      }
      
      week.push({
        date: date.getDate(),
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        activities
      });
    }
    
    setWeekDays(week);

    // Set rotating CTA
    const ctas = [
      { text: 'Start journaling today', action: onOpenJournal!, icon: '✍️' },
      { text: 'Begin a check-in', action: onStartCheckIn, icon: '📋' },
      { text: 'Play a cognitive game', action: onNavigateToGames!, icon: '🎮' }
    ];
    const ctaIndex = dayOfYear % ctas.length;
    setRotatingCTA(ctas[ctaIndex]);

    // Generate dynamic greeting
    const hour = today.getHours();
    const dayOfWeek = today.getDay();
    const greetings = [];

    // Time-based greetings
    if (hour >= 5 && hour < 12) {
      greetings.push('Good morning 🌅', 'Rise & shine ☀️', 'Hello sunshine ☀️');
    } else if (hour >= 12 && hour < 17) {
      greetings.push('Good afternoon 👋', 'Hello there 🌤️', 'Hey there 👋');
    } else if (hour >= 17 && hour < 21) {
      greetings.push('Good evening 🌆', 'Evening! 🌇', 'Hello there 👋');
    } else {
      greetings.push('Good evening 🌙', 'Hello there 🌙', 'Welcome back 👋');
    }

    // Day-specific greetings
    if (dayOfWeek === 1) { // Monday
      greetings.push('Happy Monday 💪', 'Fresh start 🌱');
    } else if (dayOfWeek === 5) { // Friday
      greetings.push('Happy Friday 🎉', 'Almost weekend! 🎊');
    } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      greetings.push('Happy weekend 🌸', 'Enjoy today ☀️');
    }

    // General personalized greetings
    greetings.push(
      'Welcome back 👋',
      'Nice to see you 😊',
      'Great to be here 💛',
      'You\'re doing great 🌟',
      'Time for yourself 🌿'
    );

    // Select random greeting
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setGreeting(randomGreeting);

    // Check last questionnaire completion
    const phq9Last = getSensitiveValueSync<string | null>('mindcheck_last_phq9', null);
    const pssLast = getSensitiveValueSync<string | null>('mindcheck_last_pss', null);
    const rsesLast = getSensitiveValueSync<string | null>('mindcheck_last_rses', null);
    const gad7Last = getSensitiveValueSync<string | null>('mindcheck_last_gad7', null);
    
    const dates = [phq9Last, pssLast, rsesLast, gad7Last].filter(Boolean).map(d => new Date(d!));
    if (dates.length > 0) {
      const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
      setLastQuestionnaireDate(getRelativeTime(mostRecent));
    }

    // Check last day log
    const emaData = getSensitiveValueSync<Record<string, any[]>>('mindcheck_ema_data', {});
    const allDates = Object.keys(emaData);
    if (allDates.length > 0) {
      const mostRecentDate = allDates.sort().reverse()[0];
      setLastDayLogDate(getRelativeTime(new Date(mostRecentDate)));
    }

    // Check last journal entry
    const journalEntries = getSensitiveValueSync<any[]>('mindcheck_journal_entries_all', []);
    if (journalEntries.length > 0) {
      const mostRecent = new Date(journalEntries[0].timestamp);
      setLastJournalDate(getRelativeTime(mostRecent));
    }

    };

    refreshActivity();
    return subscribeToSecureVault(refreshActivity);
  }, []);

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const checkInOptions = [
    {
      id: 'guided',
      title: 'Guided Check-in',
      subtitle: 'Questionnaires',
      description: 'Answer a few questions to track mood, stress, and wellbeing over time.',
      icon: Clipboard,
      iconBg: isDarkMode ? 'bg-[#ffb757]/20' : 'bg-[#ffb757]/15',
      iconColor: 'text-[#ffb757]',
      lastCompleted: lastQuestionnaireDate,
      onClick: onStartCheckIn
    },
    {
      id: 'daylog',
      title: 'Day Logs',
      subtitle: 'Quick daily check-ins',
      description: 'Log sleep, water intake, food, energy, or habits as your day goes on.',
      icon: Activity,
      iconBg: isDarkMode ? 'bg-[#9dc4e8]/20' : 'bg-[#9dc4e8]/15',
      iconColor: 'text-[#5b8db8]',
      tag: 'Quick • Ongoing',
      lastCompleted: lastDayLogDate,
      onClick: onOpenDailyCheckIn
    },
    {
      id: 'journal',
      title: 'Journal',
      subtitle: 'Open reflection',
      description: 'Write freely using prompts or your own words. No structure, just your thoughts.',
      icon: PenLine,
      iconBg: isDarkMode ? 'bg-[#ddc4af]/20' : 'bg-[#ddc4af]/25',
      iconColor: 'text-[#8d654c]',
      lastCompleted: lastJournalDate,
      onClick: onOpenJournalEntries // Changed from onOpenJournal to go directly to entries
    },
    {
      id: 'games',
      title: 'Cognitive Games',
      subtitle: 'Focus & memory',
      description: 'Short interactive games to support attention, memory, and mental flexibility.',
      icon: Gamepad2,
      iconBg: isDarkMode ? 'bg-[#c9ad96]/20' : 'bg-[#c9ad96]/25',
      iconColor: 'text-[#8d654c]',
      tag: 'Interactive',
      onClick: onNavigateToGames
    }
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#1a1410]' : 'bg-[#ece5de]'} overflow-y-auto`}>
      <div className="max-w-[390px] mx-auto pt-6 pb-24 px-5 space-y-5">
        {/* Notification permission banner — for existing users with reminders ON but no FCM token */}
        {showNotifBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isDarkMode ? 'bg-[#ffb757]/20 border-[#ffb757]/40' : 'bg-[#ffb757]/15 border-[#ffb757]/40'} border rounded-2xl p-4 flex items-center gap-3`}
          >
            <Bell className="w-5 h-5 text-[#ffb757] flex-shrink-0" />
            <p className={`text-sm flex-1 ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'}`}>
              Enable notifications to get your reminders
            </p>
            <button
              onClick={() => {
                // requestPermission() must be first — preserves user gesture on mobile
                requestPermission().then(async (permission) => {
                  if (permission === 'granted') {
                    const prefs = loadNotificationPrefs();
                    const withSchedule = { ...prefs, reminders: true, nextNotificationAt: computeNextNotificationAt(prefs) };
                    saveNotificationPrefs(withSchedule);
                    const uid = await getUserId();
                    if (uid) registerFCMToken(uid, withSchedule);
                  }
                  setShowNotifBanner(false);
                  localStorage.setItem('mindcheck_notif_banner_dismissed', 'true');
                });
              }}
              className="text-xs font-semibold text-[#ffb757] bg-[#ffb757]/20 px-3 py-1.5 rounded-xl flex-shrink-0 active:scale-95"
            >
              Enable
            </button>
            <button
              onClick={() => {
                setShowNotifBanner(false);
                localStorage.setItem('mindcheck_notif_banner_dismissed', 'true');
              }}
              className={`${isDarkMode ? 'text-[#ece5de]/40' : 'text-[#8d654c]/40'} flex-shrink-0`}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Back button (if needed) */}
        {onBack && (
          <button
            onClick={onBack}
            className={`w-10 h-10 ${isDarkMode ? 'bg-[#2a2218]' : 'bg-white/60'} rounded-full flex items-center justify-center active:scale-95 transition-transform`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'}`} />
          </button>
        )}

        {/* Header Card - Soft Orange */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${
            isDarkMode ? 'bg-gradient-to-br from-[#ffb757]/20 to-[#ffb757]/10' : 'bg-gradient-to-br from-[#ffb757]/25 to-[#ffb757]/15'
          } rounded-3xl p-5 shadow-sm`}
        >
          {/* Flex container for logo and text */}
          <div className="flex items-center gap-4 mb-4">
            {/* Mind-Heart Logo - Animated like onboarding */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex-shrink-0 relative w-14 h-14"
            >
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <Heart className="w-8 h-8 text-[#ffb757]" fill="#ffb757" strokeWidth={1.5} />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [0, 10, 0],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute left-0 top-0"
              >
                <Brain className="w-5 h-5 text-[#8d654c]/60" strokeWidth={1.5} />
              </motion.div>
              
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute right-0 bottom-0"
              >
                <Sparkles className="w-4 h-4 text-[#ffb757]/70" strokeWidth={1.5} />
              </motion.div>
            </motion.div>

            {/* Greeting and Date */}
            <div className="flex-1 min-w-0">
              {/* Greeting - Larger, on top */}
              <h1 className={`text-xl font-semibold leading-tight mb-1 ${isDarkMode ? 'text-[#8d654c]' : 'text-[#8d654c]'}`}>
                {greeting}
              </h1>
              {/* Date - Smaller, below */}
              <p className={`text-sm font-medium ${isDarkMode ? 'text-[#8d654c]/70' : 'text-[#8d654c]/75'}`}>
                {currentDate}
              </p>
            </div>
          </div>

          {/* This Week Calendar */}
          <div>
            <h3 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-[#8d654c]/80' : 'text-[#8d654c]/80'}`}>
              This Week
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => {
                const isToday = day.fullDate === new Date().toISOString().split('T')[0];
                return (
                  <div key={index} className="flex flex-col items-center">
                    <span className={`text-[9px] font-medium mb-1 ${isDarkMode ? 'text-[#8d654c]/60' : 'text-[#8d654c]/60'}`}>
                      {day.day.charAt(0)}
                    </span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold relative ${
                      isToday 
                        ? 'bg-[#ffb757] text-white' 
                        : isDarkMode 
                          ? 'bg-[#8d654c]/10 text-[#ece5de]/80' 
                          : 'bg-white/50 text-[#8d654c]'
                    }`}>
                      {day.date}
                      {/* Activity indicators */}
                      {day.activities.length > 0 && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {day.activities.slice(0, 3).map((activity, actIdx) => (
                            <div 
                              key={actIdx}
                              className={`w-1 h-1 rounded-full ${
                                activity === 'questionnaire' ? 'bg-[#ffb757]' :
                                activity === 'daylog' ? 'bg-[#9dc4e8]' :
                                activity === 'journal' ? 'bg-[#ddc4af]' :
                                'bg-[#c9ad96]'
                              }`}
                              title={activity}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Your Progress Section */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'}`}>
            Your Progress
          </h2>
          
          {/* Progress Card */}
          <div className={`${
            isDarkMode ? 'bg-[#2a2218]' : 'bg-white/50'
          } rounded-3xl p-5 shadow-sm`}>
            <div className="flex items-start justify-between gap-4">
              {/* Left Side - Progress Info */}
              <div className="flex-1">
                <button
                  onClick={onNavigateToTrends}
                  className="text-left w-full group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-base font-semibold ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'}`}>
                      View Trends
                    </h3>
                    <TrendingUp className="w-4 h-4 text-[#ffb757] group-active:scale-110 transition-transform" strokeWidth={2} />
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-[#ece5de]/60' : 'text-[#8d654c]/60'} mb-3`}>
                    See patterns in your wellbeing
                  </p>
                </button>
                
                {/* Gentle Reminder */}
                <div className={`${
                  isDarkMode ? 'bg-[#ffb757]/8' : 'bg-[#ffb757]/8'
                } rounded-xl px-3 py-2`}>
                  <p className={`text-[10px] ${isDarkMode ? 'text-[#ece5de]/70' : 'text-[#8d654c]/70'} leading-relaxed`}>
                    The more you log, the better you can notice patterns in self
                  </p>
                </div>
              </div>

              {/* Right Side - Streak */}
              <div className="flex flex-col items-center">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${isDarkMode ? 'text-[#ffb757]' : 'text-[#ffb757]'}`}>
                    {weekDays.filter(d => d.activities.length > 0).length}
                  </div>
                  <p className={`text-[10px] ${isDarkMode ? 'text-[#ece5de]/50' : 'text-[#8d654c]/50'} uppercase tracking-wide`}>
                    days
                  </p>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-[#ece5de]/70' : 'text-[#8d654c]/70'} mt-0.5`}>
                    Streak 🔥
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className={`text-base font-semibold mb-0.5 ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'}`}>
            Your Check-ins
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-[#ece5de]/60' : 'text-[#8d654c]/60'}`}>
            Choose how you'd like to check in with yourself today.
          </p>
        </motion.div>

        {/* Check-in Cards - Smaller */}
        <div className="grid grid-cols-2 gap-3">
          {checkInOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 + index * 0.08 }}
              onClick={option.onClick}
              className={`w-full ${
                isDarkMode ? 'bg-[#2a2218]' : 'bg-white/70'
              } rounded-2xl p-3 text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all relative overflow-hidden`}
            >
              {/* Last completed badge */}
              {option.lastCompleted && (
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 ${
                  isDarkMode ? 'bg-[#ece5de]/10' : 'bg-[#8d654c]/10'
                } rounded-full flex items-center gap-0.5`}>
                  <Clock className={`w-2.5 h-2.5 ${isDarkMode ? 'text-[#ece5de]/50' : 'text-[#8d654c]/50'}`} />
                  <span className={`text-[9px] ${isDarkMode ? 'text-[#ece5de]/50' : 'text-[#8d654c]/50'} font-medium`}>
                    {option.lastCompleted}
                  </span>
                </div>
              )}

              {/* Tag (if exists) */}
              {option.tag && !option.lastCompleted && (
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 ${
                  isDarkMode ? 'bg-[#ffb757]/15' : 'bg-[#ffb757]/10'
                } rounded-full`}>
                  <span className={`text-[9px] text-[#ffb757] font-medium`}>
                    {option.tag}
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-8 h-8 ${option.iconBg} rounded-xl flex items-center justify-center mb-2`}>
                <option.icon className={`w-4 h-4 ${option.iconColor}`} strokeWidth={2} />
              </div>

              {/* Title only - no description */}
              <h3 className={`text-sm font-semibold leading-tight ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'}`}>
                {option.title}
              </h3>
              <p className={`text-[10px] ${isDarkMode ? 'text-[#ece5de]/50' : 'text-[#8d654c]/50'} mt-0.5`}>
                {option.subtitle}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Helpful Tip */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className={`text-center ${isDarkMode ? 'text-[#ece5de]/60' : 'text-[#8d654c]/60'} text-xs`}
        >
          💡 Confused? Start with a <span className="font-semibold text-[#ffb757]">Guided Check-in</span>
        </motion.div>

        {/* Need Support Button - Enhanced Design */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setShowSupportModal(true)}
          className={`w-full ${
            isDarkMode ? 'bg-gradient-to-br from-[#8d654c]/30 to-[#8d654c]/15' : 'bg-gradient-to-br from-[#ddc4af]/50 to-[#ddc4af]/30'
          } rounded-3xl p-5 text-left shadow-sm active:scale-[0.98] transition-all border ${
            isDarkMode ? 'border-[#8d654c]/20' : 'border-[#ddc4af]/30'
          } relative overflow-hidden`}
        >
          {/* Decorative background circle */}
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#ffb757]/5" />
          
          <div className="relative flex items-center gap-4">
            <div className={`w-12 h-12 ${
              isDarkMode ? 'bg-[#ffb757]/20' : 'bg-[#ffb757]/20'
            } rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <Heart className="w-6 h-6 text-[#ffb757]" strokeWidth={2} fill="currentColor" fillOpacity={0.2} />
            </div>
            <div className="flex-1">
              <h3 className={`text-base font-bold ${isDarkMode ? 'text-[#ece5de]' : 'text-[#8d654c]'} mb-1`}>
                Need Support?
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-[#ece5de]/70' : 'text-[#8d654c]/70'} leading-relaxed`}>
                Access counseling & crisis resources
              </p>
            </div>
            <div className={`w-8 h-8 ${
              isDarkMode ? 'bg-[#8d654c]/10' : 'bg-[#8d654c]/10'
            } rounded-full flex items-center justify-center`}>
              <MessageCircle className={`w-4 h-4 ${isDarkMode ? 'text-[#ece5de]/50' : 'text-[#8d654c]/50'}`} />
            </div>
          </div>
        </motion.button>

        {/* Daily Wisdom Quote Card - Enhanced with powder soft blue */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className={`${
            isDarkMode ? 'bg-gradient-to-br from-[#9dc4e8]/25 to-[#9dc4e8]/15' : 'bg-gradient-to-br from-[#c5dff8]/70 to-[#d4e7f5]/50'
          } rounded-3xl p-6 shadow-sm relative border ${
            isDarkMode ? 'border-[#9dc4e8]/20' : 'border-[#b8d8f0]/30'
          }`}
        >
          {/* Sparkle icon */}
          <div className="absolute top-4 right-4">
            <motion.div
              animate={{ 
                rotate: [0, 10, 0, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-5 h-5 text-[#5b8db8]/60" strokeWidth={2} />
            </motion.div>
          </div>

          {/* Quote text */}
          <p className={`text-sm leading-relaxed mb-3 pr-8 ${
            isDarkMode ? 'text-[#ece5de]/90' : 'text-[#4a5568]'
          } italic`}>
            "{dailyQuote.text}"
          </p>

          {/* Attribution */}
          <p className={`text-xs ${
            isDarkMode ? 'text-[#ece5de]/60' : 'text-[#5b8db8]'
          } font-medium`}>
            — {dailyQuote.author}
          </p>
        </motion.div>
      </div>

      {/* Support Resources Modal */}
      {showSupportModal && (
        <CrisisResourcesModal
          isDarkMode={isDarkMode}
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </div>
  );
}
