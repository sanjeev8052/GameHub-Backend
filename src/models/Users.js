
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    isGuest: { type: Boolean, default: false },
    wins: {
        bingo: { type: Number, default: 0 },
        wordsearch: { type: Number, default: 0 }
    },
    gamesPlayed: { type: Number, default: 0 }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
