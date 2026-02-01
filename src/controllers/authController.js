import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const generateUsername = (name) => {
    let base = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    return `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
};

export const signup = async (req, res) => {
    try {
        const { name, email, password, customUsername } = req.body;

        let username = customUsername || generateUsername(name);

        // Check if username already exists if provided
        if (customUsername) {
            const existing = await User.findOne({ username: customUsername });
            if (existing) return res.status(400).json({ message: "Username already taken" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            username
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(200).json({ user, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const guestLogin = async (req, res) => {
    try {
        const { name } = req.body;
        const username = generateUsername(name);

        const user = new User({
            name,
            username,
            isGuest: true
        });

        await user.save();

        const token = jwt.sign({ id: user._id, isGuest: true }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.status(200).json({ user, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        res.status(200).json({ available: !user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
