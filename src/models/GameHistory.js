import mongoose from "mongoose";

const gameHistorySchema = new mongoose.Schema({
    gameType: String,
    winner: String,
    players: [String],
    date: { type: Date, default: Date.now }
});

const GameHistory = mongoose.model("GameHistory", gameHistorySchema);

export default GameHistory;
