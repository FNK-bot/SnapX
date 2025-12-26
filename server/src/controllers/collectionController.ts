import { Request, Response } from 'express';
import Collection from '../models/Collection';
import Image from '../models/Image';
import cloudinary from '../utils/cloudinary';
import { AuthRequest } from '../middleware/auth';
import QRCode from 'qrcode';

// Euclidean distance function
function euclideanDistance(desc1: number[], desc2: number[]): number {
    return Math.sqrt(
        desc1
            .map((val, i) => val - desc2[i])
            .reduce((res, diff) => res + Math.pow(diff, 2), 0)
    );
}

export const createCollection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        // @ts-ignore
        const ownerId = req.user?.userId;

        const collection = new Collection({ name, description, ownerId });
        await collection.save();

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const link = `${baseUrl}/collections/${collection._id}`;

        const qrCodeDataUrl = await QRCode.toDataURL(link);
        collection.qrCodeUrl = qrCodeDataUrl;
        await collection.save();

        res.status(201).json(collection);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error creating collection' });
    }
};

export const getMyCollections = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;
        // console.log('Fetching collections for user:', userId);

        // Ensure accurate query even if implicit casting fails (rare but possible)
        const collections = await Collection.find({
            ownerId: userId
        }).sort({ createdAt: -1 });

        res.json(collections);
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteCollection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const ownerId = req.user?.userId;

        const collection = await Collection.findOneAndDelete({ _id: id, ownerId });
        if (!collection) {
            res.status(404).json({ error: 'Collection not found or unauthorized' });
            return;
        }

        // Optionally delete images from DB and Cloudinary
        await Image.deleteMany({ collectionId: id });

        res.json({ message: 'Collection deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getCollection = async (req: Request, res: Response): Promise<void> => {
    try {
        const collection = await Collection.findById(req.params.id);
        if (!collection) {
            res.status(404).json({ error: 'Collection not found' });
            return;
        }
        res.json(collection);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const uploadImages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Check if user is owner of collection?
        // For simplicity, we just check if user is logged in. 
        // Ideally we should check if collection.ownerId === req.user.userId

        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.userId;

        const collection = await Collection.findById(id);
        if (!collection) {
            res.status(404).json({ error: 'Collection not found' });
            return;
        }

        if (collection.ownerId.toString() !== userId) {
            res.status(403).json({ error: 'Unauthorized: Only the organizer can upload photos' });
            return;
        }

        const files = req.files as Express.Multer.File[];
        const embeddingsStr = req.body.embeddings;

        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No files uploaded' });
            return;
        }

        let embeddingsParsed: number[][][] = [];
        try {
            if (embeddingsStr) {
                embeddingsParsed = JSON.parse(embeddingsStr);
            }
        } catch (e) {
            console.error("Error parsing embeddings", e);
        }

        const savedImages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileEmbeddings = embeddingsParsed[i] || [];

            const b64 = Buffer.from(file.buffer).toString('base64');
            let dataURI = "data:" + file.mimetype + ";base64," + b64;
            const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                folder: `snapx/${id}`,
            });

            const image = new Image({
                collectionId: id,
                cloudinaryUrl: uploadResponse.secure_url,
                faceEmbeddings: fileEmbeddings,
            });
            await image.save();
            savedImages.push(image);
        }

        res.status(201).json(savedImages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error uploading images' });
    }
};

export const findMyPhotos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { descriptor } = req.body;

        if (!descriptor || !Array.isArray(descriptor)) {
            res.status(400).json({ error: 'Valid face descriptor required' });
            return;
        }

        const images = await Image.find({ collectionId: id });

        const matchedImages = images.filter(img => {
            return img.faceEmbeddings.some((embedding: any) => {
                const dist = euclideanDistance(descriptor, embedding);
                return dist < 0.6;
            });
        });

        res.json(matchedImages.map(img => ({
            _id: img._id,
            cloudinaryUrl: img.cloudinaryUrl,
            createdAt: img.createdAt
        })));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing face search' });
    }
};
