import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { normalizeText, generateCuteNickname } from '../lib/textNormalization';
import ColorPicker from '../components/ColorPicker';
import type { Session, Entry } from '../types';

export default function JoinSession() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<Session | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Participant state
    const [nickname, setNickname] = useState('');
    const [color, setColor] = useState('#ef4444'); // Default to red
    const [textInput, setTextInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [infoModal, setInfoModal] = useState<string | null>(null);

    // View mode: 'setup' | 'contributing'
    const [viewMode, setViewMode] = useState<'setup' | 'contributing'>('setup');

    const lastTimestampRef = useRef<string | null>(null);

    // Restore participant state from sessionStorage on mount
    useEffect(() => {
        if (!sessionId) return;

        const storageKey = `participant_${sessionId}`;
        const savedData = sessionStorage.getItem(storageKey);

        if (savedData) {
            try {
                const { nickname: savedNickname, color: savedColor, viewMode: savedViewMode } = JSON.parse(savedData);
                console.log('[JoinSession] Restoring participant from sessionStorage:', { savedNickname, savedColor, savedViewMode });
                setNickname(savedNickname);
                setColor(savedColor);
                setViewMode(savedViewMode);
            } catch (err) {
                console.error('[JoinSession] Error restoring participant data:', err);
            }
        }
    }, [sessionId]);

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
        let pollCount = 0;

        const fetchNewEntries = async () => {
            try {
                pollCount++;
                const isFullRefresh = pollCount % 5 === 0; // Full refresh every 5 seconds

                if (isFullRefresh) {
                    // Full refresh: Fetch all entries to detect deletions
                    const { data, error } = await supabase
                        .from('entries')
                        .select('*')
                        .eq('session_id', sessionId)
                        .order('created_at', { ascending: true });

                    if (error) throw error;
                    if (!isMounted) return;

                    if (data) {
                        // Smart diff: only update state if entry IDs actually changed
                        setEntries((prev) => {
                            const prevIds = new Set(prev.map(e => e.id));
                            const newIds = new Set(data.map(e => e.id));

                            // Check if sets are identical (no additions or deletions)
                            if (prevIds.size === newIds.size &&
                                [...prevIds].every(id => newIds.has(id))) {
                                return prev; // No change, keep same reference to prevent re-render
                            }

                            // IDs changed (addition or deletion), update state
                            if (data.length > 0) {
                                lastTimestampRef.current = data[data.length - 1].created_at;
                            }
                            return data;
                        });
                    }
                } else {
                    // Incremental: Fetch only new entries
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
                }
            } catch (err) {
                console.error('[JoinSession] Polling error:', err);
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

    const handleGenerateNickname = () => {
        setNickname(generateCuteNickname());
    };

    const handleStartContributing = () => {
        if (!nickname.trim()) {
            setInfoModal('Please enter a nickname or generate one');
            return;
        }

        // Save participant state to sessionStorage
        const storageKey = `participant_${sessionId}`;
        const participantData = {
            nickname,
            color,
            viewMode: 'contributing',
        };
        sessionStorage.setItem(storageKey, JSON.stringify(participantData));
        console.log('[JoinSession] Saved participant to sessionStorage:', participantData);

        // Track joined sessions in localStorage
        if (sessionId) {
            const joinedSessionIds: string[] = JSON.parse(localStorage.getItem('joinedSessions') || '[]');
            if (!joinedSessionIds.includes(sessionId)) {
                joinedSessionIds.push(sessionId);
                localStorage.setItem('joinedSessions', JSON.stringify(joinedSessionIds));
            }
        }

        setViewMode('contributing');
    };

    const handleLeaveSession = () => {
        if (!sessionId) return;
        const joinedSessionIds: string[] = JSON.parse(localStorage.getItem('joinedSessions') || '[]');
        const updated = joinedSessionIds.filter((id) => id !== sessionId);
        localStorage.setItem('joinedSessions', JSON.stringify(updated));

        // Clear participant data for this session
        const storageKey = `participant_${sessionId}`;
        sessionStorage.removeItem(storageKey);

        navigate('/');
    };

    const handleSubmitWord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || !sessionId) return;

        setSubmitting(true);
        try {
            const originalText = textInput.trim();
            if (originalText.length > 80) {
                setInfoModal('Please keep your word/phrase under 80 characters.');
                setSubmitting(false);
                return;
            }
            const normalizedText = normalizeText(originalText);

            const { data: inserted, error } = await supabase
                .from('entries')
                .insert([
                    {
                        session_id: sessionId,
                        text: originalText,
                        normalized_text: normalizedText,
                        color: color,
                        participant_name: nickname,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Optimistically update UI for the submitting client
            if (inserted) {
                setEntries((prev) => {
                    // Avoid duplicate if Realtime already added it
                    if (prev.some((e) => e.id === inserted.id)) return prev;
                    return [...prev, inserted as Entry];
                });
                // Advance cursor to the latest created_at
                lastTimestampRef.current = inserted.created_at;
            }

            // Clear input on success
            setTextInput('');
        } catch (err) {
            console.error('Error submitting word:', err);
            setInfoModal('Failed to submit word. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteWord = async (entryId: string) => {
        try {
            // Delete from database
            const { error } = await supabase
                .from('entries')
                .delete()
                .eq('id', entryId);

            if (error) throw error;

            // Update local state to remove the deleted entry
            setEntries((prev) => prev.filter((e) => e.id !== entryId));
        } catch (err) {
            console.error('Error deleting word:', err);
            setInfoModal('Failed to delete word. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Session Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400">{error || 'Unable to load this session'}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen p-4 pb-24">
                <div className="max-w-4xl mx-auto">
                    {/* Back to Home */}
                    <Link
                        to="/"
                        className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 mb-4 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Home
                    </Link>
                    {/* Session Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card mb-6"
                    >
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                            {session.title}
                        </h1>
                        {session.description && (
                            <p className="text-gray-600 dark:text-gray-400">{session.description}</p>
                        )}
                    </motion.div>

                    {/* Setup View - Nickname and Color Selection */}
                    <AnimatePresence mode="wait">
                        {viewMode === 'setup' && (
                            <motion.div
                                key="setup"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="card"
                            >
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                                    Join the Session
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Your Nickname
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                placeholder="Enter your nickname"
                                                className="input-field dark:bg-gray-700 dark:text-white flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && nickname.trim()) {
                                                        handleStartContributing();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateNickname}
                                                className="btn-secondary whitespace-nowrap"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleStartContributing}
                                        className="btn-primary w-full"
                                    >
                                        Start Contributing
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Contributing View - Word Submission and Cloud */}
                        {viewMode === 'contributing' && (
                            <motion.div
                                key="contributing"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Floating Input Card */}
                                <div className="card sticky top-4 z-10 shadow-youth-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600"
                                                style={{ backgroundColor: color }}
                                            ></div>
                                            <span className="font-medium text-gray-800 dark:text-white">
                                                {nickname}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('setup')}
                                                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                                            >
                                                Change Name
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLeaveSession}
                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                                            >
                                                Leave Session
                                            </button>
                                        </div>
                                    </div>

                                    {/* Color Picker */}
                                    <div className="mb-4">
                                        <ColorPicker
                                            selectedColor={color}
                                            onColorChange={(newColor) => {
                                                setColor(newColor);
                                                // Update sessionStorage when color changes
                                                const storageKey = `participant_${sessionId}`;
                                                const participantData = { nickname, color: newColor, viewMode: 'contributing' };
                                                sessionStorage.setItem(storageKey, JSON.stringify(participantData));
                                            }}
                                        />
                                    </div>

                                    <form onSubmit={handleSubmitWord} className="space-y-3">
                                        <input
                                            type="text"
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                            placeholder="Type a word or phrase..."
                                            className="input-field dark:bg-gray-700 dark:text-white"
                                            maxLength={80}
                                            disabled={submitting}
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={submitting || !textInput.trim()}
                                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Word'}
                                        </button>
                                    </form>
                                </div>

                                {/* My Words List */}
                                <div className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                            My Words
                                        </h3>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {entries.filter(e => e.participant_name === nickname).length} words submitted
                                        </span>
                                    </div>

                                    {entries.filter(e => e.participant_name === nickname).length === 0 ? (
                                        <div className="text-center py-12">
                                            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                            <p className="text-gray-500 dark:text-gray-400">No words submitted yet</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start by typing a word above</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                            {entries
                                                .filter(e => e.participant_name === nickname)
                                                .slice()
                                                .reverse()
                                                .map((entry) => (
                                                    <motion.div
                                                        key={entry.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 20 }}
                                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div
                                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: entry.color }}
                                                            ></div>
                                                            <span className="text-gray-800 dark:text-white font-medium truncate">
                                                                {entry.text}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteWord(entry.id)}
                                                            className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Delete this word"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </motion.div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {infoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setInfoModal(null)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-youth-lg max-w-md w-[90%] p-6">
                        <h3 className="text-lg font-bold mb-3">Notice</h3>
                        <p className="text-gray-700 dark:text-gray-300">{infoModal}</p>
                        <div className="flex justify-end mt-4">
                            <button className="btn-primary" onClick={() => setInfoModal(null)}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
