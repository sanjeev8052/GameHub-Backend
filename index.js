import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import passport from "./src/config/passport.js";
import registerSocketHandlers from "./src/socket/socketHandler.js";
import apiRoutes from "./src/routes/index.js";

dotenv.config();

const app = express();
app.use(passport.initialize());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

connectDB();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/v1", apiRoutes);

io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});