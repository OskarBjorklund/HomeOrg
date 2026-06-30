// server/src/server.js

console.log("Server.js started");

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { initDatabase } = require("./database/database");
const { initSockets } = require("./sockets");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initDatabase();

        const server = http.createServer(app);

        const io = new Server(server, {
            cors: {
                origin: "http://localhost:5173",
                credentials: true
            }
        });

        initSockets(io);

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

console.log("About to listen...");
startServer();