const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const levelEl = document.getElementById("level");
const levelValueEl = document.getElementById("level-value");
const newGameBtn = document.getElementById("new-game");
const moveListEl = document.getElementById("move-list");

const game = new Chess();
const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

const pieceMap = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

let selectedSquare = null;
let legalTargets = [];

const engine = new Worker("https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js");
engine.postMessage("uci");

function renderBoard() {
  boardEl.innerHTML = "";
  const board = game.board();

  for (let rank = 8; rank >= 1; rank -= 1) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const square = `${files[fileIndex]}${rank}`;
      const piece = board[8 - rank][fileIndex];
      const squareEl = document.createElement("button");
      squareEl.className = `square ${(rank + fileIndex) % 2 === 0 ? "light" : "dark"}`;
      squareEl.dataset.square = square;
      squareEl.type = "button";
      if (piece) {
        const isWhitePiece = piece.color === "w";
        squareEl.textContent = pieceMap[isWhitePiece ? piece.type.toUpperCase() : piece.type];
        squareEl.classList.add(isWhitePiece ? "piece-white" : "piece-black");
      } else {
        squareEl.textContent = "";
      }

      if (square === selectedSquare) {
        squareEl.classList.add("selected");
      }
      if (legalTargets.includes(square)) {
        squareEl.classList.add("target");
      }

      squareEl.addEventListener("click", () => onSquareClick(square));
      boardEl.appendChild(squareEl);
    }
  }
}

function onSquareClick(square) {
  if (game.turn() !== "w" || game.game_over()) {
    return;
  }

  const piece = game.get(square);

  if (selectedSquare && legalTargets.includes(square)) {
    const move = game.move({ from: selectedSquare, to: square, promotion: "q" });
    selectedSquare = null;
    legalTargets = [];
    if (move) {
      updateMoveList();
      renderBoard();
      updateStatus("Stockfish đang suy nghĩ...");
      setTimeout(playEngineMove, 60);
      return;
    }
  }

  if (piece && piece.color === "w") {
    selectedSquare = square;
    legalTargets = game.moves({ square, verbose: true }).map((m) => m.to);
  } else {
    selectedSquare = null;
    legalTargets = [];
  }

  renderBoard();
}

function playEngineMove() {
  if (game.game_over()) {
    updateStatus(getGameOverText());
    return;
  }

  const depth = Number(levelEl.value);
  engine.postMessage(`position fen ${game.fen()}`);
  engine.postMessage(`go depth ${depth}`);
}

engine.onmessage = (event) => {
  const line = String(event.data);
  if (!line.startsWith("bestmove")) {
    return;
  }

  const bestMove = line.split(" ")[1];
  if (!bestMove || bestMove === "(none)") {
    updateStatus(getGameOverText());
    return;
  }

  game.move({
    from: bestMove.slice(0, 2),
    to: bestMove.slice(2, 4),
    promotion: bestMove[4] || "q"
  });

  updateMoveList();
  renderBoard();

  if (game.game_over()) {
    updateStatus(getGameOverText());
  } else {
    updateStatus("Đến lượt bạn (quân trắng).");
  }
};

function updateStatus(text) {
  statusEl.textContent = text;
}

function getGameOverText() {
  if (game.in_checkmate()) {
    return game.turn() === "w" ? "Bạn thua! Stockfish chiếu bí." : "Bạn thắng!";
  }
  if (game.in_draw()) {
    return "Ván cờ hòa.";
  }
  return "Ván cờ kết thúc.";
}

function updateMoveList() {
  moveListEl.innerHTML = "";
  const history = game.history();

  for (let i = 0; i < history.length; i += 2) {
    const item = document.createElement("li");
    const white = history[i] ?? "";
    const black = history[i + 1] ?? "";
    item.textContent = `${white} ${black}`.trim();
    moveListEl.appendChild(item);
  }
}

newGameBtn.addEventListener("click", () => {
  game.reset();
  selectedSquare = null;
  legalTargets = [];
  updateMoveList();
  renderBoard();
  updateStatus("Bạn đi trước với quân trắng.");
});

levelEl.addEventListener("input", () => {
  levelValueEl.textContent = levelEl.value;
});

renderBoard();
updateStatus("Bạn đi trước với quân trắng.");
