import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';
import { buildShareUrl, slugifyTitle } from '../lib/share';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const [createdSessions, setCreatedSessions] = useState<Session[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<Session[]>([]);
  const [disabledSessions, setDisabledSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [shareSession, setShareSession] = useState<Session | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      // Get session IDs from localStorage (sessions created by this user)
      const createdSessionIds: string[] = JSON.parse(localStorage.getItem('createdSessions') || '[]');
      const joinedSessionIds: string[] = JSON.parse(localStorage.getItem('joinedSessions') || '[]');
      const disabledIds: string[] = JSON.parse(localStorage.getItem('disabledSessions') || '[]');

      // Fetch sessions from Supabase
      let createdData: Session[] = [];
      let joinedData: Session[] = [];
      let disabledData: Session[] = [];

      if (createdSessionIds.length > 0) {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .in('id', createdSessionIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        createdData = (data || []).filter((s) => !disabledIds.includes(s.id));
      }

      if (joinedSessionIds.length > 0) {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .in('id', joinedSessionIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        joinedData = data || [];
      }

      if (disabledIds.length > 0) {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .in('id', disabledIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        disabledData = data || [];
      }

      setCreatedSessions(createdData);
      setJoinedSessions(joinedData);
      setDisabledSessions(disabledData);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const [confirmAction, setConfirmAction] = useState<null | { type: 'disable' | 'delete'; session: Session }>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const disableSession = (sessionId: string) => {
    const disabledIds: string[] = JSON.parse(localStorage.getItem('disabledSessions') || '[]');
    if (!disabledIds.includes(sessionId)) {
      disabledIds.push(sessionId);
      localStorage.setItem('disabledSessions', JSON.stringify(disabledIds));
    }
    loadSessions();
  };

  const permanentlyDeleteSession = async (sessionId: string) => {
    try {
      await supabase.from('entries').delete().eq('session_id', sessionId);
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      const createdIds: string[] = JSON.parse(localStorage.getItem('createdSessions') || '[]');
      localStorage.setItem('createdSessions', JSON.stringify(createdIds.filter((id) => id !== sessionId)));
      const disabledIds: string[] = JSON.parse(localStorage.getItem('disabledSessions') || '[]');
      localStorage.setItem('disabledSessions', JSON.stringify(disabledIds.filter((id) => id !== sessionId)));
      loadSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      setInfoMessage('Failed to delete session');
    }
  };

  const restoreSession = (sessionId: string) => {
    const disabledIds: string[] = JSON.parse(localStorage.getItem('disabledSessions') || '[]');
    localStorage.setItem('disabledSessions', JSON.stringify(disabledIds.filter((id) => id !== sessionId)));
    loadSessions();
  };

  const exportExcel = async (session: Session) => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const entries = data || [];

      const entriesSheet = XLSX.utils.json_to_sheet(entries.map((e) => ({
        id: e.id,
        session_id: e.session_id,
        text: e.text,
        normalized_text: e.normalized_text,
        color: e.color,
        participant_name: e.participant_name,
        created_at: e.created_at,
      })));

      const countsMap = new Map<string, number>();
      for (const e of entries) {
        const key = e.normalized_text || e.text.toLowerCase();
        countsMap.set(key, (countsMap.get(key) || 0) + 1);
      }
      const countsArr = Array.from(countsMap.entries()).map(([normalized_text, count]) => ({ normalized_text, count }));
      const countsSheet = XLSX.utils.json_to_sheet(countsArr);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, entriesSheet, 'entries');
      XLSX.utils.book_append_sheet(wb, countsSheet, 'counts');
      XLSX.writeFile(wb, `${(session.title || 'session')}.xlsx`);
    } catch (err) {
      console.error('Export Excel failed', err);
      setInfoMessage('Failed to export Excel');
    }
  };

  const leaveJoinedSession = (sessionId: string) => {
    const joinedSessionIds: string[] = JSON.parse(localStorage.getItem('joinedSessions') || '[]');
    const updated = joinedSessionIds.filter((id) => id !== sessionId);
    localStorage.setItem('joinedSessions', JSON.stringify(updated));
    // Clear participant info for that session
    sessionStorage.removeItem(`participant_${sessionId}`);
    // Refresh lists
    loadSessions();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">My Sessions</h1>
            <div className="flex gap-3">
              <Link to="/" className="btn-secondary">
                Home
              </Link>
              <Link to="/create" className="btn-primary">
                Create New
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Created Sessions */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Created Sessions</h2>
          {createdSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card text-center py-10"
            >
              <p className="text-gray-600 dark:text-gray-400 mb-2">You haven't created any sessions yet.</p>
              <Link to="/create" className="btn-primary">Create Session</Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {createdSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card hover:shadow-youth-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                        {session.title}
                      </h3>
                      {session.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {session.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Created {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmAction({ type: 'disable', session })}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="Disable session"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m-7 8h10a2 2 0 002-2V7a2 2 0 00-2-2h-3.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 0010.586 3H7a2 2 0 00-2 2v16a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/screen/${session.id}`}
                        className="btn-primary flex-1 text-center text-sm py-2"
                      >
                        Open Big Screen
                      </Link>
                      <Link
                        to={`/join/${session.id}/${slugifyTitle(session.title || 'session')}`}
                        className="btn-secondary flex-1 text-center text-sm py-2"
                      >
                        Join Session
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShareSession(session)}
                        className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Share Link
                      </button>
                      <button
                        onClick={() => setShowQR(showQR === session.id ? null : session.id)}
                        className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        QR Code
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => exportExcel(session)}
                        className="btn-secondary flex-1 text-sm py-2"
                      >
                        Export Excel
                      </button>
                      <a
                        href={`/#/screen/${session.id}?download=png`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary flex-1 text-sm py-2 text-center"
                      >
                        Export PNG
                      </a>
                    </div>

                    {showQR === session.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex justify-center p-4 bg-white dark:bg-gray-800 rounded-xl"
                      >
                        <QRCodeSVG value={buildShareUrl(session.id, session.title)} size={200} />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Joined Sessions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Joined Sessions</h2>
          {joinedSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card text-center py-10"
            >
              <p className="text-gray-600 dark:text-gray-400">You haven't joined any sessions yet.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {joinedSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card hover:shadow-youth-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                        {session.title}
                      </h3>
                      {session.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {session.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Created {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => leaveJoinedSession(session.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Leave joined session"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/join/${session.id}`}
                        className="btn-primary flex-1 text-center text-sm py-2"
                      >
                        Re-enter Session
                      </Link>
                      <Link
                        to={`/screen/${session.id}`}
                        className="btn-secondary flex-1 text-center text-sm py-2"
                      >
                        View Big Screen
                      </Link>
                    </div>
                    <button
                      onClick={() => leaveJoinedSession(session.id)}
                      className="btn-secondary w-full text-sm py-2"
                    >
                      Leave
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Disabled Sessions */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Disabled Sessions</h2>
          {disabledSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card text-center py-10"
            >
              <p className="text-gray-600 dark:text-gray-400">No disabled sessions</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {disabledSessions.map((session) => (
                <div key={session.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-bold text-lg">{session.title}</div>
                      <div className="text-xs text-gray-500">Created {new Date(session.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => restoreSession(session.id)}>Restore</button>
                      <button className="btn-secondary text-red-600" onClick={() => setConfirmAction({ type: 'delete', session })}>Delete Permanently</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    {confirmAction && (
      <Modal title={confirmAction.type === 'disable' ? 'Disable session?' : 'Permanently delete session?'} onClose={() => setConfirmAction(null)}>
        <p className="text-gray-600 mb-4">
          {confirmAction.type === 'disable'
            ? 'This will hide the session from your Created list. You can restore it later.'
            : 'This will permanently remove the session and all entries. This cannot be undone.'}
        </p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
          <button
            className={confirmAction.type === 'delete' ? 'btn-secondary text-red-600' : 'btn-primary'}
            onClick={async () => {
              const id = confirmAction.session.id;
              setConfirmAction(null);
              if (confirmAction.type === 'disable') {
                disableSession(id);
              } else {
                await permanentlyDeleteSession(id);
              }
            }}
          >
            Confirm
          </button>
        </div>
      </Modal>
    )}
    {infoMessage && (
      <Modal title="Notice" onClose={() => setInfoMessage(null)}>
        <p className="text-gray-700">{infoMessage}</p>
        <div className="flex justify-end mt-4">
          <button className="btn-primary" onClick={() => setInfoMessage(null)}>OK</button>
        </div>
      </Modal>
    )}
    {shareSession && (
      <Modal title="Share this session" onClose={() => setShareSession(null)}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={buildShareUrl(shareSession.id, shareSession.title)}
              className="input-field flex-1"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(buildShareUrl(shareSession.id, shareSession.title))}
            >
              Copy
            </button>
          </div>
          {typeof navigator !== 'undefined' && (navigator as any).share && (
            <button
              className="btn-primary w-full"
              onClick={() => {
                const url = buildShareUrl(shareSession.id, shareSession.title);
                (navigator as any).share({ title: shareSession.title, text: shareSession.description || 'Join my word cloud session', url }).catch(() => {});
              }}
            >
              Share…
            </button>
          )}
          <div className="flex justify-center">
            <QRCodeSVG value={buildShareUrl(shareSession.id, shareSession.title)} size={180} />
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}

// Modal imported from shared component
