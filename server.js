const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {}; // lưu thông tin phòng chơi

function generateRoomId() {
    const num = Math.floor(Math.random() * 1000);
    return num.toString().padStart(3, '0');
}

io.on("connection", (socket) => {
    console.log("Người chơi kết nối:", socket.id);

    // Tạo phòng mới
    // socket.on("createRoom", (roomId) => {
    //     if (!rooms[roomId]) {
    //         rooms[roomId] = {
    //             players: [socket.id],
    //             board: Array(15).fill().map(() => Array(15).fill(null)),
    //             turn: "X",
    //             continueVotes: []
    //         };
    //         socket.join(roomId);
    //         socket.emit("roomCreated", roomId);
    //     } else {
    //         socket.emit("errorMessage", "Phòng đã tồn tại");
    //     }
    // });
    
    socket.on("createRoom", (id) => {
        if (!id) {
            id = generateRoomId();
        }
        console.log("Create id: ", id)

        if (!rooms[id]) {
            rooms[id] = {
                players: [socket.id],
                board: Array(15).fill().map(() => Array(15).fill(null)),
                turn: "X",
                continueVotes: []
            };
            console.log('ID room: ', id)
            socket.join(id);
            socket.emit("roomCreated", id);
        } else {
            socket.emit("errorMessage", "Phòng đã tồn tại");
        }
    });

    // Tham gia phòng
    socket.on("joinRoom", (roomId) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit("errorMessage", `Phòng với ID ${roomId} không tồn tại.`);
            return;
        }

        if (room.players.length >= 2) {
            socket.emit("errorMessage", "Phòng đã đủ người.");
            return;
        }

        room.players.push(socket.id);
        socket.join(roomId)
        console.log(`Da tham gia phong ${roomId}!`)
        io.to(roomId).emit("startGame", { roomId, players: room.players });
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

    // Người chơi chọn tiếp tục
    socket.on("continueGame", (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        if (!room.continueVotes.includes(socket.id)) {
            room.continueVotes.push(socket.id);
        }

        if (room.continueVotes.length === 2) {
            // Cả hai đồng ý tiếp tục
            room.board = Array(15).fill().map(() => Array(15).fill(null));
            room.turn = "X";
            room.continueVotes = [];
            io.to(roomId).emit("restartGame");
        } else {
            socket.emit("waitingForOpponent");
        }
    });

    // Người chơi thoát phòng
    socket.on("exitRoom", (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        io.to(roomId).emit("opponentLeft");
        delete rooms[roomId];
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
