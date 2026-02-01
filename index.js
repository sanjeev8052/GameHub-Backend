import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import passport from "passport";

import connectDB from "./config/db.js";
import "./src/config/passport.js";
import registerSocketHandlers from "./src/socket/socketHandler.js";
import apiRoutes from "./src/routes/index.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// --------------------
// Middlewares
// --------------------
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// --------------------
// Database
// --------------------
connectDB();

// --------------------
// Routes
// --------------------
app.use("/api/v1", apiRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to GameHub Backend");
});

// --------------------
// Socket.IO
// --------------------
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  registerSocketHandlers(io, socket);
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
