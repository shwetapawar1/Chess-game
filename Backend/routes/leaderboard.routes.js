const express = require("express");
const { verifyAuth } = require("../middleware/verifyAuth");
const { leaderboard } = require("../controllers/leaderboard.controller");

const leaderboardRouter = express.Router();

leaderboardRouter.get("/", verifyAuth , leaderboard);

module.exports = { leaderboardRouter }