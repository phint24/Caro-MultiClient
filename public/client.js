const socket = io();
let roomId;
let mySymbol;
let myTurn = false;
let waitingForOpponent = false;

// Tạo bảng 15x15
const boardEl = document.getElementById("board");
const warningEl = document.getElementById("turnWarning"); // thẻ <div id="turnWarning">
const winnerCard = document.getElementById("winnerCard"); // thẻ <div id="winnerCard">
const winnerText = document.getElementById("winnerText"); // thẻ <h3 id="winnerText">
const waitingText = document.getElementById("waitingText"); // thẻ <div id="waitingText">

for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.addEventListener("click", () => makeMove(i, j));
        boardEl.appendChild(cell);
    }
}

socket.on("roomCreated", (id) => {
    document.getElementById("messages").innerText = "Phòng đã tạo: " + id + ". Chờ người chơi khác...";
    roomId = id;
    mySymbol = "X";
    myTurn = true; // X đi trước
    warningEl.innerText = "";
    // Cập nhật số người chơi
    document.getElementById("playerCount").innerText = "1/2";
});

socket.on("startGame", ({ roomId: id, players }) => {
    roomId = id;
    mySymbol = players[0] === socket.id ? "X" : "O";
    myTurn = (mySymbol === "X"); // X đi trước
    document.getElementById("messages").innerText = "Game bắt đầu! Bạn là " + mySymbol;
    warningEl.innerText = "";
    winnerCard.style.display = "none"; // ẩn card nếu đang hiện
    waitingForOpponent = false;
    resetBoard();
    // Cập nhật số người chơi
    document.getElementById("playerCount").innerText = "2/2";
});

socket.on("moveMade", ({ row, col, player }) => {
    const index = row * 15 + col;
    const cell = boardEl.children[index];
    cell.classList.add(player.toLowerCase());

    if (player === mySymbol) {
        myTurn = false;
    } else {
        myTurn = true;
    }
    warningEl.innerText = "";
});

socket.on("gameOver", ({ winner }) => {
    winnerText.innerText = "Người thắng: " + winner;
    waitingText.innerText = "";
    winnerCard.style.display = "block";
    myTurn = false;
});

socket.on("waitingForOpponent", () => {
    waitingText.innerText = "Đang chờ đối thủ…";
});

socket.on("restartGame", () => {
    winnerCard.style.display = "none";
    waitingText.innerText = "";
    resetBoard();
    myTurn = (mySymbol === "X"); // X đi trước mỗi ván
});

socket.on("opponentLeft", () => {
    warningEl.innerText = "Đối thủ đã thoát phòng.";
    winnerCard.style.display = "none";
    // Cập nhật số người chơi
    document.getElementById("playerCount").innerText = "1/2";
});

socket.on("errorMessage", (msg) => {
    warningEl.innerText = msg;
});

// function createRoom() {
//     const id = document.getElementById("roomId").value;
//     socket.emit("createRoom", id);
// }

function createRoom() {
    const id = document.getElementById("roomId").value.trim();
    socket.emit("createRoom", id || null);
}

function joinRoom() {
    const id = document.getElementById("roomId").value;
    socket.emit("joinRoom", id);
}

function makeMove(row, col) {
    if (!myTurn) {
        warningEl.innerText = "Chưa tới lượt của bạn!";
        return;
    }
    const index = row * 15 + col;
    if (boardEl.children[index].innerText !== "") {
        warningEl.innerText = "Ô này đã được đánh!";
        return;
    }
    socket.emit("makeMove", { roomId, row, col });
}

function continueGame() {
    socket.emit("continueGame", roomId);
    waitingText.innerText = "Đang chờ đối thủ…";
    waitingForOpponent = true;
}

function exitRoom() {
    socket.emit("exitRoom", roomId);
    winnerCard.style.display = "none";
}

function resetBoard() {
    for (let i = 0; i < boardEl.children.length; i++) {
        const cell = boardEl.children[i];
        cell.classList.remove("x", "o");
    }
}
