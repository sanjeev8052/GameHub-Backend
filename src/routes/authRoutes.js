import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { signup, login, guestLogin, checkUsername } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/guest", guestLogin);
router.get("/check-username/:username", checkUsername);

// Google Auth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", passport.authenticate("google", { session: false }), (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    // Redirect back to frontend with token (assuming frontend is on 5173 for dev)
    res.redirect(`http://localhost:5173/auth-success?token=${token}&user=${JSON.stringify(req.user)}`);
});

export default router;
