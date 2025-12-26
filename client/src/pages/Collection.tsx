import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCollection, findMyPhotos, uploadImages, getCollectionImages } from '../api';
import { FaCloudUploadAlt, FaSearch, FaCamera, FaImages, FaCheckCircle, FaMagic, FaDownload, FaExpand, FaTimes, FaHome, FaTh } from 'react-icons/fa';
import { QRCodeCanvas } from 'qrcode.react';
import { loadModels, getFaceDescriptor, getAllFaceDescriptors, loadImageFromBlob } from '../utils/faceService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface CollectionData {
    _id: string;
    name: string;
    description?: string;
    qrCodeUrl?: string;
    coverImage?: string;
    ownerId: string;
}

interface ImageResult {
    _id: string;
    cloudinaryUrl: string;
}

const Collection: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [collection, setCollection] = useState<CollectionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [modelLoading, setModelLoading] = useState(true);
    const [mode, setMode] = useState<'find' | 'upload' | 'gallery'>('find');

    // Find Mode State
    const [selfie, setSelfie] = useState<File | null>(null);
    const [matches, setMatches] = useState<ImageResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Upload Mode State
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // Gallery Mode State
    const [allImages, setAllImages] = useState<ImageResult[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);

    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        loadModels().then(() => setModelLoading(false));
        if (id) {
            getCollection(id)
                .then(res => setCollection(res.data))
                .catch(err => {
                    console.error(err);
                    toast.error('Failed to load collection');
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const isOwner = user && collection && user.id === collection.ownerId;

    useEffect(() => {
        console.log(`[Collection] Effect: mode=${mode}, isOwner=${isOwner}, id=${id}`);
        if (mode === 'gallery' && isOwner && id) {
            setGalleryLoading(true);
            getCollectionImages(id)
                .then(res => {
                    console.log('[Collection] Fetched images:', res.data);
                    setAllImages(res.data);
                })
                .catch(err => {
                    console.error(err);
                    toast.error('Failed to load gallery');
                })
                .finally(() => setGalleryLoading(false));
        }
    }, [mode, isOwner, id]);

    const handleShare = async () => {
        if (!collection) return;
        const shareData = {
            title: collection.name,
            text: `Check out the photos from ${collection.name}!`,
            url: `${window.location.origin}/api/collections/${collection._id}/share`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                setShowShareModal(true);
            }
        } catch (err) {
            console.error('Error handling share', err);
        }
    };

    const downloadQRCode = () => {
        const canvas = document.querySelector('#qr-code-wrapper canvas') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `${collection?.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            toast.success('QR Code downloaded');
        } else {
            toast.error('Could not generate QR code image');
        }
    };

    const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelfie(e.target.files[0]);
            toast.success('Selfie selected!');
        }
    };

    const handleFindPhotos = async () => {
        if (!selfie || !id) return;
        setSearching(true);
        setMatches([]);
        setSearched(false);

        try {
            const img = await loadImageFromBlob(selfie);
            const descriptor = await getFaceDescriptor(img);

            if (!descriptor) {
                toast.error('No face detected. Please try a clearer selfie.');
                setSearching(false);
                return;
            }

            const descriptorArray = Array.from(descriptor);
            const res = await findMyPhotos(id, descriptorArray);

            setMatches(res.data);
            setSearched(true);
            if (res.data.length > 0) {
                toast.success(`Found ${res.data.length} matches!`);
            } else {
                toast('No matches found. Try another selfie?', { icon: '🤔' });
            }
        } catch (err) {
            console.error(err);
            toast.error('Error finding photos.');
        } finally {
            setSearching(false);
        }
    };

    const handleUploadFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
            toast.success(`${e.target.files.length} photos added`);
        }
    };

    const removeFile = (index: number) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadImages = async () => {
        if (uploadFiles.length === 0 || !id) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadStatus('Initializing AI...');

        try {
            const embeddingsList: number[][][] = [];

            for (let i = 0; i < uploadFiles.length; i++) {
                const progress = Math.round(((i) / uploadFiles.length) * 50);
                setUploadProgress(progress);
                setUploadStatus(`Analyzing faces in photo ${i + 1}/${uploadFiles.length}...`);

                const file = uploadFiles[i];
                const img = await loadImageFromBlob(file);
                const descriptors = await getAllFaceDescriptors(img);
                embeddingsList.push(descriptors.map(d => Array.from(d)));
            }

            setUploadStatus('Uploading to cloud...');
            setUploadProgress(70);

            const formData = new FormData();
            uploadFiles.forEach(file => {
                formData.append('images', file);
            });
            formData.append('embeddings', JSON.stringify(embeddingsList));

            await uploadImages(id, formData);

            setUploadProgress(100);
            toast.success('Images uploaded successfully!');
            setUploadFiles([]);
            setMode('gallery');
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload images. Are you authorized?');
        } finally {
            setUploading(false);
            setUploadStatus('');
            setUploadProgress(0);
        }
    };

    const downloadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `snapx-photo-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            toast.success('Download started');
        } catch (e) {
            console.error(e);
            toast.error('Download failed');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
    );

    if (!collection) return (
        <div className="min-h-screen flex items-center justify-center text-red-300 font-bold text-xl">
            Collection not found
        </div>
    );

    return (
        <div className="min-h-screen pb-20">

            {/* Glass Header */}
            <header className="glass-panel border-t-0 border-x-0 rounded-b-2xl sticky top-0 z-40 backdrop-blur-xl transition-all duration-300">
                {/* Hero Background if Cover Image Exists */}
                {collection.coverImage && (
                    <div className="absolute inset-0 z-[-1] opacity-30 rounded-b-2xl overflow-hidden">
                        <img src={collection.coverImage} alt="Cover" className="w-full h-full object-cover blur-sm" />
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/50 to-indigo-900/90"></div>
                    </div>
                )}

                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-white/50 hover:text-white transition-colors">
                            <FaHome size={24} />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide drop-shadow-sm flex items-center gap-2">
                                {collection?.name}
                            </h1>
                            <p className="text-indigo-200 text-xs md:text-sm hidden md:block mt-1 font-medium">{collection?.description || 'Event Gallery'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="bg-white/10 text-white p-2.5 rounded-full hover:bg-white/20 transition-all flex items-center justify-center backdrop-blur-md"
                            title="Show QR Code"
                        >
                            <FaTh size={18} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="bg-white text-indigo-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center"
                        >
                            <FaCheckCircle className="mr-2" /> Share
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 mt-8 relative z-10">

                {modelLoading && (
                    <div className="glass-panel p-4 mb-8 flex items-center justify-center animate-pulse text-indigo-100 border-indigo-400/30 bg-indigo-500/10">
                        <FaMagic className="mr-3 text-cyan-400" /> Initializing Face Recognition AI...
                    </div>
                )}

                {/* Floating Toggle Pill - Only show if Owner */}
                {isOwner && (
                    <div className="flex justify-center mb-12">
                        <div className="bg-black/20 p-1.5 rounded-full flex space-x-1 border border-white/10 backdrop-blur-md shadow-xl">
                            <button
                                onClick={() => setMode('find')}
                                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${mode === 'find'
                                    ? 'bg-white text-indigo-900 shadow-lg scale-105'
                                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <FaSearch className="mr-2" /> Find
                            </button>
                            <button
                                onClick={() => setMode('gallery')}
                                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${mode === 'gallery'
                                    ? 'bg-white text-indigo-900 shadow-lg scale-105'
                                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <FaTh className="mr-2" /> Gallery
                            </button>
                            <button
                                onClick={() => setMode('upload')}
                                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${mode === 'upload'
                                    ? 'bg-white text-indigo-900 shadow-lg scale-105'
                                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <FaCloudUploadAlt className="mr-2" /> Upload
                            </button>
                        </div>
                    </div>
                )}

                {!isOwner && (
                    <div className="text-center mb-10">
                        <p className="text-indigo-200 text-lg">Looking for your photos? Upload a selfie below.</p>
                    </div>
                )}

                {/* Find Mode (Default for everyone) */}
                {mode === 'find' && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="glass-panel p-8 md:p-12 text-center mb-10 relative overflow-hidden group border border-white/20">

                            <div className="relative z-10">
                                <label htmlFor="selfie-upload" className="cursor-pointer mx-auto w-44 h-44 rounded-full border-4 border-dashed border-white/30 hover:border-white/60 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-300 group-hover:scale-105 shadow-2xl">
                                    {selfie ? (
                                        <img src={URL.createObjectURL(selfie)} alt="Selfie" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <FaCamera className="text-5xl text-white/50 mb-2" />
                                    )}
                                </label>
                                <p className="mt-6 text-indigo-100 font-semibold text-lg">
                                    {selfie ? 'Tap header to change photo' : 'Tap to upload a clear selfie'}
                                </p>
                                <input id="selfie-upload" type="file" accept="image/*" onChange={handleSelfieChange} className="hidden" />

                                {selfie && (
                                    <div className="mt-8">
                                        <button
                                            onClick={handleFindPhotos}
                                            disabled={searching || modelLoading}
                                            className="btn-primary w-full md:w-auto min-w-[250px] text-lg py-4"
                                        >
                                            {searching ? <span className="flex items-center justify-center"><FaSearch className="animate-spin mr-2" /> Scanning...</span> : 'Find My Photos'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Results */}
                        {searched && (
                            <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-8 glass-panel py-3 px-6 rounded-full">
                                    <h2 className="text-xl font-bold text-white">
                                        Found <span className="text-cyan-400">{matches.length}</span> matches
                                    </h2>
                                    {matches.length > 0 && <span className="text-sm text-green-300 flex items-center font-medium bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20"><FaCheckCircle className="mr-2" /> High Confidence</span>}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    {matches.map(img => (
                                        <div key={img._id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/20 bg-black/50">
                                            <img src={img.cloudinaryUrl} alt="Match" className="w-full h-full object-cover" loading="lazy" />

                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                                                <button
                                                    onClick={() => setSelectedImage(img.cloudinaryUrl)}
                                                    className="bg-white text-indigo-900 px-5 py-2 rounded-full font-bold text-sm transform scale-95 hover:scale-105 transition-all flex items-center"
                                                >
                                                    <FaExpand className="mr-2" /> View
                                                </button>
                                                <button
                                                    onClick={() => downloadImage(img.cloudinaryUrl)}
                                                    className="bg-indigo-600 text-white px-5 py-2 rounded-full font-bold text-sm transform scale-95 hover:scale-105 transition-all flex items-center"
                                                >
                                                    <FaDownload className="mr-2" /> Download
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {matches.length === 0 && (
                                    <div className="text-center py-16 glass-panel rounded-3xl">
                                        <FaImages className="text-7xl text-white/20 mx-auto mb-6" />
                                        <p className="text-white/60 text-xl font-light">No matches found.</p>
                                        <p className="text-sm text-indigo-300/60 mt-2">Try a selfie with better lighting.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Gallery Mode (Owners Only) */}
                {mode === 'gallery' && isOwner && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-8 glass-panel py-3 px-6 rounded-full">
                            <h2 className="text-xl font-bold text-white">
                                All Photos <span className="text-indigo-400 text-sm ml-2">({allImages.length})</span>
                            </h2>
                        </div>
                        {galleryLoading ? (
                            <div className="flex justify-center p-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {allImages.map(img => (
                                    <div key={img._id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black/50">
                                        <img src={img.cloudinaryUrl} alt="Gallery" className="w-full h-full object-cover" loading="lazy" />

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                                            <button
                                                onClick={() => setSelectedImage(img.cloudinaryUrl)}
                                                className="bg-white/90 text-indigo-900 p-3 rounded-full hover:scale-110 transition-transform"
                                            >
                                                <FaExpand />
                                            </button>
                                            <button
                                                onClick={() => downloadImage(img.cloudinaryUrl)}
                                                className="bg-indigo-500/90 text-white p-3 rounded-full hover:scale-110 transition-transform"
                                            >
                                                <FaDownload />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {allImages.length === 0 && (
                                    <div className="col-span-full text-center py-20 text-indigo-300">
                                        No photos uploaded yet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Mode (Strictly for Owners) */}
                {mode === 'upload' && isOwner && (
                    <div className="max-w-xl mx-auto animate-fade-in">
                        <div className="glass-panel p-10 rounded-2xl text-center hover:border-white/30 transition-all duration-500 hover:shadow-cyan-500/10">
                            <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                                <FaCloudUploadAlt className="text-5xl text-cyan-400" />
                            </div>

                            <h2 className="text-3xl font-bold text-white mb-3">Organizer Upload</h2>
                            <p className="text-indigo-200 mb-8 font-light">Add photos to the event gallery. <br />AI will automatically index faces.</p>

                            <label className="block mb-8 group cursor-pointer">
                                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 transition-all group-hover:bg-white/5 group-hover:border-cyan-400/50">
                                    <span className="text-indigo-300 group-hover:text-white transition-colors font-medium flex flex-col items-center">
                                        <FaImages className="mb-2 text-2xl" />
                                        Click to Select Photos
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleUploadFilesChange}
                                    className="hidden"
                                />
                            </label>

                            <div className="mb-8">
                                {uploadFiles.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                                        {uploadFiles.map((file, index) => (
                                            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-white/20">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />

                                                {/* Remove Button (only when not uploading) */}
                                                {!uploading && (
                                                    <button
                                                        onClick={() => removeFile(index)}
                                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                                                    >
                                                        <FaTimes size={12} />
                                                    </button>
                                                )}

                                                {/* Uploading Progress Overlay */}
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center backdrop-blur-sm">
                                                        <div className="w-full bg-white/20 rounded-full h-1.5 mb-2 overflow-hidden">
                                                            <div
                                                                className="bg-cyan-400 h-full transition-all duration-300"
                                                                style={{ width: `${uploadProgress}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs text-white font-mono">{uploadProgress}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mb-6 min-h-[24px]">
                                        <span className="text-indigo-300/50 text-sm italic">No files selected</span>
                                    </div>
                                )}
                            </div>

                            {uploading && (
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs text-cyan-300 mb-2 font-mono">
                                        <span>{uploadStatus}</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-cyan-400 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                                            style={{ width: `${uploadProgress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_1s_infinite] skew-x-12"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleUploadImages}
                                disabled={uploading || uploadFiles.length === 0 || modelLoading}
                                className="btn-primary w-full text-lg py-4"
                            >
                                {uploading ? 'Processing...' : 'Start Upload'}
                            </button>

                            <p className="mt-6 text-xs text-indigo-300/40">
                                Images are processed locally. Your privacy is our priority.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <FaTimes />
                    </button>

                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedImage}
                            alt="Full View"
                            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl border border-white/10"
                        />
                        <div className="mt-6 flex space-x-4">
                            <button
                                onClick={() => downloadImage(selectedImage)}
                                className="btn-primary px-8 py-3 flex items-center"
                            >
                                <FaDownload className="mr-2" /> Download Original
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareModal(false)}>
                    <div className="bg-white/10 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center relative" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white text-xl transition-colors"
                            onClick={() => setShowShareModal(false)}
                        >
                            <FaTimes />
                        </button>

                        <h3 className="text-2xl font-bold text-white mb-6">Scan to Share</h3>

                        <div id="qr-code-wrapper" className="bg-white p-4 rounded-xl shadow-lg inline-block mb-6">
                            <QRCodeCanvas value={window.location.href} size={200} includeMargin />
                        </div>

                        <p className="text-indigo-200 mb-6 font-light">
                            Guests can scan this QR code to find their photos instantly.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={downloadQRCode}
                                className="btn-secondary w-full py-3 flex items-center justify-center text-white bg-white/10 hover:bg-white/20"
                            >
                                <FaDownload className="mr-2" /> Download QR Image
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success('Link copied to clipboard!');
                                    setShowShareModal(false);
                                }}
                                className="btn-primary w-full py-3"
                            >
                                Copy Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Collection;
