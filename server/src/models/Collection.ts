import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
    name: string;
    description?: string;
    qrCodeUrl?: string;
    coverImage?: string;
    ownerId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const CollectionSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    qrCodeUrl: { type: String },
    coverImage: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICollection>('Collection', CollectionSchema);
