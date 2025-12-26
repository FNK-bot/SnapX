import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api';
import toast from 'react-hot-toast';
import { FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';

const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        try {
            await registerUser({ email, password });
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Registration failed';
            toast.error(msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 w-full max-w-md animate-fade-in">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-500/20 p-4 rounded-full">
                        <FaUserPlus size={30} className="text-cyan-400" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-center text-white mb-6">Create Account</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-indigo-200 text-sm font-bold mb-2">Email</label>
                        <input
                            type="email"
                            className="glass-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-indigo-200 text-sm font-bold mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="glass-input pr-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={4}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-300 hover:text-white transition-colors"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary w-full">Register</button>
                </form>
                <p className="mt-4 text-center text-indigo-200">
                    Already have an account? <Link to="/login" className="text-cyan-400 font-bold hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
