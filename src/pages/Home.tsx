import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl w-full text-center"
            >
                {/* Logo/Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mb-8"
                >
                    <div className="inline-block p-6 bg-gradient-joy rounded-3xl shadow-youth-lg">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl md:text-4xl font-semibold mb-6 text-gray-800 dark:text-white"
                >
                    Word Cloud
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-lg mx-auto font-chinese"
                >
                    分享你的想法，看見彼此的心聲
                    <br />
                    Share your thoughts, see each other's hearts
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <Link to="/create" className="btn-primary text-lg px-8 py-4">
                        Create New Session
                    </Link>
                    <Link to="/dashboard" className="btn-secondary text-lg px-8 py-4">
                        My Sessions
                    </Link>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    <div className="card text-center">
                        <div className="text-4xl mb-3">🎨</div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Real-Time</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Watch words appear instantly as everyone shares
                        </p>
                    </div>
                    <div className="card text-center">
                        <div className="text-4xl mb-3">📱</div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Mobile-Friendly</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Join easily from any device with a simple link
                        </p>
                    </div>
                    <div className="card text-center">
                        <div className="text-4xl mb-3">🎯</div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Smart Grouping</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Similar words automatically grouped together
                        </p>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-12 text-sm text-gray-500 dark:text-gray-400"
                >
                    Made with love
                </motion.div>
            </motion.div>
        </div>
    );
}
