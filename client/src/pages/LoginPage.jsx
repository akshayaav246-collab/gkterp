import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
        <>
            <style>
                {`
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover,
                    input:-webkit-autofill:focus,
                    input:-webkit-autofill:active {
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: white;
                        transition: background-color 5000s ease-in-out 0s;
                        box-shadow: inset 0 0 20px 20px rgba(255, 255, 255, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }
                `}
            </style>
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
                            <label className="block text-sm font-medium text-white mb-1">Email</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 z-10 pointer-events-none">
                                    <Mail size={18} />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50 backdrop-blur-sm relative"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-1">Password</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 z-10 pointer-events-none">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-2.5 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50 backdrop-blur-sm relative"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white/90 transition z-10 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
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
        </>
    );
};

export default LoginPage;


