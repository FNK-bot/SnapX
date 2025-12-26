import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import collectionRoutes from './routes/collectionRoutes';
import authRoutes from './routes/authRoutes';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);

// Serve static files from the React app
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API Endpoint not found' });
        return;
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/snapx';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB connected');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error(err));

export default app;
