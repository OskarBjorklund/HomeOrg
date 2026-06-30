const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./modules/auth/routes");
const { attachUser } = require("./middleware/auth");


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(attachUser);

app.use("/api/auth", authRoutes);

app.get("/api/status", (req, res) => {
    res.json({
        ok: true,
        message: "HomeOrg backend is running",
        user: req.user || null
    });
});

module.exports = app;