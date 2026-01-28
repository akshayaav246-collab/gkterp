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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <img src="/login-logo.png" alt="Global Knowledge" className="h-14 w-auto object-contain" />
                        <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">Global Knowledge Technologies</h2>
                    </div>
                    <p className="text-gray-500 mt-2">Enter your credentials to access the system</p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400">
                                <Lock size={18} />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition duration-200 transform hover:scale-[1.02]"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Protected System. Authorized Personnel Only.
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

