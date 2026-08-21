// ============================================
// CHECKERS AI ENGINE - Minimax with Alpha-Beta
// ============================================

import { PIECE_TYPES } from './game.js';

export class CheckersAI {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty; // 'easy' or 'hard'
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    // Get best move for specified player ('dark' or 'red')
    getBestMove(game, player = 'dark') {
        const moves = game.validMoves;
        if (!moves || moves.length === 0) return null;

        if (this.difficulty === 'easy') {
            return this.getRandomMove(moves);
        }

        // Hard: Minimax Search
        const depth = 4;
        let bestMove = null;
        let bestScore = -Infinity;

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const simulatedGame = this.cloneAndApplyMove(game, move);
            
            // If in multi-jump, continue evaluating same player
            const nextPlayer = simulatedGame.inMultiJump ? player : (player === 'red' ? 'dark' : 'red');
            
            const score = this.minimax(
                simulatedGame, 
                depth - 1, 
                -Infinity, 
                Infinity, 
                nextPlayer === player, 
                player
            );

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || moves[0];
    }

    getRandomMove(moves) {
        // Prioritize jumps first if available
        const jumps = moves.filter(m => m.isJump);
        if (jumps.length > 0) {
            return jumps[Math.floor(Math.random() * jumps.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    minimax(simulatedGame, depth, alpha, beta, isMaximizing, aiPlayer) {
        if (depth === 0 || simulatedGame.gameOver) {
            return this.evaluateBoard(simulatedGame.board, aiPlayer, simulatedGame.gameOver, simulatedGame.winner);
        }

        const moves = simulatedGame.validMoves;
        if (!moves || moves.length === 0) {
            return this.evaluateBoard(simulatedGame.board, aiPlayer, true, simulatedGame.winner);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                const nextState = this.cloneAndApplyMove(simulatedGame, moves[i]);
                const nextIsMax = nextState.currentPlayer === aiPlayer;
                const evalScore = this.minimax(nextState, depth - 1, alpha, beta, nextIsMax, aiPlayer);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let i = 0; i < moves.length; i++) {
                const nextState = this.cloneAndApplyMove(simulatedGame, moves[i]);
                const nextIsMax = nextState.currentPlayer === aiPlayer;
                const evalScore = this.minimax(nextState, depth - 1, alpha, beta, nextIsMax, aiPlayer);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // Heuristic Board Evaluation
    evaluateBoard(board, aiPlayer, isGameOver = false, winner = null) {
        if (isGameOver) {
            if (winner === aiPlayer) return 10000;
            if (winner !== null) return -10000;
            return 0; // Draw
        }

        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece === PIECE_TYPES.EMPTY) continue;

                const isAi = (aiPlayer === 'dark' && (piece === PIECE_TYPES.DARK || piece === PIECE_TYPES.DARK_KING)) ||
                             (aiPlayer === 'red' && (piece === PIECE_TYPES.RED || piece === PIECE_TYPES.RED_KING));
                
                const mult = isAi ? 1 : -1;

                // Base piece value
                let pieceVal = 10;
                if (piece === PIECE_TYPES.RED_KING || piece === PIECE_TYPES.DARK_KING) {
                    pieceVal = 18;
                }

                // Positional bonuses: central control (Cols 2-5, Rows 2-5)
                let positionBonus = 0;
                if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
                    positionBonus += 1.5;
                }

                // Back-row defender bonus (prevents easy opponent kinging)
                if (aiPlayer === 'dark' && piece === PIECE_TYPES.DARK && r === 7) {
                    positionBonus += 2;
                } else if (aiPlayer === 'red' && piece === PIECE_TYPES.RED && r === 0) {
                    positionBonus += 2;
                }

                // Advancement incentive for regular pieces
                if (piece === PIECE_TYPES.DARK) {
                    positionBonus += (7 - r) * 0.3;
                } else if (piece === PIECE_TYPES.RED) {
                    positionBonus += r * 0.3;
                }

                score += mult * (pieceVal + positionBonus);
            }
        }

        return score;
    }

    // Clone game state to simulate hypothetical move
    cloneAndApplyMove(game, move) {
        // Simple clone structure for simulation
        const simulatedBoard = game.board.map(row => [...row]);
        
        const { fromRow, fromCol, toRow, toCol, isJump, captured } = move;
        let pieceVal = simulatedBoard[fromRow][fromCol];

        simulatedBoard[fromRow][fromCol] = PIECE_TYPES.EMPTY;
        
        let crowned = false;
        if (pieceVal === PIECE_TYPES.RED && toRow === 7) {
            pieceVal = PIECE_TYPES.RED_KING;
            crowned = true;
        } else if (pieceVal === PIECE_TYPES.DARK && toRow === 0) {
            pieceVal = PIECE_TYPES.DARK_KING;
            crowned = true;
        }

        simulatedBoard[toRow][toCol] = pieceVal;

        if (isJump && captured) {
            simulatedBoard[captured.row][captured.col] = PIECE_TYPES.EMPTY;
        }

        let nextPlayer = game.currentPlayer === 'red' ? 'dark' : 'red';
        let inMultiJump = null;

        if (isJump && !crowned) {
            // Check for multi-jump
            const nextJumps = this.getSimulatedJumps(simulatedBoard, toRow, toCol, game.currentPlayer);
            if (nextJumps.length > 0) {
                nextPlayer = game.currentPlayer;
                inMultiJump = { row: toRow, col: toCol };
            }
        }

        // Return light simulated game object
        return {
            board: simulatedBoard,
            currentPlayer: nextPlayer,
            inMultiJump,
            validMoves: this.getSimulatedValidMoves(simulatedBoard, nextPlayer, inMultiJump),
            gameOver: false,
            winner: null
        };
    }

    getSimulatedJumps(board, row, col, player) {
        const piece = board[row][col];
        const isKing = piece === PIECE_TYPES.RED_KING || piece === PIECE_TYPES.DARK_KING;
        let directions = [];
        if (isKing) directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        else if (player === 'red') directions = [[1, -1], [1, 1]];
        else directions = [[-1, -1], [-1, 1]];

        let jumps = [];
        directions.forEach(([dr, dc]) => {
            const nextR = row + dr;
            const nextC = col + dc;
            const jumpR = row + dr * 2;
            const jumpC = col + dc * 2;

            if (
                jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8 &&
                board[jumpR][jumpC] === PIECE_TYPES.EMPTY &&
                board[nextR][nextC] !== PIECE_TYPES.EMPTY &&
                !this.isPiecePlayer(board[nextR][nextC], player)
            ) {
                jumps.push({
                    fromRow: row, fromCol: col,
                    toRow: jumpR, toCol: jumpC,
                    isJump: true,
                    captured: { row: nextR, col: nextC }
                });
            }
        });
        return jumps;
    }

    getSimulatedValidMoves(board, player, inMultiJump) {
        if (inMultiJump) {
            return this.getSimulatedJumps(board, inMultiJump.row, inMultiJump.col, player);
        }
        let moves = [];
        let jumps = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isPiecePlayer(board[r][c], player)) {
                    const m = this.getSimulatedMovesForPiece(board, r, c, player);
                    m.forEach(item => {
                        if (item.isJump) jumps.push(item);
                        else moves.push(item);
                    });
                }
            }
        }
        return jumps.length > 0 ? jumps : moves;
    }

    getSimulatedMovesForPiece(board, row, col, player) {
        const piece = board[row][col];
        const isKing = piece === PIECE_TYPES.RED_KING || piece === PIECE_TYPES.DARK_KING;
        let directions = [];
        if (isKing) directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        else if (player === 'red') directions = [[1, -1], [1, 1]];
        else directions = [[-1, -1], [-1, 1]];

        let moves = [];
        directions.forEach(([dr, dc]) => {
            const nextR = row + dr;
            const nextC = col + dc;

            if (nextR >= 0 && nextR < 8 && nextC >= 0 && nextC < 8 && board[nextR][nextC] === PIECE_TYPES.EMPTY) {
                moves.push({ fromRow: row, fromCol: col, toRow: nextR, toCol: nextC, isJump: false });
            }

            const jumpR = row + dr * 2;
            const jumpC = col + dc * 2;
            if (
                jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8 &&
                board[jumpR][jumpC] === PIECE_TYPES.EMPTY &&
                board[nextR][nextC] !== PIECE_TYPES.EMPTY &&
                !this.isPiecePlayer(board[nextR][nextC], player)
            ) {
                moves.push({ fromRow: row, fromCol: col, toRow: jumpR, toCol: jumpC, isJump: true, captured: { row: nextR, col: nextC } });
            }
        });
        return moves;
    }

    isPiecePlayer(pieceVal, player) {
        if (player === 'red') return pieceVal === PIECE_TYPES.RED || pieceVal === PIECE_TYPES.RED_KING;
        if (player === 'dark') return pieceVal === PIECE_TYPES.DARK || pieceVal === PIECE_TYPES.DARK_KING;
        return false;
    }
}
