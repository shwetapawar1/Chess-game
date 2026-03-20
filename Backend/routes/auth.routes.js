const express = require("express");
const { login, signup, fetchMe, logout, refresh } = require("../controllers/auth.controllers");
const { verifyAuth } = require("../middleware/verifyAuth");


const authRouter = express.Router();


//post -> login
//post -> signup
//post -> logout
//post -> refreh
//get -> me

authRouter.post("/login", login)
authRouter.post("/signup", signup);
authRouter.post("/logout", logout);
authRouter.post("/refresh", refresh);
authRouter.get("/me", verifyAuth, fetchMe);






module.exports = {authRouter};