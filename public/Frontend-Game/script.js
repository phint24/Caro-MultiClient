const socket = io();
const boardDiv = document.getElementById("board");
const gameArea = document.getElementById("gameArea");
const turnInfo = document.getElementById("turnInfo");
const messages = document.getElementById("messages");
let roomId = "";
let currentPlayer = "";
let myTurn = false;

// Khởi tạo bàn cờ
const boardSize = 15;
let board = [];

function renderBoard() {
    boardDiv.innerHTML = "";
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.textContent = board[r][c] || "";
            cell.onclick = () => {
                if (myTurn && !board[r][c]) {
                    socket.emit("makeMove", { roomId, row: r, col: c });
                }
            };
            boardDiv.appendChild(cell);
        }
    }
}

function createRoom() {
    const id = document.getElementById("roomIdInput").value.trim();
    if (id) socket.emit("createRoom", id);
}

function joinRoom() {
    const id = document.getElementById("roomIdInput").value.trim();
    if (id) socket.emit("joinRoom", id);
}

function sendContinue() {
    socket.emit("continueGame", roomId);
}

function exitRoom() {
    socket.emit("exitRoom", roomId);
    location.reload();
}

// Sự kiện từ server
socket.on("roomCreated", (id) => {
    messages.textContent = "Phòng đã được tạo. Chờ người chơi...";
    roomId = id;
    currentPlayer = "X";
    myTurn = true;
    gameArea.style.display = "block";
    board = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    renderBoard();
});

socket.on("startGame", (data) => {
    messages.textContent = "Trò chơi bắt đầu!";
    roomId = data.roomId;
    const [player1, player2] = data.players;
    currentPlayer = socket.id === player1 ? "X" : "O";
    myTurn = currentPlayer === "X";
    gameArea.style.display = "block";
    board = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    renderBoard();
    turnInfo.textContent = `Bạn là: ${currentPlayer} - ${myTurn ? "Đến lượt bạn" : "Chờ đối thủ"}`;
});

socket.on("moveMade", ({ row, col, player }) => {
    board[row][col] = player;
    myTurn = (player !== currentPlayer);
    renderBoard();
    turnInfo.textContent = `Bạn là: ${currentPlayer} - ${myTurn ? "Đến lượt bạn" : "Chờ đối thủ"}`;
});

socket.on("gameOver", ({ winner }) => {
    alert(`Người chơi ${winner} thắng!`);
    myTurn = false;
});

socket.on("restartGame", () => {
    board = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    renderBoard();
    myTurn = currentPlayer === "X";
    messages.textContent = "Game đã khởi động lại!";
});

socket.on("waitingForOpponent", () => {
    messages.textContent = "Đang chờ đối thủ đồng ý chơi tiếp...";
});

socket.on("opponentLeft", () => {
    alert("Đối thủ đã thoát. Trò chơi kết thúc.");
    location.reload();
});

socket.on("errorMessage", (msg) => {
    messages.textContent = msg;
});
