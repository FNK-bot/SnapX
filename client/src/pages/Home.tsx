import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createCollection, getMyCollections, deleteCollection } from '../api';
import { FaMagic, FaPlus, FaTrash, FaSignOutAlt, FaEye } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface CollectionSummary {
    _id: string;
    name: string;
    description: string;
    createdAt: string;
}

const Home: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [myCollections, setMyCollections] = useState<CollectionSummary[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            fetchCollections();
        }
    }, [isAuthenticated]);

    const fetchCollections = async () => {
        try {
            const res = await getMyCollections();
            setMyCollections(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            if (coverImage) {
                formData.append('coverImage', coverImage);
            }

            const res = await createCollection(formData);
            toast.success('Collection created!');
            navigate(`/collections/${res.data._id}`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to create collection');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this collection and all its photos?')) return;
        try {
            await deleteCollection(id);
            toast.success('Collection deleted');
            setMyCollections(prev => prev.filter(c => c._id !== id));
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center p-4">
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
                        Snap<span className="text-cyan-400">X</span>
                    </h1>
                    <p className="text-indigo-100 text-lg md:text-xl max-w-lg mx-auto font-light leading-relaxed">
                        The future of event photo sharing. <br />
                        <span className="font-medium opacity-90">Instant AI-powered delivery for every guest.</span>
                    </p>
                    <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
                        <Link to="/login" className="btn-primary inline-flex justify-center items-center px-8 py-3 rounded-full text-lg w-full md:w-auto">
                            Login to Create Event
                        </Link>
                        <Link to="/register" className="btn-secondary inline-flex justify-center items-center px-8 py-3 w-full md:w-auto text-white border border-white/20 hover:bg-white/10 rounded-full">
                            Register
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <nav className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-white tracking-wider flex items-center">
                    Snap<span className="text-cyan-400">X</span> <span className="text-sm font-normal text-indigo-300 ml-4 hidden md:block">| Dashboard</span>
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-indigo-200 hidden md:block">Hello, {user?.email}</span>
                    <button onClick={logout} className="text-indigo-300 hover:text-white transition-colors flex items-center bg-white/10 px-4 py-2 rounded-lg">
                        <FaSignOutAlt className="mr-2" /> Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create New Card */}
                <div className="lg:col-span-1">
                    <div className="glass-panel p-8 sticky top-8">
                        <div className="flex items-center mb-6">
                            <div className="p-3 bg-indigo-500/20 rounded-full mr-4">
                                <FaPlus className="text-cyan-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">New Collection</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 mb-1 uppercase">Event Name</label>
                                <input
                                    type="text"
                                    required
                                    className="glass-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Birthday Bash"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 mb-1 uppercase">Description</label>
                                <textarea
                                    className="glass-input min-h-[80px]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Details..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 mb-1 uppercase">Cover Image (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="block w-full text-indigo-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-cyan-400 hover:file:bg-indigo-500/30"
                                    onChange={(e) => setCoverImage(e.target.files ? e.target.files[0] : null)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                {loading ? <FaMagic className="animate-spin" /> : 'Create'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Collections */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-white mb-6">Your Events</h2>
                    <div className="grid gap-4">
                        {myCollections.length === 0 && (
                            <div className="text-center py-10 glass-panel opacity-60">
                                <p className="text-indigo-200">No events yet. Create your first one!</p>
                            </div>
                        )}
                        {myCollections.map(col => (
                            <div key={col._id} onClick={() => navigate(`/collections/${col._id}`)} className="glass-panel p-6 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-all group">
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{col.name}</h3>
                                    <p className="text-indigo-200 text-sm mt-1">{col.description || 'No description'}</p>
                                    <p className="text-indigo-400/50 text-xs mt-2">{new Date(col.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="p-3 rounded-full bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all">
                                        <FaEye />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(col._id, e)}
                                        className="p-3 rounded-full bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
