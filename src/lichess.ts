interface ChessApiResponse{
    move: string,
    fen : string
}

async function getPostApichess(data : Record<string, unknown> = {}): Promise<ChessApiResponse> {
    const response = await fetch("https://chess-api.com/v1", {
        method : "POST",
        headers : {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    });
    if (!response.ok){
        throw new Error("Nem működik");
    }
    return response.json() as Promise<ChessApiResponse>
}

export async function getBestMove(fen: string): Promise<string | null>{
    try{
        const data  = await getPostApichess({fen})
        const bestmove = data.move ?? null;

        console.log(`bestMove: ${bestmove}`)
        return bestmove;
    }catch(err){
        console.error("Hiba a bestMoveban", err)
        return null
    }
}

getBestMove("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")