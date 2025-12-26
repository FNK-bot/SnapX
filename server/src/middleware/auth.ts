import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: { userId: string };
}

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};
