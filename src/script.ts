// --- IMPORTOK ---
import { getBestMove } from "./lichess.js";

// --- DOM ELEMEK ---
const squares = document.getElementsByClassName("square") as unknown as HTMLDivElement[];
const board = document.getElementById("chessboard") as HTMLDivElement;

// --- JÁTÉK ÁLLAPOT ---
let isWhiteMoves: boolean = false;
let halfmoveClock: number = 0;
let fullmoveNumber: number = 1;

let kingHasMoved = false;
let kingsideRookHasMoved = false;
let queensideRookHasMoved = false;

let selectedSquare: HTMLDivElement | null = null;
let legals: number[] = [];

// ----------------------------------
//   TÁBLA GENERÁLÁS
// ----------------------------------
function GenerateBoard(): void {
    for (let i = 0; i < 64; i++) {
        const pixel = document.createElement("div");
        pixel.classList.add("square");
        board.appendChild(pixel);
    }

    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;

        if ((row + col) % 2 === 0) {
            squares[i].classList.add("dark-square");
        } else {
            squares[i].classList.add("light-square");
        }
    }
}

function getPieceClass(char: string): string {
    const isWhite = char === char.toUpperCase();
    const piece = char.toLowerCase();
    const color = isWhite ? "w" : "b";

    switch (piece) {
        case "p": return `pawn-${color}`;
        case "r": return `rook-${color}`;
        case "n": return `knight-${color}`;
        case "b": return `bishop-${color}`;
        case "q": return `queen-${color}`;
        case "k": return `king-${color}`;
        default: return "";
    }
}

function generateBoardFEN(FEN: string): void {
    const rows = FEN.split("/");
    let index = 0;

    for (const row of rows) {
        for (const char of row) {
            if (isNaN(Number(char))) {
                const pieceClass = getPieceClass(char);
                squares[index].classList.add("piece", pieceClass);
                index++;
            } else {
                index += parseInt(char);
            }
        }
    }
}

// ----------------------------
//  ALAP BEÁLLÍTÁS
// ----------------------------
GenerateBoard();
generateBoardFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");

// ---------------------------------------
//   FÜGGVÉNYEK — TÍPUSOSÍTOTT VÁLTOZAT
// ---------------------------------------

function isOccupiedWhite(index: number): boolean {
    const classes = Array.from(squares[index].classList);
    return classes.some(c => c.endsWith("-w"));
}

function isOccupiedBlack(index: number): boolean {
    const classes = Array.from(squares[index].classList);
    return classes.some(c => c.endsWith("-b"));
}

function indexToNote(index: number): string {
    const notes = [
        "A8","B8","C8","D8","E8","F8","G8","H8",
        "A7","B7","C7","D7","E7","F7","G7","H7",
        "A6","B6","C6","D6","E6","F6","G6","H6",
        "A5","B5","C5","D5","E5","F5","G5","H5",
        "A4","B4","C4","D4","E4","F4","G4","H4",
        "A3","B3","C3","D3","E3","F3","G3","H3",
        "A2","B2","C2","D2","E2","F2","G2","H2",
        "A1","B1","C1","D1","E1","F1","G1","H1"
    ];
    return notes[index];
}


function getLegels(name: string, index: number): number[] {
    const legalIndexes: number[] = [];

    const sameRow = (a: number, b: number): boolean =>
        Math.floor(a / 8) === Math.floor(b / 8);

    // ======================
    //  WHITE PAWN
    // ======================
    if (name === "pawn-w") {
        const oneForward = index - 8;
        const twoForward = index - 16;
        const captures = [index - 7, index - 9];

        if (!isKingCheck() && oneForward >= 0 && !isOccupiedWhite(oneForward) && !isOccupiedBlack(oneForward)) {
            legalIndexes.push(oneForward);
        }

        if (!isKingCheck() && index >= 48 && index <= 55 && !isOccupiedWhite(twoForward) && !isOccupiedBlack(twoForward)) {
            legalIndexes.push(twoForward);
        }

        for (const cap of captures) {
            if (!isKingCheck() && cap >= 0 && cap < 64 && isOccupiedBlack(cap) && !sameRow(index, cap)) {
                legalIndexes.push(cap);
            }
        }
    }

    // ======================
    //  WHITE KNIGHT
    // ======================
    if (name === "knight-w") {
        const knightMoves = [-17, -15, -10, -6, 6, 10, 15, 17];
        const row = Math.floor(index / 8);
        const col = index % 8;

        for (const offset of knightMoves) {
            const move = index + offset;
            if (move < 0 || move >= 64) continue;

            const moveRow = Math.floor(move / 8);
            const moveCol = move % 8;

            const rowDiff = Math.abs(moveRow - row);
            const colDiff = Math.abs(moveCol - col);

            if (!(
                (rowDiff === 2 && colDiff === 1) ||
                (rowDiff === 1 && colDiff === 2)
            )) continue;

            if (!isOccupiedWhite(move)) legalIndexes.push(move);
        }
    }

    // ======================
    //  WHITE BISHOP + QUEEN
    // ======================
    if (name === "bishop-w" || name === "queen-w") {
        const directions = [-9, -7, 7, 9];

        for (const dir of directions) {
            let pos = index + dir;

            while (
                pos >= 0 &&
                pos < 64 &&
                Math.abs((pos % 8) - ((pos - dir) % 8)) === 1
            ) {
                if (isOccupiedWhite(pos)) break;

                legalIndexes.push(pos);

                if (isOccupiedBlack(pos)) break;
                pos += dir;
            }
        }
    }

    // ======================
    //  WHITE ROOK + QUEEN
    // ======================
    if (name === "rook-w" || name === "queen-w") {
        const directions = [-8, 8, -1, 1];

        for (const dir of directions) {
            let pos = index + dir;

            while (pos >= 0 && pos < 64) {
                if ((dir === 1 || dir === -1) && !sameRow(pos, pos - dir)) break;

                if (isOccupiedWhite(pos)) break;

                legalIndexes.push(pos);

                if (isOccupiedBlack(pos)) break;
                pos += dir;
            }
        }
    }

    // ======================
    //  WHITE KING
    // ======================
    if (name === "king-w") {
        const moves = [-9, -8, -7, -1, 1, 7, 8, 9];
        const row = Math.floor(index / 8);
        const col = index % 8;

        for (const offset of moves) {
            const move = index + offset;
            if (move < 0 || move >= 64) continue;

            const moveRow = Math.floor(move / 8);
            const moveCol = move % 8;

            if (Math.abs(moveRow - row) > 1 || Math.abs(moveCol - col) > 1) continue;
            if (isOccupiedWhite(move)) continue;

            // --- Simulate King move ---
            const originalTo = Array.from(squares[move].classList);
            const originalFrom = Array.from(squares[index].classList);

            squares[move].classList.add("king-w", "piece");
            squares[index].classList.remove("king-w");

            const inCheck = isKingCheck();

            // revert
            squares[index].classList.add("king-w", "piece");
            squares[move].classList.remove("king-w", "piece");

            for (const c of originalTo) {
                if (!["square", "light-square", "dark-square"].includes(c)) {
                    squares[move].classList.add(c);
                }
            }

            if (!inCheck) legalIndexes.push(move);
        }

        // ======================
        //  CASTLING — KING SIDE
        // ======================
        if (!kingHasMoved && !kingsideRookHasMoved) {
            const path = [61, 62];
            let ok = true;

            for (const p of path) {
                if (isOccupiedWhite(p) || isOccupiedBlack(p)) {
                    ok = false;
                    break;
                }
            }

            if (ok && !isKingCheck()) {
                for (const check of [61, 62]) {
                    const original = Array.from(squares[check].classList);

                    squares[check].classList.add("king-w");
                    squares[index].classList.remove("king-w");

                    if (isKingCheck()) ok = false;

                    squares[index].classList.add("king-w");
                    squares[check].classList.remove("king-w");

                    for (const c of original) {
                        if (!["square", "light-square", "dark-square"].includes(c)) {
                            squares[check].classList.add(c);
                        }
                    }

                    if (!ok) break;
                }

                if (ok) legalIndexes.push(62);
            }
        }

        // ======================
        //  CASTLING — QUEEN SIDE
        // ======================
        if (!kingHasMoved && !queensideRookHasMoved) {
            const path = [59, 58, 57];
            let ok = true;

            for (const p of path) {
                if (isOccupiedWhite(p) || isOccupiedBlack(p)) {
                    ok = false;
                    break;
                }
            }

            if (ok && !isKingCheck()) {
                for (const check of [59, 58]) {
                    const original = Array.from(squares[check].classList);

                    squares[check].classList.add("king-w");
                    squares[index].classList.remove("king-w");

                    if (isKingCheck()) ok = false;

                    squares[index].classList.add("king-w");
                    squares[check].classList.remove("king-w");

                    for (const c of original) {
                        if (!["square", "light-square", "dark-square"].includes(c)) {
                            squares[check].classList.add(c);
                        }
                    }

                    if (!ok) break;
                }

                if (ok) legalIndexes.push(58);
            }
        }
    }

    return legalIndexes;
}

function MovePiece(chess_note: string): void {
    const previous = chess_note.slice(0, 2);  // pl. "e2"
    const move = chess_note.slice(2, 4);      // pl. "e4"

    let fromSquare: HTMLDivElement | null = null;
    let toSquare: HTMLDivElement | null = null;

    // -------------------------
    //  Keresés algebrai notáció alapján
    // -------------------------
    for (let i = 0; i < squares.length; i++) {
        const note = indexToNote(i).toLowerCase();
        if (note === previous) fromSquare = squares[i];
        if (note === move) toSquare = squares[i];
    }

    if (!fromSquare || !toSquare) {
        console.error("MovePiece error: square not found:", chess_note);
        return;
    }

    // -------------------------
    //  Lépő bábu meghatározása
    // -------------------------
    const fromClasses = Array.from(fromSquare.classList);
    const pieceClass = fromClasses.find(c =>
        c.startsWith("pawn-") ||
        c.startsWith("rook-") ||
        c.startsWith("knight-") ||
        c.startsWith("bishop-") ||
        c.startsWith("queen-") ||
        c.startsWith("king-")
    );

    if (!pieceClass) {
        console.error("MovePiece error: no piece on source square", fromSquare);
        return;
    }

    // -------------------------
    //  50-move rule reset
    // -------------------------
    if (pieceClass.startsWith("pawn")) {
        halfmoveClock = 0;
    } else {
        halfmoveClock += 1;
    }

    // -------------------------
    //  Célmező: ha ellenséges bábu van, töröljük
    // -------------------------
    const toClasses = Array.from(toSquare.classList);
    const targetPieceClass = toClasses.find(c =>
        c.startsWith("pawn-") ||
        c.startsWith("rook-") ||
        c.startsWith("knight-") ||
        c.startsWith("bishop-") ||
        c.startsWith("queen-") ||
        c.startsWith("king-")
    );

    if (targetPieceClass) {
        toSquare.classList.remove(targetPieceClass);
    }

    // -------------------------
    //  A bábu áthelyezése
    // -------------------------
    // 1. célmezőre rakjuk
    toSquare.classList.add("piece");
    toSquare.classList.add(pieceClass);

    // 2. forrás mezőről eltávolítjuk
    fromSquare.classList.remove("piece");
    fromSquare.classList.remove(pieceClass);
}

function getFen(): string {
    let fen = "";
    let emptyCount = 0;

    // ----------------------------------------
    //  1. TÁBLÁN VÉGIGMENNI, BÁBUK → FEN betűk
    // ----------------------------------------
    for (let i = 0; i < 64; i++) {
        const square = squares[i];
        const classes = Array.from(square.classList);

        // megtaláljuk a bábu classát
        const pieceClass = classes.find(c =>
            c.startsWith("pawn-") ||
            c.startsWith("rook-") ||
            c.startsWith("knight-") ||
            c.startsWith("bishop-") ||
            c.startsWith("queen-") ||
            c.startsWith("king-")
        );

        if (pieceClass) {
            // előző üres mezők számlálójának kiírása
            if (emptyCount > 0) {
                fen += emptyCount;
                emptyCount = 0;
            }

            // bábu FEN betű leképezés
            const [piece, color] = pieceClass.split("-");
            const map: Record<string, string> = {
                pawn: "p",
                rook: "r",
                knight: "n",
                bishop: "b",
                queen: "q",
                king: "k"
            };

            const base = map[piece];
            fen += (color === "w") ? base.toUpperCase() : base.toLowerCase();
        } else {
            emptyCount++;
        }

        // sor vége → / hozzáadása
        if ((i + 1) % 8 === 0) {
            if (emptyCount > 0) {
                fen += emptyCount;
                emptyCount = 0;
            }
            if (i !== 63) fen += "/";
        }
    }

    // ----------------------------------------
    //  2. CASTLING JOGOK MEGHATÁROZÁSA
    // ----------------------------------------

    let castling = "";

    // fehér
    const whiteKingOnE1 = squares[60].classList.contains("king-w");
    const whiteRookA1 = squares[56].classList.contains("rook-w");
    const whiteRookH1 = squares[63].classList.contains("rook-w");

    if (whiteKingOnE1 && whiteRookH1) castling += "K";
    if (whiteKingOnE1 && whiteRookA1) castling += "Q";

    // fekete
    const blackKingOnE8 = squares[4].classList.contains("king-b");
    const blackRookA8 = squares[0].classList.contains("rook-b");
    const blackRookH8 = squares[7].classList.contains("rook-b");

    if (blackKingOnE8 && blackRookH8) castling += "k";
    if (blackKingOnE8 && blackRookA8) castling += "q";

    if (castling === "") castling = "-";

    // ----------------------------------------
    //  3. FEN összefűzése
    // ----------------------------------------
    const sideToMove = isWhiteMoves ? "w" : "b";
    const enPassant = "-"; // jelenleg nincs implementálva
    const fenString = `${fen} ${sideToMove} ${castling} ${enPassant} ${halfmoveClock} ${fullmoveNumber}`;

    console.log("FEN:", fenString);
    return fenString;
}


function isKingCheck(): boolean {
    // --------------------------------------------------
    // 1. Megkeressük a fehér király pozícióját
    // --------------------------------------------------
    let kingIndex = -1;

    for (let i = 0; i < squares.length; i++) {
        if (squares[i].classList.contains("king-w")) {
            kingIndex = i;
            break;
        }
    }

    if (kingIndex === -1) {
        console.error("HIBA: A fehér király nem található!");
        return false;
    }

    const kingRow = Math.floor(kingIndex / 8);
    const kingCol = kingIndex % 8;

    // Segédfüggvény
    const inBounds = (i: number) => i >= 0 && i < 64;
    const occupiedByBlack = (i: number) =>
        squares[i].classList.contains("piece") &&
        Array.from(squares[i].classList).some(c => c.endsWith("-b"));

    const getPieceClass = (i: number): string | null => {
        const found = Array.from(squares[i].classList).find(c =>
            c.startsWith("pawn-") ||
            c.startsWith("rook-") ||
            c.startsWith("knight-") ||
            c.startsWith("bishop-") ||
            c.startsWith("queen-") ||
            c.startsWith("king-")
        );
        return found ?? null;
    };

    // --------------------------------------------------
    // 2. GYALOGTÁMADÁSOK (fekete gyalog)
    // --------------------------------------------------
    const pawnAttacks = [-7, -9]; // feketék lefelé támadnak

    for (const off of pawnAttacks) {
        const t = kingIndex + off;
        if (!inBounds(t)) continue;

        const row = Math.floor(t / 8);
        const colDiff = Math.abs((t % 8) - kingCol);

        // diag ellenőrzés (ne ugorjon át sorban)
        if (Math.abs(row - kingRow) === 1 && colDiff === 1) {
            if (squares[t].classList.contains("pawn-b")) return true;
        }
    }

    // --------------------------------------------------
    // 3. LÓ TÁMADÁSOK (fekete ló)
    // --------------------------------------------------
    const knightOffsets = [-17, -15, -10, -6, 6, 10, 15, 17];

    for (const off of knightOffsets) {
        const t = kingIndex + off;
        if (!inBounds(t)) continue;

        const tr = Math.floor(t / 8);
        const tc = t % 8;

        const dr = Math.abs(tr - kingRow);
        const dc = Math.abs(tc - kingCol);

        if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
            if (squares[t].classList.contains("knight-b")) return true;
        }
    }

    // --------------------------------------------------
    // 4. FUTÓ / VEZÉR DIAGONÁLIS TÁMADÁSOK
    // --------------------------------------------------
    const bishopDirs = [-9, -7, 7, 9];

    for (const dir of bishopDirs) {
        let pos = kingIndex + dir;

        while (inBounds(pos)) {
            // ha sor elcsúszott → megáll
            const prevCol = (pos - dir) % 8;
            const curCol = pos % 8;
            if (Math.abs(prevCol - curCol) !== 1) break;

            const piece = getPieceClass(pos);
            if (piece) {
                if (piece === "bishop-b" || piece === "queen-b") return true;
                break;
            }

            pos += dir;
        }
    }

    // --------------------------------------------------
    // 5. BÁSTYA / VEZÉR EGYENES TÁMADÁSOK
    // --------------------------------------------------
    const rookDirs = [-8, 8, -1, 1];

    for (const dir of rookDirs) {
        let pos = kingIndex + dir;

        while (inBounds(pos)) {
            // vízszintesnél sorváltás ellenőrzés
            if ((dir === 1 || dir === -1) && Math.floor(pos / 8) !== kingRow)
                break;

            const piece = getPieceClass(pos);
            if (piece) {
                if (piece === "rook-b" || piece === "queen-b") return true;
                break;
            }

            pos += dir;
        }
    }

    // --------------------------------------------------
    // 6. KIRÁLY TÁMADÁSOK (fekete király)
    // --------------------------------------------------
    const kingMoves = [-9, -8, -7, -1, 1, 7, 8, 9];

    for (const off of kingMoves) {
        const t = kingIndex + off;
        if (!inBounds(t)) continue;

        const tr = Math.floor(t / 8);
        const tc = t % 8;

        if (Math.abs(tr - kingRow) <= 1 && Math.abs(tc - kingCol) <= 1) {
            if (squares[t].classList.contains("king-b")) return true;
        }
    }

    return false;
}


function isCheck(squareIndex: number, isWhite: boolean): boolean {
    const inBounds = (i: number) => i >= 0 && i < 64;

    const squareRow = Math.floor(squareIndex / 8);
    const squareCol = squareIndex % 8;

    const getPieceClass = (i: number): string | null => {
        const found = Array.from(squares[i].classList).find(c =>
            c.startsWith("pawn-") ||
            c.startsWith("rook-") ||
            c.startsWith("knight-") ||
            c.startsWith("bishop-") ||
            c.startsWith("queen-") ||
            c.startsWith("king-")
        );
        return found ?? null;
    };

    const enemyColor = isWhite ? "-b" : "-w";

    // --------------------------------------------------
    // 1. Pawn támadások
    // --------------------------------------------------
    const pawnOffsets = isWhite ? [7, 9] : [-7, -9];

    for (const off of pawnOffsets) {
        const t = squareIndex + off;
        if (!inBounds(t)) continue;

        const tr = Math.floor(t / 8);
        const colDiff = Math.abs((t % 8) - squareCol);

        if (Math.abs(tr - squareRow) === 1 && colDiff === 1) {
            if (squares[t].classList.contains(`pawn${enemyColor}`)) return true;
        }
    }

    // --------------------------------------------------
    // 2. Knight támadás
    // --------------------------------------------------
    const knightOffsets = [-17, -15, -10, -6, 6, 10, 15, 17];

    for (const off of knightOffsets) {
        const t = squareIndex + off;
        if (!inBounds(t)) continue;

        const tr = Math.floor(t / 8);
        const tc = t % 8;

        const dr = Math.abs(tr - squareRow);
        const dc = Math.abs(tc - squareCol);

        if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
            if (squares[t].classList.contains(`knight${enemyColor}`)) return true;
        }
    }

    // --------------------------------------------------
    // 3. Bishop / Queen – diagonális sugarak
    // --------------------------------------------------
    const bishopDirs = [-9, -7, 7, 9];

    for (const dir of bishopDirs) {
        let pos = squareIndex + dir;

        while (inBounds(pos)) {
            const prevCol = (pos - dir) % 8;
            const currCol = pos % 8;

            if (Math.abs(prevCol - currCol) !== 1) break;

            const piece = getPieceClass(pos);
            if (piece) {
                if (piece === `bishop${enemyColor}` || piece === `queen${enemyColor}`) {
                    return true;
                }
                break;
            }

            pos += dir;
        }
    }

    // --------------------------------------------------
    // 4. Rook / Queen – egyenes sugarak
    // --------------------------------------------------
    const rookDirs = [-8, 8, -1, 1];

    for (const dir of rookDirs) {
        let pos = squareIndex + dir;

        while (inBounds(pos)) {
            if ((dir === 1 || dir === -1) && Math.floor(pos / 8) !== squareRow)
                break;

            const piece = getPieceClass(pos);
            if (piece) {
                if (piece === `rook${enemyColor}` || piece === `queen${enemyColor}`) {
                    return true;
                }
                break;
            }

            pos += dir;
        }
    }

    // --------------------------------------------------
    // 5. King támadás (szomszédos 8 mező)
    // --------------------------------------------------
    const kingOffsets = [-9, -8, -7, -1, 1, 7, 8, 9];

    for (const off of kingOffsets) {
        const t = squareIndex + off;
        if (!inBounds(t)) continue;

        const tr = Math.floor(t / 8);
        const tc = t % 8;

        if (Math.abs(tr - squareRow) <= 1 && Math.abs(tc - squareCol) <= 1) {
            if (squares[t].classList.contains(`king${enemyColor}`)) return true;
        }
    }

    return false;
}

function setupClickHandler() {
    for (let i = 0; i < squares.length; i++) {
        squares[i].addEventListener("click", () => handleSquareClick(i));
    }
}

let selectedIndex: number | null = null;
let legalMoves: number[] = [];


function handleSquareClick(index: number): void {
    const square = squares[index];

    // 1) --- Ha nincs kijelölés és rákattintunk egy bábura ---
    if (selectedIndex === null) {
        const piece = getPieceOn(index);
        if (!piece) return;

        selectedIndex = index;

        square.classList.add("highlighted");

        legalMoves = getLegals(piece, index);

        highlightLegals(legalMoves);

        return;
    }

    // 2) --- Ha ugyanarra kattintunk: kijelölés törlése ---
    if (selectedIndex === index) {
        clearHighlights();
        selectedIndex = null;
        legalMoves = [];
        return;
    }

    // 3) --- Ha érvényes lépés ---
    if (legalMoves.includes(index)) {
        makeMove(selectedIndex, index);
        clearHighlights();
        selectedIndex = null;
        legalMoves = [];

        const fen = getFen();

        getBestMove(fen)
            .then((moveNote) => {
                MovePiece(moveNote);
                fullmoveNumber++;
            })
            .catch(() => alert("A szerver nem működik :("));

        Quotes();
        return;
    }

    // 4) --- Ha érvénytelen mezőre kattintunk: kijelölés visszaáll ---
    clearHighlights();
    selectedIndex = null;
    legalMoves = [];
}

function getPieceOn(index: number): string | null {
    const sq = squares[index];
    const piece = Array.from(sq.classList).find(c =>
        c.startsWith("pawn-") ||
        c.startsWith("rook-") ||
        c.startsWith("knight-") ||
        c.startsWith("bishop-") ||
        c.startsWith("queen-") ||
        c.startsWith("king-")
    );
    return piece ?? null;
}

function highlightLegals(list: number[]): void {
    for (const i of list) {
        squares[i].classList.add("legalMove");
    }
}

function clearHighlights(): void {
    document.querySelectorAll(".legalMove").forEach(sq =>
        sq.classList.remove("legalMove")
    );
    document.querySelectorAll(".highlighted").forEach(sq =>
        sq.classList.remove("highlighted")
    );
}

function makeMove(from: number, to: number): void {
    const fromSq = squares[from];
    const toSq = squares[to];

    const piece = getPieceOn(from);
    if (!piece) return;

    const isPawn = piece.startsWith("pawn");
    const isRook = piece.startsWith("rook");
    const isKing = piece.startsWith("king");

    // --- Halfmove clock ---
    halfmoveClock = isPawn ? 0 : halfmoveClock + 1;

    // --- Sáncolás jelzők ---
    if (isRook && from === 63) kingsideRookHasMoved = true;
    if (isRook && from === 56) queensideRookHasMoved = true;
    if (isKing) kingHasMoved = true;

    // --- Castling move fix ---
    if (isKing && to === 62) MovePiece("h1f1");
    if (isKing && to === 58) MovePiece("a1d1");

    // --- Tisztességes class mozgatás ---
    const oldTargetPiece = getPieceOn(to);
    if (oldTargetPiece) {
        toSq.classList.remove(oldTargetPiece);
    }

    toSq.classList.add(piece);
    fromSq.classList.remove(piece);
}

function highlightSquare(index: number): void {
    squares[index].classList.add("highlighted");
}

function highlightLegalMoves(legalMoves: number[]): void {
    for (const idx of legalMoves) {
        squares[idx].classList.add("legalMove");
    }
}

function clearHighlights(): void {
    document.querySelectorAll(".highlighted")
        .forEach(el => el.classList.remove("highlighted"));

    document.querySelectorAll(".legalMove")
        .forEach(el => el.classList.remove("legalMove"));
}

function getPieceClass(index: number): string | null {
    const classes = Array.from(squares[index].classList);
    const found = classes.find(c =>
        c.startsWith("pawn-") ||
        c.startsWith("rook-") ||
        c.startsWith("knight-") ||
        c.startsWith("bishop-") ||
        c.startsWith("queen-") ||
        c.startsWith("king-")
    );
    return found ?? null;
}

if (selectedIndex === null) {
    const piece = getPieceClass(index);
    if (!piece) return;

    selectedIndex = index;

    highlightSquare(index);

    legalMoves = getLegals(piece, index);  // ez marad a te eredeti logikád
    highlightLegalMoves(legalMoves);

    return;
}

clearHighlights();
selectedIndex = null;
legalMoves = [];

function MovePiece(move: string): void {
    const fromNote = move.slice(0, 2);
    const toNote = move.slice(2, 4);

    let fromIndex: number | null = null;
    let toIndex: number | null = null;

    // --- Find squares by notation ---
    for (let i = 0; i < 64; i++) {
        if (indexToNote(i).toLowerCase() === fromNote) fromIndex = i;
        if (indexToNote(i).toLowerCase() === toNote)   toIndex = i;
    }

    if (fromIndex === null || toIndex === null) {
        console.error("MovePiece() error: invalid square", move);
        return;
    }

    const fromSq = squares[fromIndex];
    const toSq = squares[toIndex];

    // --- Identify piece on from-square ---
    const piece = getPieceClass(fromIndex);
    if (!piece) return; // nothing to move

    const isPawn = piece.startsWith("pawn");
    const isKing = piece.startsWith("king");
    const isRook = piece.startsWith("rook");

    // ---------- Halfmove Clock ----------
    halfmoveClock = isPawn ? 0 : halfmoveClock + 1;

    // ---------- Update castling flags ----------
    if (isRook && fromIndex === 63) kingsideRookHasMoved = true;
    if (isRook && fromIndex === 56) queensideRookHasMoved = true;
    if (isKing) kingHasMoved = true;

    // ---------- Remove captured piece ----------
    const targetPiece = getPieceClass(toIndex);
    if (targetPiece) {
        toSq.classList.remove(targetPiece);
    }

    // ---------- Move actual piece ----------
    fromSq.classList.remove(piece);
    toSq.classList.add(piece);

    // ---------- Special: castling ----------
    if (isKing && fromNote === "e1" && toNote === "g1") {
        // White short castle
        MovePiece("h1f1");
    }
    if (isKing && fromNote === "e1" && toNote === "c1") {
        // White long castle
        MovePiece("a1d1");
    }

    // (Black castle is később ugyanígy hozzáadható)
}

MovePiece(bestMoveString);

// White castle rights
let kingHasMoved = false;
let kingsideRookHasMoved = false;   // rook on h1
let queensideRookHasMoved = false;  // rook on a1


function updateCastlingRights(fromIndex: number, piece: string): void {
    if (piece.startsWith("king")) {
        kingHasMoved = true;
        return;
    }

    if (piece.startsWith("rook")) {
        if (fromIndex === 63) kingsideRookHasMoved = true;   // h1
        if (fromIndex === 56) queensideRookHasMoved = true;  // a1
    }
}

updateCastlingRights(fromIndex, piece);

function canCastleKingside(): boolean {
    if (kingHasMoved || kingsideRookHasMoved) return false;

    // f1, g1 mezőknek üresnek kell lennie
    if (getPieceClass(61) || getPieceClass(62)) return false;

    // Király nem lehet sakkban, és nem léphet sakkba
    if (isCheck(60, true)) return false;
    if (isCheck(61, true)) return false;
    if (isCheck(62, true)) return false;

    return true;
}

function canCastleQueenside(): boolean {
    if (kingHasMoved || queensideRookHasMoved) return false;

    // bástyáig vezető utak: d1(59), c1(58), b1(57)
    if (getPieceClass(59) || getPieceClass(58) || getPieceClass(57)) return false;

    if (isCheck(60, true)) return false;
    if (isCheck(59, true)) return false;
    if (isCheck(58, true)) return false;

    return true;
}


function applyCastlingIfNeeded(fromNote: string, toNote: string): void {

    // White short castle (e1 → g1)
    if (fromNote === "e1" && toNote === "g1") {
        MovePiece("h1f1");
    }

    // White long castle (e1 → c1)
    if (fromNote === "e1" && toNote === "c1") {
        MovePiece("a1d1");
    }
}

applyCastlingIfNeeded(fromNote, toNote);


/**
 * FEN Generator
 *  - Board állapot alapján készíti el a FEN stringet
 *  - Kezeli a castling jogokat
 *  - Kezeli a fél- és teljes lépés számlálókat
 */

function generateFEN(
    squares: HTMLCollectionOf<Element>, 
    isWhiteTurn: boolean, 
    halfmoveClock: number, 
    fullmoveNumber: number
): string {

    let fen = "";
    let emptyCount = 0;

    for (let i = 0; i < 64; i++) {
        const square = squares[i];
        const pieceClass = Array.from(square.classList).find(c =>
            /pawn-|rook-|knight-|bishop-|queen-|king-/.test(c)
        );

        if (pieceClass) {
            if (emptyCount > 0) {
                fen += emptyCount;
                emptyCount = 0;
            }

            const [piece, color] = pieceClass.split("-");
            const pieceMap: Record<string, string> = {
                pawn: "p",
                rook: "r",
                knight: "n",
                bishop: "b",
                queen: "q",
                king: "k"
            };
            const letter = pieceMap[piece];
            fen += color === "w" ? letter.toUpperCase() : letter.toLowerCase();
        } else {
            emptyCount++;
        }

        // sor vége
        if ((i + 1) % 8 === 0) {
            if (emptyCount > 0) {
                fen += emptyCount;
                emptyCount = 0;
            }
            if (i !== 63) fen += "/";
        }
    }

    // Castling rights
    let castling = "";
    if (!kingHasMoved && !kingsideRookHasMoved) castling += "K";
    if (!kingHasMoved && !queensideRookHasMoved) castling += "Q";
    // Black rights: itt a fekete változatot kell hozzáadni, ha van
    const blackKing = squares[4]?.classList.contains("king-b");
    const blackRookA8 = squares[0]?.classList.contains("rook-b");
    const blackRookH8 = squares[7]?.classList.contains("rook-b");
    if (blackKing && blackRookH8) castling += "k";
    if (blackKing && blackRookA8) castling += "q";

    if (castling === "") castling = "-";

    // Aktuális játékos
    const turn = isWhiteTurn ? "w" : "b";

    // Összerakjuk a teljes FEN stringet
    fen += ` ${turn} ${castling} - ${halfmoveClock} ${fullmoveNumber}`;

    return fen;
}

const fen = generateFEN(squares, isWhiteMoves, halfmoveClock, fullmoveNumber);
console.log("FEN:", fen);

type PieceColor = "w" | "b";
type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

interface Piece {
    type: PieceType;
    color: PieceColor;
}

function getPieceAt(index: number, squares: HTMLCollectionOf<Element>): Piece | null {
    const classes = Array.from(squares[index].classList);
    const pieceClass = classes.find(c => /pawn-|rook-|knight-|bishop-|queen-|king-/.test(c));
    if (!pieceClass) return null;

    const [type, color] = pieceClass.split("-") as [PieceType, PieceColor];
    return { type, color };
}

function isOccupiedByColor(index: number, color: PieceColor, squares: HTMLCollectionOf<Element>): boolean {
    const piece = getPieceAt(index, squares);
    return piece !== null && piece.color === color;
}

function sameRow(a: number, b: number): boolean {
    return Math.floor(a / 8) === Math.floor(b / 8);
}

function getLegals(pieceClass: string, index: number, squares: HTMLCollectionOf<Element>): number[] {
    const legalIndexes: number[] = [];
    const piece = getPieceAt(index, squares);
    if (!piece) return legalIndexes;

    const { type, color } = piece;
    const enemyColor: PieceColor = color === "w" ? "b" : "w";

    // Helper function: simulate move to see if king is in check
    const moveDoesNotCauseCheck = (targetIndex: number): boolean => {
        const originalClasses = Array.from(squares[targetIndex].classList);
        const fromClasses = Array.from(squares[index].classList);

        // Move piece temporarily
        squares[targetIndex].classList.add(...fromClasses.filter(c => c !== "square" && c !== "light-square" && c !== "dark-square"));
        squares[index].classList.remove(...fromClasses.filter(c => c !== "square" && c !== "light-square" && c !== "dark-square"));

        const inCheck = isKingCheck(squares, color);

        // Undo move
        squares[index].classList.add(...fromClasses.filter(c => c !== "square" && c !== "light-square" && c !== "dark-square"));
        squares[targetIndex].classList.remove(...fromClasses.filter(c => c !== "square" && c !== "light-square" && c !== "dark-square"));
        for (const c of originalClasses) {
            if (!["square", "light-square", "dark-square"].includes(c)) squares[targetIndex].classList.add(c);
        }

        return !inCheck;
    };

    if (type === "pawn") {
        const forward = color === "w" ? -8 : 8;
        const startRow = color === "w" ? 6 : 1;
        const oneForward = index + forward;

        if (oneForward >= 0 && oneForward < 64 && !isOccupiedByColor(oneForward, "w", squares) && !isOccupiedByColor(oneForward, "b", squares)) {
            if (moveDoesNotCauseCheck(oneForward)) legalIndexes.push(oneForward);
        }

        const twoForward = index + forward * 2;
        if ((Math.floor(index / 8) === startRow) && !isOccupiedByColor(oneForward, "w", squares) && !isOccupiedByColor(oneForward, "b", squares) &&
            !isOccupiedByColor(twoForward, "w", squares) && !isOccupiedByColor(twoForward, "b", squares)) {
            if (moveDoesNotCauseCheck(twoForward)) legalIndexes.push(twoForward);
        }

        // Pawn captures
        const captures = color === "w" ? [index - 7, index - 9] : [index + 7, index + 9];
        for (const cap of captures) {
            if (cap >= 0 && cap < 64 && !sameRow(cap, index) && isOccupiedByColor(cap, enemyColor, squares)) {
                if (moveDoesNotCauseCheck(cap)) legalIndexes.push(cap);
            }
        }
    }

    // Knight moves
    if (type === "knight") {
        const offsets = [-17, -15, -10, -6, 6, 10, 15, 17];
        const row = Math.floor(index / 8);
        const col = index % 8;
        for (const offset of offsets) {
            const target = index + offset;
            if (target < 0 || target >= 64) continue;
            const targetRow = Math.floor(target / 8);
            const targetCol = target % 8;
            if ((Math.abs(targetRow - row) === 2 && Math.abs(targetCol - col) === 1) ||
                (Math.abs(targetRow - row) === 1 && Math.abs(targetCol - col) === 2)) {
                if (!isOccupiedByColor(target, color, squares) && moveDoesNotCauseCheck(target)) {
                    legalIndexes.push(target);
                }
            }
        }
    }

    // Sliding pieces (bishop, rook, queen)
    const directions: Record<PieceType, number[]> = {
        bishop: [-9, -7, 7, 9],
        rook: [-8, 8, -1, 1],
        queen: [-9, -7, 7, 9, -8, 8, -1, 1],
        king: [-9, -8, -7, -1, 1, 7, 8, 9]
    };

    if (["bishop", "rook", "queen"].includes(type)) {
        for (const dir of directions[type]) {
            let pos = index + dir;
            while (pos >= 0 && pos < 64 && (dir % 8 === 0 || sameRow(pos - dir, pos))) {
                if (isOccupiedByColor(pos, color, squares)) break;
                if (moveDoesNotCauseCheck(pos)) legalIndexes.push(pos);
                if (isOccupiedByColor(pos, enemyColor, squares)) break;
                pos += dir;
            }
        }
    }

    // King moves
    if (type === "king") {
        for (const dir of directions.king) {
            const target = index + dir;
            if (target < 0 || target >= 64) continue;
            if ((dir === -1 || dir === 1) && !sameRow(index, target)) continue;
            if (!isOccupiedByColor(target, color, squares) && moveDoesNotCauseCheck(target)) {
                legalIndexes.push(target);
            }
        }
        // TODO: Castling rights TS-ben (ha nincs király vagy bástya mozdulva)
    }

    return legalIndexes;
}

type PieceColor = "w" | "b";
type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

interface Piece {
    type: PieceType;
    color: PieceColor;
}

function getPieceAt(index: number, squares: HTMLCollectionOf<Element>): Piece | null {
    const classes = Array.from(squares[index].classList);
    const pieceClass = classes.find(c => /pawn-|rook-|knight-|bishop-|queen-|king-/.test(c));
    if (!pieceClass) return null;

    const [type, color] = pieceClass.split("-") as [PieceType, PieceColor];
    return { type, color };
}

// Mozgatja a bábut indexFrom -> indexTo
function movePiece(indexFrom: number, indexTo: number, squares: HTMLCollectionOf<Element>, promoteTo: PieceType = "queen"): void {
    const piece = getPieceAt(indexFrom, squares);
    if (!piece) return;

    // 1️⃣ Törli az előző helyről a bábut
    const fromClasses = Array.from(squares[indexFrom].classList).filter(c => /pawn-|rook-|knight-|bishop-|queen-|king-/.test(c));
    fromClasses.forEach(c => squares[indexFrom].classList.remove(c));

    // 2️⃣ Ütés: ha az új helyen van ellenfél bábu
    const targetPiece = getPieceAt(indexTo, squares);
    if (targetPiece && targetPiece.color !== piece.color) {
        const targetClasses = Array.from(squares[indexTo].classList).filter(c => /pawn-|rook-|knight-|bishop-|queen-|king-/.test(c));
        targetClasses.forEach(c => squares[indexTo].classList.remove(c));
    }

    // 3️⃣ Gyalog előléptetés
    let finalType = piece.type;
    if (piece.type === "pawn" && (Math.floor(indexTo / 8) === 0 || Math.floor(indexTo / 8) === 7)) {
        finalType = promoteTo; // alapértelmezett: vezér
    }

    // 4️⃣ Mozgatás: hozzáadja az új helyhez a bábu osztályát
    squares[indexTo].classList.add(`${finalType}-${piece.color}`);
}


