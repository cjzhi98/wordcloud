import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import WordCloud from '../components/WordCloud';
import type { Session, Entry } from '../types';
import { buildShareUrl } from '../lib/share';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../components/Modal';
import { calculateAutoMinOccurrence, analyzeData } from '../lib/autoMinOccurrence';

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
  const [showShare, setShowShare] = useState(false);

  // New NLP settings
  const [displayMode, setDisplayMode] = useState<'overview' | 'balanced' | 'detailed'>('balanced');
  const [showPhrases, setShowPhrases] = useState(true);
  const [minOccMode, setMinOccMode] = useState<'auto' | 'manual'>('auto');
  const [minOccurrence, setMinOccurrence] = useState(2);
  const [semanticGrouping, setSemanticGrouping] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  const participantNames = Array.from(new Set(entries.map(e => e.participant_name))).sort();
  const wordCounts = entries.reduce<Record<string, number>>((acc, e) => {
    const k = e.normalized_text || e.text.toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const wordCountArray = Object.entries(wordCounts).sort((a,b)=> b[1]-a[1]);

  // Calculate auto min occurrence
  const [calculatedMinOcc, setCalculatedMinOcc] = useState(2);
  const [dataAnalysis, setDataAnalysis] = useState(analyzeData([]));

  useEffect(() => {
    if (entries.length > 0) {
      const analysis = analyzeData(entries);
      setDataAnalysis(analysis);

      if (minOccMode === 'auto') {
        const preferredCount = displayMode === 'overview' ? 30 : displayMode === 'balanced' ? 50 : 100;
        const autoValue = calculateAutoMinOccurrence(entries, {
          preferredWordCount: preferredCount,
          spamSensitivity: 'medium'
        });
        setCalculatedMinOcc(autoValue);
      }
    }
  }, [entries, minOccMode, displayMode]);

  // Use the effective min occurrence
  const effectiveMinOcc = minOccMode === 'auto' ? calculatedMinOcc : minOccurrence;

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

        // Enter export mode
        setExportMode(true);
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
          const dataUrl = await htmlToImage.toPng(cloudContainerRef.current);
          const a = document.createElement('a');
          a.href = dataUrl;
          const slug = session.title || 'wordcloud';
          a.download = `${slug}.png`;
          a.click();
        } catch (e) {
          console.error('Auto export PNG failed', e);
        } finally {
          // Exit export mode
          setExportMode(false);
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
                <p className="text-gray-700 text-base sm:text-lg">{session.description}</p>
              )}
            </div>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              <Link
                to={`/`}
                className="btn-secondary text-sm md:text-base px-4 py-2"
              >
                Home
              </Link>
              <button
                onClick={() => setShowShare(true)}
                className="btn-secondary text-sm md:text-base px-4 py-2"
              >
                Share Link
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="btn-secondary text-sm md:text-base px-4 py-2 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Settings
              </button>
              <button
                onClick={toggleFullscreen}
                className="btn-primary flex items-center gap-2 text-sm md:text-base px-4 py-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fullscreen
              </button>
              <button
                onClick={async () => {
                  if (!cloudContainerRef.current || !session) return;

                  // Enter export mode (show fullscreen title, hide stats)
                  setExportMode(true);
                  await new Promise(resolve => setTimeout(resolve, 150)); // Wait for render

                  try {
                    // Capture the image
                    const dataUrl = await htmlToImage.toPng(cloudContainerRef.current);

                    // Download
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    const slug = session.title || 'wordcloud';
                    a.download = `${slug}.png`;
                    a.click();
                  } finally {
                    // Exit export mode
                    setExportMode(false);
                  }
                }}
                className="btn-secondary text-sm md:text-base px-4 py-2"
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
          ref={cloudContainerRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full h-full max-w-7xl relative"
        >
          {(isFullscreen || exportMode) && session && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute top-6 left-6 z-40 max-w-md"
            >
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{session.title}</h1>
              {session.description && (
                <p className="text-gray-700 text-sm mt-1">{session.description}</p>
              )}
            </motion.div>
          )}

          <div className="w-full h-full">
            <WordCloud
              entries={entries}
              rotationRangeDeg={0}
              displayMode={displayMode}
              showPhrases={showPhrases}
              minOccurrence={effectiveMinOcc}
              enableSpamFilter={true}
              semanticGrouping={semanticGrouping}
            />
          </div>

          {/* Stats Footer - Hide during export */}
          {!exportMode && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center mt-8"
            >
            <div className="inline-flex items-center gap-4 md:gap-6 px-5 md:px-8 py-3 md:py-4 bg-gray-900/10 backdrop-blur-sm rounded-2xl">
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
          )}
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

    {showShare && session && (
      <Modal title="Share this session" onClose={() => setShowShare(false)}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={buildShareUrl(session.id, session.title)}
              className="input-field flex-1"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(buildShareUrl(session.id, session.title))}
            >
              Copy
            </button>
          </div>
          {typeof navigator !== 'undefined' && (navigator as any).share && (
            <button
              className="btn-primary w-full"
              onClick={() => {
                const url = buildShareUrl(session.id, session.title);
                (navigator as any).share({ title: session.title, text: session.description || 'Join my word cloud session', url }).catch(() => {});
              }}
            >
              Share…
            </button>
          )}
          <div className="flex justify-center">
            <QRCodeSVG value={buildShareUrl(session.id, session.title)} size={180} />
          </div>
        </div>
      </Modal>
    )}

    {showSettings && (
      <Modal title="Word Cloud Settings" onClose={() => setShowSettings(false)}>
        <div className="space-y-6">
          {/* Display Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">Display Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDisplayMode('overview')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  displayMode === 'overview'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Overview
                <div className="text-xs opacity-75">20-30 words</div>
              </button>
              <button
                onClick={() => setDisplayMode('balanced')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  displayMode === 'balanced'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Balanced
                <div className="text-xs opacity-75">40-50 words</div>
              </button>
              <button
                onClick={() => setDisplayMode('detailed')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  displayMode === 'detailed'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Detailed
                <div className="text-xs opacity-75">80-100 words</div>
              </button>
            </div>
          </div>

          {/* Minimum Occurrence */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Minimum Occurrences
            </label>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMinOccMode('auto')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  minOccMode === 'auto'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setMinOccMode('manual')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  minOccMode === 'manual'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Manual
              </button>
            </div>

            {/* Conditional Display */}
            {minOccMode === 'auto' ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Current threshold:
                  </span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {calculatedMinOcc}
                  </span>
                </div>
                <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                  <div className="flex justify-between">
                    <span>Unique words:</span>
                    <span className="font-medium">{dataAnalysis.uniqueWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diversity:</span>
                    <span className="font-medium">{(dataAnalysis.diversity * 100).toFixed(0)}%</span>
                  </div>
                  {dataAnalysis.spamRatio > 0.15 && (
                    <div className="flex justify-between text-orange-600 dark:text-orange-400">
                      <span>Spam detected:</span>
                      <span className="font-medium">{(dataAnalysis.spamRatio * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Current: <span className="text-purple-600 dark:text-purple-400 font-medium">{minOccurrence}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={minOccurrence}
                  onChange={(e) => setMinOccurrence(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 (show all)</span>
                  <span>10 (only frequent)</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">Semantic Grouping</div>
                <div className="text-sm text-gray-500">Group similar phrases together (e.g., "like chicken" + "buy chicken" → "chicken")</div>
              </div>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-linear">
                <input
                  type="checkbox"
                  checked={semanticGrouping}
                  onChange={(e) => setSemanticGrouping(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer inset-0 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-purple-600 transition-colors">
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${semanticGrouping ? 'translate-x-6' : ''}`}></span>
                </span>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">Show Phrases</div>
                <div className="text-sm text-gray-500">Display full phrases like "i like chicken" instead of just "chicken"</div>
              </div>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-linear">
                <input
                  type="checkbox"
                  checked={showPhrases}
                  onChange={(e) => setShowPhrases(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer inset-0 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-purple-600 transition-colors">
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${showPhrases ? 'translate-x-6' : ''}`}></span>
                </span>
              </div>
            </label>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Powered by Advanced NLP</p>
                <p className="text-xs opacity-90">Supports Chinese (中文), English, and Malay with intelligent phrase detection and semantic grouping.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
 

// Modal is now shared in src/components/Modal
