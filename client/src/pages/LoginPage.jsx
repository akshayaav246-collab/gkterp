import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = await login(email, password);
            // Redirect based on user role
            if (userData.role === 'Director') navigate('/dashboard/businesshead');
            else if (userData.role === 'Sales Manager') navigate('/dashboard/manager');
            else if (userData.role === 'Sales Executive') navigate('/dashboard/executive');
            else if (userData.role === 'Delivery Team') navigate('/dashboard/delivery');
            else if (userData.role === 'Finance') navigate('/finance/dashboard');
            else navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-end pr-8 relative overflow-hidden" style={{ backgroundColor: '#e0e0e0' }}>
            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
                style={{ transform: 'translateX(-15%)' }}
            >
                <source src="/login-bg.mp4" type="video/mp4" />
            </video>

            {/* Overlay for better readability */}
            <div className="absolute top-0 left-0 w-full h-full bg-black/20 z-10"></div>

            {/* Login Card - No Background Container */}
            <div className="p-8 w-full max-w-md relative z-20">
                <div className="text-center mb-8">
                    <div className="flex flex-col items-center justify-center mb-4">
                        <img src="/login-logo.png" alt="Global Knowledge" className="h-16 w-auto object-contain mb-3" />
                        <h2 className="text-xl font-bold text-white">Global Knowledge Technologies</h2>
                    </div>
                
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-400/50 text-red-100 px-4 py-3 rounded-lg mb-4 text-sm backdrop-blur-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white mb-1">Email Address</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-white/60">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50 backdrop-blur-sm"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-1">Password</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-white/60">
                                <Lock size={18} />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50 backdrop-blur-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-2.5 rounded-lg transition duration-200 transform hover:scale-[1.02] backdrop-blur-sm"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;

