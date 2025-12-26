import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
    collectionId: mongoose.Types.ObjectId;
    cloudinaryUrl: string;
    faceEmbeddings: number[][]; // Array of face descriptors (each descriptor is an array of numbers)
    createdAt: Date;
}

const ImageSchema: Schema = new Schema({
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', required: true },
    cloudinaryUrl: { type: String, required: true },
    faceEmbeddings: { type: [[Number]], default: [] },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IImage>('Image', ImageSchema);
