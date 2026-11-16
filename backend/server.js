
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// Import Supabase connection
const supabase = require("./config/supabase");

const app = express();

// Serve frontend files from College-Website folder
app.use(express.static(path.join(__dirname, "..")));

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Test backend API
app.get("/api", (req, res) => {
    res.json({
        message: "Campus Track Backend is Running!",
        status: "Success"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        application: "Campus Track",
        backend: "Online",
        database: "Supabase configured"
    });
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Campus Track Backend running on port ${PORT}`);
});