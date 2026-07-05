const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./features/auth/routes");
const householdRoutes = require("./features/households/routes");
const choreRoutes = require("./features/chores/routes");
const choreInstanceRoutes = require("./features/choreInstances/routes");
const dashboardRoutes = require("./features/dashboard/routes");
const errorHandler = require("./middleware/errorHandler");
const { attachUser } = require("./middleware/auth");


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser);

app.use("/api/auth", authRoutes);
app.use("/api/households", householdRoutes);
app.use("/api/chores", choreRoutes);
app.use("/api/chore-instances", choreInstanceRoutes);
app.use("/api/dashboard", dashboardRoutes);


app.get("/api/status", (req, res) => {
    res.json({
        ok: true,
        message: "HomeOrg backend is running",
        user: req.user || null
    });
});

app.use(errorHandler);

module.exports = app;