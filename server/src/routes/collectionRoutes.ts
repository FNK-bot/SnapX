import express from 'express';
import multer from 'multer';
import { createCollection, getCollection, uploadImages, findMyPhotos, getMyCollections, deleteCollection, getCollectionImages, shareCollection } from '../controllers/collectionController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public Routes
router.get('/:id', getCollection);
router.get('/:id/share', shareCollection);
router.post('/:id/find-my-photos', express.json(), findMyPhotos);

// Protected Routes
router.use(authMiddleware);
router.post('/', upload.single('coverImage'), createCollection);
router.get('/', getMyCollections); // Get logged in user's collections
router.delete('/:id', deleteCollection);
router.post('/:id/upload-images', upload.array('images', 20), uploadImages);
router.get('/:id/images', getCollectionImages);

export default router;
