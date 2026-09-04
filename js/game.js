// ============================================
// CHECKERS GAME STATE & LOGIC ENGINE
// ============================================

export const PIECE_TYPES = {
    EMPTY: 0,
    RED: 1,
    RED_KING: 2,
    DARK: -1,
    DARK_KING: -2
};

export class CheckersGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'red'; // 'red' or 'dark'
        this.selectedPiece = null;
        this.validMoves = []; // Array of { fromRow, fromCol, toRow, toCol, isJump, captured }
        this.mustJump = false;
        this.inMultiJump = null; // { row, col } if locked in multi-jump
        
        this.history = [];
        this.capturedRed = 0;
        this.capturedDark = 0;
        this.totalMoves = 0;
        this.totalCaptures = 0;
        this.totalKingsCrowned = 0;
        
        this.gameOver = false;
        this.winner = null;
        
        this.reset();
    }

    reset() {
        // Initialize 8x8 board
        this.board = Array(8).fill(null).map(() => Array(8).fill(PIECE_TYPES.EMPTY));
        
        // Place initial pieces on dark squares ((row + col) % 2 === 1)
        // Rows 0 to 2: Dark / Computer pieces at top (aligned with Top Player Card)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = PIECE_TYPES.DARK;
                }
            }
        }
        // Rows 5 to 7: Red / Player pieces at bottom (aligned with Bottom Player Card)
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = PIECE_TYPES.RED;
                }
            }
        }

        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.inMultiJump = null;
        this.history = [];
        this.capturedRed = 0;
        this.capturedDark = 0;
        this.totalMoves = 0;
        this.totalCaptures = 0;
        this.totalKingsCrowned = 0;
        this.gameOver = false;
        this.winner = null;

        this.updateValidMoves();
    }

    // Helper check piece ownership
    isPlayerPiece(val, player) {
        if (player === 'red') return val === PIECE_TYPES.RED || val === PIECE_TYPES.RED_KING;
        if (player === 'dark') return val === PIECE_TYPES.DARK || val === PIECE_TYPES.DARK_KING;
        return false;
    }

    isOpponentPiece(val, player) {
        if (player === 'red') return val === PIECE_TYPES.DARK || val === PIECE_TYPES.DARK_KING;
        if (player === 'dark') return val === PIECE_TYPES.RED || val === PIECE_TYPES.RED_KING;
        return false;
    }

    isKing(val) {
        return val === PIECE_TYPES.RED_KING || val === PIECE_TYPES.DARK_KING;
    }

    // Calculate all legal moves for current player
    getAllLegalMoves(player = this.currentPlayer, board = this.board) {
        let moves = [];
        let jumps = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (this.isPlayerPiece(piece, player)) {
                    const pieceMoves = this.getPieceMoves(r, c, board, player);
                    pieceMoves.forEach(m => {
                        if (m.isJump) jumps.push(m);
                        else moves.push(m);
                    });
                }
            }
        }

        // Forced Jump Rule: if any jump exists, ONLY jumps are allowed!
        if (jumps.length > 0) {
            return { moves: jumps, mustJump: true };
        }
        return { moves: moves, mustJump: false };
    }

    // Get moves for a specific piece
    getPieceMoves(row, col, board = this.board, player = this.currentPlayer) {
        const piece = board[row][col];
        if (!this.isPlayerPiece(piece, player)) return [];

        let moves = [];
        const isKing = this.isKing(piece);
        
        // Directions: Red piece moves UP (-1), Dark piece moves DOWN (+1), King both (±1)
        let directions = [];
        if (isKing) {
            directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        } else if (player === 'red') {
            directions = [[-1, -1], [-1, 1]];
        } else {
            directions = [[1, -1], [1, 1]];
        }

        // Check single diagonal steps and jump steps
        directions.forEach(([dr, dc]) => {
            const nextR = row + dr;
            const nextC = col + dc;

            // Simple 1-step move
            if (this.isValidCell(nextR, nextC) && board[nextR][nextC] === PIECE_TYPES.EMPTY) {
                moves.push({
                    fromRow: row,
                    fromCol: col,
                    toRow: nextR,
                    toCol: nextC,
                    isJump: false,
                    captured: null
                });
            }

            // 2-step Jump over opponent
            const jumpR = row + dr * 2;
            const jumpC = col + dc * 2;

            if (
                this.isValidCell(jumpR, jumpC) &&
                board[jumpR][jumpC] === PIECE_TYPES.EMPTY &&
                this.isOpponentPiece(board[nextR][nextC], player)
            ) {
                moves.push({
                    fromRow: row,
                    fromCol: col,
                    toRow: jumpR,
                    toCol: jumpC,
                    isJump: true,
                    captured: { row: nextR, col: nextC, piece: board[nextR][nextC] }
                });
            }
        });

        return moves;
    }

    isValidCell(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    updateValidMoves() {
        if (this.inMultiJump) {
            // Locked in multi-jump sequence for the specific piece
            const pieceMoves = this.getPieceMoves(this.inMultiJump.row, this.inMultiJump.col);
            const jumps = pieceMoves.filter(m => m.isJump);
            this.validMoves = jumps;
            this.mustJump = true;
            return;
        }

        const { moves, mustJump } = this.getAllLegalMoves();
        this.validMoves = moves;
        this.mustJump = mustJump;

        // Check game over (no legal moves left)
        if (this.validMoves.length === 0) {
            this.gameOver = true;
            this.winner = this.currentPlayer === 'red' ? 'dark' : 'red';
        }
    }

    selectSquare(row, col) {
        if (this.gameOver) return { type: 'INVALID' };

        const piece = this.board[row][col];

        // If in multi-jump, user can only interact with the multi-jump piece
        if (this.inMultiJump) {
            if (row === this.inMultiJump.row && col === this.inMultiJump.col) {
                this.selectedPiece = { row, col };
                return { type: 'SELECTED', row, col };
            }
            // Check if user clicked a valid multi-jump destination
            const move = this.validMoves.find(m => 
                m.fromRow === this.inMultiJump.row && 
                m.fromCol === this.inMultiJump.col &&
                m.toRow === row && 
                m.toCol === col
            );
            if (move) {
                return this.makeMove(move);
            }
            return { type: 'INVALID' };
        }

        // Standard piece selection
        if (this.isPlayerPiece(piece, this.currentPlayer)) {
            // If mustJump is active, ensure this piece has a jump move available!
            const pieceHasValidMove = this.validMoves.some(m => m.fromRow === row && m.fromCol === col);
            if (pieceHasValidMove) {
                this.selectedPiece = { row, col };
                return { type: 'SELECTED', row, col };
            } else {
                return { type: 'MUST_JUMP_OTHER_PIECE' };
            }
        }

        // If a piece was selected and an empty square clicked, try executing move
        if (this.selectedPiece && piece === PIECE_TYPES.EMPTY) {
            const move = this.validMoves.find(m => 
                m.fromRow === this.selectedPiece.row && 
                m.fromCol === this.selectedPiece.col && 
                m.toRow === row && 
                m.toCol === col
            );
            if (move) {
                return this.makeMove(move);
            }
        }

        this.selectedPiece = null;
        return { type: 'DESELECTED' };
    }

    makeMove(move) {
        // Save state for Undo history
        this.saveHistoryState();

        const { fromRow, fromCol, toRow, toCol, isJump, captured } = move;
        let pieceVal = this.board[fromRow][fromCol];

        // Move piece
        this.board[fromRow][fromCol] = PIECE_TYPES.EMPTY;
        
        // Check for King promotion
        let crowned = false;
        if (!this.isKing(pieceVal)) {
            if (this.currentPlayer === 'red' && toRow === 0) {
                pieceVal = PIECE_TYPES.RED_KING;
                crowned = true;
                this.totalKingsCrowned++;
            } else if (this.currentPlayer === 'dark' && toRow === 7) {
                pieceVal = PIECE_TYPES.DARK_KING;
                crowned = true;
                this.totalKingsCrowned++;
            }
        }
        this.board[toRow][toCol] = pieceVal;

        // Handle capture
        if (isJump && captured) {
            this.board[captured.row][captured.col] = PIECE_TYPES.EMPTY;
            if (this.currentPlayer === 'red') this.capturedDark++;
            else this.capturedRed++;
            this.totalCaptures++;
        }

        this.totalMoves++;

        // Multi-jump check (only if captured and piece was NOT just crowned into a King)
        if (isJump && !crowned) {
            const subsequentJumps = this.getPieceMoves(toRow, toCol).filter(m => m.isJump);
            if (subsequentJumps.length > 0) {
                this.inMultiJump = { row: toRow, col: toCol };
                this.selectedPiece = { row: toRow, col: toCol };
                this.updateValidMoves();
                return {
                    type: 'MULTI_JUMP_CONTINUE',
                    move,
                    crowned,
                    inMultiJump: true
                };
            }
        }

        // Reset multi-jump and switch turn
        this.inMultiJump = null;
        this.selectedPiece = null;
        this.currentPlayer = this.currentPlayer === 'red' ? 'dark' : 'red';
        this.updateValidMoves();

        // Check if game over after turn switch
        this.checkWinCondition();

        return {
            type: 'MOVE_COMPLETED',
            move,
            crowned,
            gameOver: this.gameOver,
            winner: this.winner
        };
    }

    checkWinCondition() {
        let redCount = 0;
        let darkCount = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const val = this.board[r][c];
                if (this.isPlayerPiece(val, 'red')) redCount++;
                if (this.isPlayerPiece(val, 'dark')) darkCount++;
            }
        }

        if (redCount === 0) {
            this.gameOver = true;
            this.winner = 'dark';
        } else if (darkCount === 0) {
            this.gameOver = true;
            this.winner = 'red';
        } else if (this.validMoves.length === 0) {
            this.gameOver = true;
            this.winner = this.currentPlayer === 'red' ? 'dark' : 'red';
        }
    }

    saveHistoryState() {
        this.history.push({
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            capturedRed: this.capturedRed,
            capturedDark: this.capturedDark,
            totalMoves: this.totalMoves,
            totalCaptures: this.totalCaptures,
            totalKingsCrowned: this.totalKingsCrowned
        });
    }

    undo() {
        if (this.history.length === 0) return false;
        
        const lastState = this.history.pop();
        this.board = lastState.board.map(row => [...row]);
        this.currentPlayer = lastState.currentPlayer;
        this.capturedRed = lastState.capturedRed;
        this.capturedDark = lastState.capturedDark;
        this.totalMoves = lastState.totalMoves;
        this.totalCaptures = lastState.totalCaptures;
        this.totalKingsCrowned = lastState.totalKingsCrowned;
        this.inMultiJump = null;
        this.selectedPiece = null;
        this.gameOver = false;
        this.winner = null;

        this.updateValidMoves();
        return true;
    }

    getPieceCount() {
        let red = 0;
        let dark = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (this.isPlayerPiece(piece, 'red')) red++;
                if (this.isPlayerPiece(piece, 'dark')) dark++;
            }
        }
        return { red, dark };
    }
}
