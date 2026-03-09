const express = require("express");
const { login, signup, fetchMe } = require("../controllers/auth.controllers");


const authRouter = express.Router();


//post -> login
//post -> signup
//post -> logout
//post -> refreh
//get -> me

authRouter.post("/login", login)
authRouter.post("/signup", signup);
authRouter.post("/logout", (req,res) => res.sendStatus(200));
authRouter.post("/refresh", (req,res) => res.sendStatus(200));
authRouter.get("/me", fetchMe);






module.exports = {authRouter};