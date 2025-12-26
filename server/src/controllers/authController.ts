import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password required' });
            return;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({ email, passwordHash });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        console.log(`[LOGIN ATTEMPT] Email: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`[LOGIN FAILED] User not found: ${email}`);
            res.status(400).json({ error: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            console.log(`[LOGIN FAILED] Password mismatch for: ${email}`);
            res.status(400).json({ error: 'Invalid credentials' });
            return;
        }

        console.log(`[LOGIN SUCCESS] User: ${email}`);
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, email: user.email } });
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};
