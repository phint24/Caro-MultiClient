const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {}; // lưu thông tin phòng chơi

io.on("connection", (socket) => {
    console.log("Người chơi kết nối:", socket.id);

    // Tạo phòng mới
    socket.on("createRoom", (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [socket.id],
                board: Array(15).fill().map(() => Array(15).fill(null)),
                turn: "X",
                continueVotes: []
            };
            socket.join(roomId);
            socket.emit("roomCreated", roomId);
        } else {
            socket.emit("errorMessage", "Phòng đã tồn tại");
        }
    });

    // Tham gia phòng
    socket.on("joinRoom", (roomId) => {
        let room = rooms[roomId];
        if (room && room.players.length === 1) {
            room.players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit("startGame", { roomId, players: room.players });
        } else {
            socket.emit("errorMessage", "Phòng không tồn tại hoặc đã đủ người");
        }
    });

    // Xử lý nước đi
    socket.on("makeMove", ({ roomId, row, col }) => {
        let room = rooms[roomId];
        if (!room) return;

        if (room.board[row][col] === null) {
            room.board[row][col] = room.turn;
            io.to(roomId).emit("moveMade", { row, col, player: room.turn });

            if (checkWin(room.board, row, col, room.turn)) {
                io.to(roomId).emit("gameOver", { winner: room.turn });
                room.continueVotes = [];
            } else {
                room.turn = room.turn === "X" ? "O" : "X";
            }
        }
    });

    // Ngắt kết nối
    socket.on("disconnect", () => {
        console.log("Người chơi thoát:", socket.id);
        for (let roomId in rooms) {
            let room = rooms[roomId];
            if (room.players.includes(socket.id)) {
                io.to(roomId).emit("opponentLeft");
                delete rooms[roomId];
                break;
            }
        }
    });
});

// Hàm kiểm tra thắng
function checkWin(board, r, c, player) {
    const directions = [
        [[0, 1], [0, -1]],
        [[1, 0], [-1, 0]],
        [[1, 1], [-1, -1]],
        [[1, -1], [-1, 1]]
    ];
    for (let dir of directions) {
        let count = 1;
        for (let [dx, dy] of dir) {
            let x = r + dx, y = c + dy;
            while (x >= 0 && y >= 0 && x < 15 && y < 15 && board[x][y] === player) {
                count++;
                x += dx; y += dy;
            }
        }
        if (count >= 5) return true;
    }
    return false;
}

server.listen(3000, () => {
    console.log("Server is running: http://localhost:3000");
});
