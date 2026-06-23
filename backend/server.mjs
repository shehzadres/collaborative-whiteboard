import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import { connectDB } from "./db/connect.js";
import Board from "./models/Board.js";

dotenv.config();

await connectDB();

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// =====================================
// HELPERS
// =====================================

function replay(eventLog) {
    const activeStrokes = new Map();

    for (const event of eventLog) {
        switch (event.type) {
            case "draw":
                activeStrokes.set(
                    event.stroke.id,
                    event.stroke
                );
                break;

            case "undo":
                activeStrokes.delete(
                    event.strokeId
                );
                break;

            case "redo":
                activeStrokes.set(
                    event.stroke.id,
                    event.stroke
                );
                break;

            case "delete":
                activeStrokes.delete(
                    event.strokeId
                );
                break;

            case "move": {
                const stroke =
                    activeStrokes.get(
                        event.strokeId
                    );

                if (stroke) {
                    activeStrokes.set(
                        event.strokeId,
                        {
                            ...stroke,
                            x: event.x,
                            y: event.y,
                        }
                    );
                }

                break;
            }

            default:
                break;
        }
    }

    return Array.from(
        activeStrokes.values()
    );
}

function broadcastUsers(roomId) {
    const room =
        io.sockets.adapter.rooms.get(roomId);

    const count = room ? room.size : 0;

    io.to(roomId).emit(
        "online-users",
        count
    );

    console.log(
        `Room ${roomId} users:`,
        count
    );
}

// =====================================
// SOCKETS
// =====================================

io.on("connection", (socket) => {
    console.log(
        "User connected:",
        socket.id
    );

    // =========================
    // JOIN ROOM
    // =========================

    socket.on(
        "join-room",
        async (roomId) => {
            try {
                socket.join(roomId);

                socket.data.roomId =
                    roomId;

                let board =
                    await Board.findOne({
                        roomId,
                    });

                if (!board) {
                    board =
                        await Board.create({
                            roomId,
                            eventLog: [],
                        });
                }

                const currentBoard =
                    replay(
                        board.eventLog
                    );

                socket.emit(
                    "board-history",
                    currentBoard
                );

                setTimeout(() => {
                    broadcastUsers(
                        roomId
                    );
                }, 50);
            } catch (err) {
                console.error(
                    "JOIN ERROR:",
                    err
                );
            }
        }
    );

    // =========================
    // DRAW
    // =========================

    socket.on(
        "draw",
        async ({ roomId, stroke }) => {
            try {
                await Board.findOneAndUpdate(
                    { roomId },
                    {
                        $push: {
                            eventLog: {
                                type: "draw",
                                stroke,
                                userId:
                                    stroke.userId,
                            },
                        },
                    },
                    {
                        upsert: true,
                    }
                );

                socket.to(roomId).emit(
                    "draw",
                    stroke
                );
            } catch (err) {
                console.error(
                    "DRAW ERROR:",
                    err
                );
            }
        }
    );

    // =========================
    // MOVE STROKE
    // =========================

    socket.on(
        "move-stroke",
        async ({
            roomId,
            strokeId,
            x,
            y,
            userId,
        }) => {
            try {
                const board =
                    await Board.findOne({
                        roomId,
                    });

                if (!board) return;

                board.eventLog.push({
                    type: "move",
                    strokeId,
                    x,
                    y,
                    userId,
                });

                await board.save();

                socket.to(roomId).emit(
                    "stroke-moved",
                    {
                        strokeId,
                        x,
                        y,
                    }
                );
            } catch (err) {
                console.error(
                    "MOVE ERROR:",
                    err
                );
            }
        }
    );

    // =========================
    // MOVE GROUP
    // =========================

    socket.on("move-group", async ({ roomId, strokeIds, dx, dy }) => {
        try {
            const board = await Board.findOne({ roomId });
            if (!board) return;

            for (const event of board.eventLog) {
                if (event.type === "draw" && strokeIds.includes(event.stroke?.id)) {
                    event.stroke.x = (event.stroke.x ?? 0) + dx;
                    event.stroke.y = (event.stroke.y ?? 0) + dy;
                }
            }

            await board.save();

            socket.to(roomId).emit("group-moved", {
                strokeIds,
                dx,
                dy,
            });
        } catch (err) {
            console.error("GROUP MOVE ERROR:", err);
        }
    });

    // =========================
    // UNDO
    // =========================

    socket.on(
        "undo-stroke",
        async ({
            roomId,
            userId,
        }) => {
            try {
                const board =
                    await Board.findOne({
                        roomId,
                    });

                if (!board) return;

                let drawEvent =
                    null;

                for (
                    let i =
                        board.eventLog
                            .length - 1;
                    i >= 0;
                    i--
                ) {
                    const event =
                        board.eventLog[i];

                    if (
                        event.type ===
                        "draw" &&
                        event.userId ===
                        userId
                    ) {
                        drawEvent =
                            event;
                        break;
                    }
                }

                if (!drawEvent)
                    return;

                board.eventLog.push({
                    type: "undo",
                    strokeId:
                        drawEvent.stroke.id,
                    userId,
                });

                await board.save();

                io.to(roomId).emit(
                    "board-history",
                    replay(
                        board.eventLog
                    )
                );
            } catch (err) {
                console.error(
                    "UNDO ERROR:",
                    err
                );
            }
        }
    );

    // =========================
    // REDO
    // =========================

    socket.on(
        "redo-stroke",
        async ({
            roomId,
            userId,
        }) => {
            try {
                const board =
                    await Board.findOne({
                        roomId,
                    });

                if (!board) return;

                let undoEvent =
                    null;

                for (
                    let i =
                        board.eventLog
                            .length - 1;
                    i >= 0;
                    i--
                ) {
                    const event =
                        board.eventLog[i];

                    if (
                        event.type ===
                        "undo" &&
                        event.userId ===
                        userId
                    ) {
                        undoEvent =
                            event;
                        break;
                    }
                }

                if (!undoEvent)
                    return;

                const drawEvent =
                    board.eventLog.find(
                        (event) =>
                            event.type ===
                            "draw" &&
                            event.stroke
                                ?.id ===
                            undoEvent.strokeId
                    );

                if (!drawEvent)
                    return;

                board.eventLog.push({
                    type: "redo",
                    stroke:
                        drawEvent.stroke,
                    userId,
                });

                await board.save();

                io.to(roomId).emit(
                    "board-history",
                    replay(
                        board.eventLog
                    )
                );
            } catch (err) {
                console.error(
                    "REDO ERROR:",
                    err
                );
            }
        }
    );

    // =========================
    // DELETE
    // =========================

    socket.on(
        "delete-stroke",
        async ({
            roomId,
            strokeId,
            userId,
        }) => {
            try {
                const board =
                    await Board.findOne({
                        roomId,
                    });

                if (!board) return;

                board.eventLog.push({
                    type: "delete",
                    strokeId,
                    userId,
                });

                await board.save();

                io.to(roomId).emit(
                    "board-history",
                    replay(
                        board.eventLog
                    )
                );
            } catch (err) {
                console.error(
                    "DELETE ERROR:",
                    err
                );
            }
        }
    );

    // =========================
    // CURSORS
    // =========================

    socket.on(
        "cursor-move",
        ({
            roomId,
            x,
            y,
            userId,
        }) => {
            socket.to(roomId).emit(
                "cursor-update",
                {
                    userId,
                    x,
                    y,
                }
            );
        }
    );

    // =========================
    // DISCONNECT
    // =========================

    socket.on(
        "disconnect",
        () => {
            const roomId =
                socket.data.roomId;

            if (!roomId) return;

            setTimeout(() => {
                broadcastUsers(
                    roomId
                );
            }, 50);

            console.log(
                "User disconnected:",
                socket.id
            );
        }
    );
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});