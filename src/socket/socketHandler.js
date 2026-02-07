import User from "../models/Users.js";
import GameHistory from "../models/GameHistory.js";
import { generateWordSearchPuzzle, validateWin } from "../utils/gameLogic.js";

const onlineUsers = new Map(); // socket.id -> { username, status }
const games = new Map(); // gameId -> game state
const queues = {
    bingo: {
        "2": [],
        "3": []
    }
};

export default function registerSocketHandlers(io, socket) {
    console.log("A user connected:", socket.id);

    const broadcastOnlineUsers = () => {
        io.emit("online-users", Array.from(onlineUsers.values()));
    };

    const startGame = (gameId, countdownTime = 3) => {
        const game = games.get(gameId);
        if (game) {
            let count = countdownTime;
            io.to(gameId).emit("countdown", count);
            const timer = setInterval(() => {
                count--;
                io.to(gameId).emit("countdown", count);
                if (count <= 0) {
                    clearInterval(timer);
                    game.status = "playing";
                    const playerIds = Object.keys(game.players);
                    if (game.gameType === "bingo") {
                        game.turn = playerIds[Math.floor(Math.random() * playerIds.length)];
                        io.to(gameId).emit("game-start", { turn: game.turn });
                    } else {
                        const puzzle = generateWordSearchPuzzle(game.size || 10);
                        io.to(gameId).emit("game-start", { grid: puzzle.grid, words: puzzle.words, size: game.size });
                    }
                }
            }, 1000);
        }
    };

    socket.on("join-lobby", async ({ username, name }) => {
        onlineUsers.set(socket.id, { id: socket.id, username, name: name || username, status: "lobby" });
        broadcastOnlineUsers();
    });

    // --- QUICK MATCH (Matchmaking) ---
    socket.on("join-queue", ({ gameType, playerCount }) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        user.status = "queue";
        if (!queues[gameType][playerCount].includes(socket.id)) {
            queues[gameType][playerCount].push(socket.id);
        }

        if (queues[gameType][playerCount].length >= parseInt(playerCount)) {
            const playerIds = queues[gameType][playerCount].splice(0, playerCount);
            const gameId = `match-${Date.now()}`;
            const game = {
                id: gameId,
                gameType,
                players: {},
                size: 10,
                status: "starting",
                numbersCalled: []
            };

            playerIds.forEach(pid => {
                const u = onlineUsers.get(pid);
                u.status = "playing";
                const s = io.sockets.sockets.get(pid);
                if (s) s.join(gameId);
                game.players[pid] = { id: pid, username: u.username, name: u.name, ready: true, board: [], called: [] };
            });

            games.set(gameId, game);
            io.to(gameId).emit("game-joined", { gameId, players: game.players, gameType, size: game.size });
            startGame(gameId, 3); // 3s countdown for matchmaking
        }
    });

    // --- PLAY WITH FRIENDS (Private Rooms) ---
    socket.on("create-private-room", ({ gameType }) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const gameId = `private-${inviteCode}`;

        const game = {
            id: gameId,
            inviteCode,
            gameType,
            players: {},
            status: "waiting",
            isSetup: false,
            size: 10,
            maxNumber: 75, // Default max number
            numbersCalled: []
        };

        socket.join(gameId);
        game.players[socket.id] = { id: socket.id, username: user.username, name: user.name, ready: false, board: [], called: [] };
        games.set(gameId, game);

        socket.emit("private-room-created", { gameId, inviteCode });
        io.to(gameId).emit("game-joined", { gameId, players: game.players, inviteCode, gameType, size: game.size, isSetup: game.isSetup, maxNumber: game.maxNumber });
    });

    socket.on("join-private-room", ({ inviteCode }) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        // More robust lookup: find by inviteCode attribute
        const game = Array.from(games.values()).find(g => g.inviteCode === inviteCode.toUpperCase());

        if (game && game.status === "waiting") {
            const gameId = game.id;
            socket.join(gameId);
            game.players[socket.id] = { id: socket.id, username: user.username, name: user.name, ready: false, board: [], called: [] };

            // Emit to entire room so everyone (host and new player) updates their state
            io.to(gameId).emit("game-joined", {
                gameId,
                players: game.players,
                inviteCode,
                gameType: game.gameType,
                size: game.size,
                isSetup: game.isSetup,
                maxNumber: game.maxNumber
            });
        } else {
            socket.emit("error", "Room not found or already started");
        }
    });

    socket.on("update-game-settings", ({ gameId, settings }) => {
        const game = games.get(gameId);
        if (game && game.status === "waiting") {
            // Only host (first player) can change settings
            const hostId = Object.keys(game.players)[0];
            if (socket.id === hostId) {
                game.isSetup = true;
                Object.assign(game, settings);
                // Reset readiness when settings change
                Object.keys(game.players).forEach(pid => game.players[pid].ready = false);
                io.to(gameId).emit("game-settings-updated", { ...settings, isSetup: true });
            }
        }
    });

    socket.on("player-unready", ({ gameId }) => {
        const game = games.get(gameId);
        if (game && game.players[socket.id]) {
            game.players[socket.id].ready = false;
            io.to(gameId).emit("player-ready-update", { playerId: socket.id, ready: false });
        }
    });

    socket.on("player-ready", ({ gameId, board }) => {
        const game = games.get(gameId);
        if (game && game.players[socket.id]) {
            game.players[socket.id].ready = true;
            game.players[socket.id].board = board;

            io.to(gameId).emit("player-ready-update", { playerId: socket.id, ready: true });

            const allReady = Object.values(game.players).every(p => p.ready);
            // Allow start if all ready (even if 1 player for private TESTING)
            if (allReady) {
                game.status = "starting";
                startGame(gameId, 3);
            }
        }
    });

    // --- GAME ACTIONS ---
    socket.on("call-number", ({ gameId, number }) => {
        const game = games.get(gameId);
        if (game && game.turn === socket.id && !game.numbersCalled.includes(number)) {
            game.numbersCalled.push(number);
            const playerIds = Object.keys(game.players);
            const nextIndex = (playerIds.indexOf(socket.id) + 1) % playerIds.length;
            game.turn = playerIds[nextIndex];

            io.to(gameId).emit("number-called", {
                number,
                nextTurn: game.turn,
                numbersCalled: game.numbersCalled,
            });
        }
    });

    socket.on("declare-win", async (gameId) => {
        const game = games.get(gameId);
        if (game) {
            const player = game.players[socket.id];
            if (!player) return;

            if (game.gameType === "bingo") {
                const winData = validateWin(player.board, game.numbersCalled);
                if (winData.isWin) {
                    console.log(`Bingo Win Validated for ${player.username}`);
                    await finalizeGame(game, player, socket.id);
                } else {
                    console.log(`Bingo Win Rejected for ${player.username}. Expected 5 lines, found ${winData.lines.length}`);
                }
            } else {
                // WordSearch win logic (already handled progress)
                await finalizeGame(game, player, socket.id);
            }
        }
    });

    async function finalizeGame(game, player, winnerId) {
        const history = new GameHistory({
            gameType: game.gameType,
            winner: player.username,
            players: Object.values(game.players).map(p => p.username)
        });
        await history.save();

        await User.updateOne({ username: player.username }, { $inc: { [`wins.${game.gameType}`]: 1, gamesPlayed: 1 } });
        for (let pid in game.players) {
            if (pid !== winnerId) await User.updateOne({ username: game.players[pid].username }, { $inc: { gamesPlayed: 1 } });
        }

        io.to(game.id).emit("game-over", { winner: winnerId, username: player.username, name: player.name });
        game.status = "over";
    }

    socket.on("replay-game", ({ gameId }) => {
        const game = games.get(gameId);
        if (game && game.status === "over") {
            game.status = "waiting";
            game.numbersCalled = [];
            Object.keys(game.players).forEach(pid => {
                game.players[pid].ready = false;
                game.players[pid].board = [];
                game.players[pid].called = [];
            });
            io.to(gameId).emit("game-reset", {
                gameId,
                players: game.players,
                gameType: game.gameType,
                maxNumber: game.maxNumber
            });
        }
    });

    // --- VOICE CHAT SIGNALING ---
    socket.on("webrtc-signal", ({ gameId, targetId, signal }) => {
        // Relay signal to specific peer
        io.to(targetId).emit("webrtc-signal", { fromId: socket.id, signal });
    });

    socket.on("toggle-voice", ({ gameId, isMuted }) => {
        // Broadcast voice status change to others in the room
        socket.to(gameId).emit("player-voice-status", { playerId: socket.id, isMuted });
    });

    socket.on("disconnect", () => {
        onlineUsers.delete(socket.id);
        // Clear from queues
        Object.keys(queues).forEach(gt => {
            Object.keys(queues[gt]).forEach(pc => {
                queues[gt][pc] = queues[gt][pc].filter(pid => pid !== socket.id);
            });
        });
        broadcastOnlineUsers();
    });
}

