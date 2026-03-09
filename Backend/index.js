const express = require('express');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { authRouter } = require('./routes/auth.routes');
require("dotenv").config();


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors());



app.use("/api/v1/auth", authRouter);

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;

app.listen(PORT, () => console.log("Server is listening on port", PORT));

mongoose
.connect(MONGODB_URI)
.then(() => console.log("Successfully connected to DB"))
.catch((err) => console.log("Failed to connect to DB", err.message));