import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import WordCloud from '../components/WordCloud';
import type { Session, Entry } from '../types';
import { buildShareUrl } from '../lib/share';
import * as htmlToImage from 'html-to-image';

export default function BigScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const lastTimestampRef = useRef<string | null>(null);
  const cloudContainerRef = useRef<HTMLDivElement | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showWords, setShowWords] = useState(false);

  const participantNames = Array.from(new Set(entries.map(e => e.participant_name))).sort();
  const wordCounts = entries.reduce<Record<string, number>>((acc, e) => {
    const k = e.normalized_text || e.text.toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const wordCountArray = Object.entries(wordCounts).sort((a,b)=> b[1]-a[1]);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);

        // Fetch existing entries
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (entriesError) throw entriesError;
        const initial = entriesData || [];
        setEntries(initial);
        if (initial.length > 0) {
          lastTimestampRef.current = initial[initial.length - 1].created_at;
        }
      } catch (err) {
        console.error('Error loading session:', err);
        setError('Session not found or unable to load');
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Always-on polling (no Realtime)
    let isMounted = true;
    const fetchNewEntries = async () => {
      try {
        let query = supabase
          .from('entries')
          .select('*')
          .eq('session_id', sessionId);

        if (lastTimestampRef.current) {
          query = query.gt('created_at', lastTimestampRef.current);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        if (!isMounted || !data || data.length === 0) return;

        setEntries((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const fresh = data.filter((e) => !existingIds.has(e.id));
          if (fresh.length === 0) return prev;
          const merged = [...prev, ...fresh];
          lastTimestampRef.current = merged[merged.length - 1].created_at;
          return merged;
        });
      } catch (err) {
        console.error('[BigScreen] Polling error:', err);
      }
    };

    const pollInterval = setInterval(fetchNewEntries, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNewEntries();
    };
    const handleFocus = () => fetchNewEntries();
    const handleOnline = () => fetchNewEntries();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [sessionId]);

  // If opened with ?download=png, export automatically once content is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('download') === 'png') {
      const timer = setTimeout(async () => {
        if (!cloudContainerRef.current || !session) return;
        try {
          const dataUrl = await htmlToImage.toPng(cloudContainerRef.current);
          const a = document.createElement('a');
          a.href = dataUrl;
          const slug = session.title || 'wordcloud';
          a.download = `${slug}.png`;
          a.click();
        } catch (e) {
          console.error('Auto export PNG failed', e);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [session, entries.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="card max-w-md text-center bg-gray-800">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-4">{error || 'Unable to load this session'}</p>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900 overflow-hidden">
      {/* Header - Only show when not in fullscreen */}
      {!isFullscreen && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 md:p-6 border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{session.title}</h1>
              {session.description && (
                <p className="text-gray-300 text-lg">{session.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                to={`/`}
                className="btn-secondary"
              >
                Home
              </Link>
              <button
                onClick={() => {
                  if (!session) return;
                  const url = buildShareUrl(session.id, session.title);
                  navigator.clipboard.writeText(url);
                  alert('Share link copied!');
                }}
                className="btn-secondary"
              >
                Share Link
              </button>
              <button
                onClick={toggleFullscreen}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fullscreen
              </button>
              <button
                onClick={async () => {
                  if (!cloudContainerRef.current || !session) return;
                  const dataUrl = await htmlToImage.toPng(cloudContainerRef.current);
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  const slug = session.title || 'wordcloud';
                  a.download = `${slug}.png`;
                  a.click();
                }}
                className="btn-secondary"
              >
                Export PNG
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Fullscreen Controls - Show in fullscreen mode */}
      {isFullscreen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleFullscreen}
          className="fixed top-6 right-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}

      {/* Word Cloud Display */}
      <div className={`flex items-center justify-center ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-200px)]'} p-4 md:p-8`}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full h-full max-w-7xl"
        >
          {isFullscreen && session && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{session.title}</h1>
              {session.description && (
                <p className="text-gray-300 text-xl">{session.description}</p>
              )}
            </motion.div>
          )}

          <div className="w-full h-full" ref={cloudContainerRef}>
            <WordCloud entries={entries} rotationRangeDeg={0} maxWords={isFullscreen ? 70 : 50} />
          </div>

          {/* Stats Footer */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8"
          >
            <div className="inline-flex items-center gap-6 px-8 py-4 bg-gray-900/10 backdrop-blur-sm rounded-2xl">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-green-700">Live</span>
                  </>
                )}
                {connectionStatus === 'connecting' && (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-yellow-700">Connecting...</span>
                  </>
                )}
                {connectionStatus === 'disconnected' && (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-blue-700">Auto-updating</span>
                  </>
                )}
              </div>

              <button onClick={() => setShowParticipants(true)} className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-lg font-medium">
                  {new Set(entries.map(e => e.participant_name)).size} Participants
                </span>
              </button>
              <button onClick={() => setShowWords(true)} className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-medium">{entries.length} Words</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>

    {showParticipants && (
      <Modal title={`Participants (${participantNames.length})`} onClose={() => setShowParticipants(false)}>
        <ul className="space-y-2">
          {participantNames.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </Modal>
    )}

    {showWords && (
      <Modal title={`Words (${entries.length})`} onClose={() => setShowWords(false)}>
        <ul className="space-y-2">
          {wordCountArray.map(([w, c]) => (
            <li key={w} className="flex items-center justify-between gap-2">
              <span className="font-chinese">{w}</span>
              <span className="text-sm text-gray-500">{c}</span>
            </li>
          ))}
        </ul>
      </Modal>
    )}
    </>
  );
}
 

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-youth-lg max-w-lg w-[90%] max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
