import { getBestMove } from "./lichess.js";
const squares = document.getElementsByClassName("square");
const board = document.getElementById("chessboard");
let isWhiteMoves = false;
let halfmoveClock = 0;
let fullmoveNumber = 1;
function generateBoard() {
    for (let i = 0; i < 64; i++) {
        const pixel = document.createElement("div");
        pixel.classList.add("square");
        board?.appendChild(pixel);
    }
    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;
        if ((row + col) % 2 === 0) {
            squares[i]?.classList.add("dark-square");
        }
        else {
            squares[i]?.classList.add("white-square");
        }
    }
}
function generateBoardFEN(FEN) {
    const rows = FEN.split("/");
    let index = 0;
    for (let row in rows) {
        for (let char of row) {
            if (isNaN(Number(char))) {
                const pieceClass = getPiceClass(char);
                squares[index]?.classList.add('piece', pieceClass);
                index++;
            }
            else {
                index += parseInt(char);
            }
        }
    }
}
function getPiceClass(char) {
    const isWhite = char === char.toUpperCase();
    const piece = char.toLowerCase();
    const color = isWhite ? 'w' : "b";
    switch (piece) {
        case "p": return `pawn-${color}`;
        case "r": return `rook-${color}`;
        case "n": return `knight-${color}`;
        case "b": return `bishop-${color}`;
        case "q": return `queen-${color}`;
        case "k": return `king-${color}`;
    }
}
generateBoard();
generateBoardFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
//# sourceMappingURL=script.js.map