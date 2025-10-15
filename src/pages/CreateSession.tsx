import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { CreateSessionData } from '../types';
import { buildShareUrl } from '../lib/share';

export default function CreateSession() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateSessionData>({
        title: '',
        description: '',
        creator_name: '',
    });
    const [infoModal, setInfoModal] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Insert session into database
            const { data: session, error } = await supabase
                .from('sessions')
                .insert([
                    {
                        title: formData.title,
                        description: formData.description,
                        creator_name: formData.creator_name,
                        public_url: '', // Will be updated with actual URL
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            if (session) {
                // Update public_url with pretty share URL containing title slug
                const publicUrl = buildShareUrl(session.id, formData.title || 'session');
                await supabase
                    .from('sessions')
                    .update({ public_url: publicUrl })
                    .eq('id', session.id);

                // Store session ID in localStorage for dashboard
                const createdSessions = JSON.parse(localStorage.getItem('createdSessions') || '[]');
                createdSessions.push(session.id);
                localStorage.setItem('createdSessions', JSON.stringify(createdSessions));

                // Navigate to the session screen
                navigate(`/screen/${session.id}`);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            setInfoModal('Failed to create session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg w-full"
                >
                    {/* Back Button */}
                    <Link
                        to="/"
                        className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 mb-6 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Home
                    </Link>

                    <div className="card">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                            Create New Session
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Set up a new word cloud session for your group
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Session Title *
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Youth Group Reflection"
                                    className="input-field dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What will you be discussing today?"
                                    className="input-field dark:bg-gray-700 dark:text-white resize-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="creator_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Your Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="creator_name"
                                    value={formData.creator_name}
                                    onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                                    placeholder="Your name"
                                    className="input-field dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating...
                                    </span>
                                ) : (
                                    'Create Session'
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>
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
