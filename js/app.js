// ============================================
// CHECKERS MASTER - MAIN APPLICATION ENTRY
// ============================================

import { CheckersGame } from './game.js';
import { CheckersUI } from './ui.js';
import { CheckersAI } from './ai.js';
import { audio } from './audio.js';

class App {
    constructor() {
        this.game = new CheckersGame();
        this.ui = new CheckersUI(this.game);
        this.ai = new CheckersAI('easy');
        this.mode = 'ai-easy'; // 'pvp', 'ai-easy', 'ai-hard'
        this.mandatoryJump = true; // true: forced jumps/multi-jumps, false: optional
        this.isAiProcessing = false;
        this.isAnimating = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.ui.showHomeScreen();
        console.log('👑 Checkers Master Mobile Edition initialized!');
    }

    bindEvents() {
        // UI Square Click Handler
        this.ui.onSquareClick = (row, col) => {
            this.handleSquareClick(row, col);
        };

        // UI Piece Drop (Touch Drag & Drop)
        this.ui.onPieceDrop = (fromRow, fromCol, toRow, toCol) => {
            this.handlePieceDrop(fromRow, fromCol, toRow, toCol);
        };

        // Home Screen Mode Option Cards
        const modeCards = document.querySelectorAll('.mode-card');
        modeCards.forEach(card => {
            card.addEventListener('click', () => {
                modeCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.mode = card.dataset.mode;
                if (this.mode.startsWith('ai')) {
                    this.ai.setDifficulty(this.mode === 'ai-hard' ? 'hard' : 'easy');
                }
                audio.playSelect();
                audio.triggerHaptic(15);
            });
        });

        // Home Screen Theme Pills
        const themePills = document.querySelectorAll('.theme-pill');
        themePills.forEach(pill => {
            pill.addEventListener('click', () => {
                themePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const themeName = pill.dataset.theme;
                document.body.className = `theme-${themeName} ${document.body.classList.contains('screen-game') ? 'screen-game' : 'screen-home'}`;
                audio.playSelect();
                audio.triggerHaptic(15);
            });
        });

        // Start Game Button
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startNewGame();
                this.ui.showGameScreen();
                audio.playSelect();
                audio.triggerHaptic(25);
            });
        }

        // Back To Home Menu Button
        const backToHomeBtn = document.getElementById('backToHomeBtn');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                this.ui.showHomeScreen();
                audio.playSelect();
                audio.triggerHaptic(15);
            });
        }

        // Sound & Music Toggle Buttons (Home & Game Header)
        const homeSoundToggleBtn = document.getElementById('homeSoundToggleBtn');
        const gameSoundToggleBtn = document.getElementById('gameSoundToggleBtn');
        const homeMusicToggleBtn = document.getElementById('homeMusicToggleBtn');
        const gameMusicToggleBtn = document.getElementById('gameMusicToggleBtn');
        
        const updateSoundIcons = (enabled) => {
            const iconHref = enabled ? '#icon-volume-on' : '#icon-volume-off';
            const homeIcon = document.querySelector('#homeSoundIcon use');
            const gameIcon = document.querySelector('#gameSoundIcon use');
            if (homeIcon) homeIcon.setAttribute('href', iconHref);
            if (gameIcon) gameIcon.setAttribute('href', iconHref);
        };

        const updateMusicIcons = (enabled) => {
            const iconHref = enabled ? '#icon-music' : '#icon-music-off';
            const homeIcon = document.querySelector('#homeMusicIcon use');
            const gameIcon = document.querySelector('#gameMusicIcon use');
            if (homeIcon) homeIcon.setAttribute('href', iconHref);
            if (gameIcon) gameIcon.setAttribute('href', iconHref);
        };

        const toggleSoundAction = () => {
            const enabled = audio.toggleSound();
            updateSoundIcons(enabled);
            audio.triggerHaptic(15);
        };

        const toggleMusicAction = () => {
            const enabled = audio.toggleMusic();
            updateMusicIcons(enabled);
            audio.triggerHaptic(15);
        };

        if (homeSoundToggleBtn) homeSoundToggleBtn.addEventListener('click', toggleSoundAction);
        if (gameSoundToggleBtn) gameSoundToggleBtn.addEventListener('click', toggleSoundAction);
        if (homeMusicToggleBtn) homeMusicToggleBtn.addEventListener('click', toggleMusicAction);
        if (gameMusicToggleBtn) gameMusicToggleBtn.addEventListener('click', toggleMusicAction);

        // How to Play / Rules Buttons (Home & In-Game Header)
        const homeRulesBtn = document.getElementById('homeRulesBtn');
        const gameRulesBtn = document.getElementById('gameRulesBtn');

        const openRulesAction = () => {
            this.ui.showHowToPlayModal('basics');
            audio.playSelect();
            audio.triggerHaptic(20);
        };

        if (homeRulesBtn) homeRulesBtn.addEventListener('click', openRulesAction);
        if (gameRulesBtn) gameRulesBtn.addEventListener('click', openRulesAction);

        // Restart Game Button
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.startNewGame();
                audio.triggerHaptic(20);
            });
        }

        // Modal Play Again & Home Buttons
        const modalPlayAgainBtn = document.getElementById('modalPlayAgainBtn');
        if (modalPlayAgainBtn) {
            modalPlayAgainBtn.addEventListener('click', () => {
                this.ui.hideWinModal();
                this.startNewGame();
                audio.triggerHaptic(25);
            });
        }

        const modalHomeBtn = document.getElementById('modalHomeBtn');
        if (modalHomeBtn) {
            modalHomeBtn.addEventListener('click', () => {
                this.ui.hideWinModal();
                this.ui.showHomeScreen();
                audio.triggerHaptic(15);
            });
        }

        // Undo Button
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undoMove());
        }

        // Hint Button
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.showHint());
        }

        // Mandatory Jumps / Forced Captures Toggle
        const mandatoryJumpToggle = document.getElementById('mandatoryJumpToggle');
        const mandatoryJumpBadge = document.getElementById('mandatoryJumpBadge');
        const mandatoryJumpDesc = document.getElementById('mandatoryJumpDesc');

        if (mandatoryJumpToggle) {
            mandatoryJumpToggle.addEventListener('change', (e) => {
                this.mandatoryJump = e.target.checked;
                this.game.setMandatoryJump(this.mandatoryJump);
                if (mandatoryJumpBadge) {
                    mandatoryJumpBadge.textContent = this.mandatoryJump ? 'Forced' : 'Optional';
                    mandatoryJumpBadge.className = `rule-toggle-badge ${this.mandatoryJump ? '' : 'badge-optional'}`;
                }
                if (mandatoryJumpDesc) {
                    mandatoryJumpDesc.textContent = this.mandatoryJump 
                        ? 'Jumps & multi-jumps are compulsory (Official Rules)' 
                        : 'Captures & multi-jumps are optional (Free Play)';
                }
                audio.playSelect();
                audio.triggerHaptic(15);
            });
        }

        // End Turn Button (for optional multi-jump)
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', () => {
                if (this.game.inMultiJump && !this.game.mandatoryJump) {
                    const result = this.game.endMultiJump();
                    if (result.type === 'TURN_ENDED') {
                        audio.playMove();
                        audio.triggerHaptic(15);
                        this.ui.render(this.mode);
                        if (this.mode.startsWith('ai') && this.game.currentPlayer === 'dark') {
                            this.triggerAiTurn();
                        }
                    }
                }
            });
        }
    }

    handlePieceDrop(fromRow, fromCol, toRow, toCol) {
        if (this.game.gameOver || this.isAiProcessing || this.isAnimating) return;
        this.ui.hintMove = null;

        if (fromRow === toRow && fromCol === toCol) {
            this.handleSquareClick(fromRow, fromCol);
            return;
        }

        let selResult = { type: 'SELECTED' };
        if (!this.game.selectedPiece || this.game.selectedPiece.row !== fromRow || this.game.selectedPiece.col !== fromCol) {
            selResult = this.game.selectSquare(fromRow, fromCol);
        }

        if (selResult.type === 'SELECTED') {
            const actingPlayer = this.game.currentPlayer;
            const result = this.game.selectSquare(toRow, toCol);

            if (result.type === 'MOVE_COMPLETED' || result.type === 'MULTI_JUMP_CONTINUE') {
                this.processMoveResult(result, actingPlayer);
            } else {
                this.ui.render(this.mode);
            }
        } else {
            this.ui.render(this.mode);
        }
    }

    handleSquareClick(row, col) {
        if (this.game.gameOver || this.isAiProcessing || this.isAnimating) return;
        
        this.ui.hintMove = null;

        if (this.mode.startsWith('ai') && this.game.currentPlayer === 'dark') {
            return;
        }

        const actingPlayer = this.game.currentPlayer;
        const selected = this.game.selectedPiece;

        // If a piece is already selected and target square is a valid destination, animate move slide
        if (selected && (selected.row !== row || selected.col !== col)) {
            const matchingMove = this.game.validMoves.find(m => 
                m.fromRow === selected.row && m.fromCol === selected.col &&
                m.toRow === row && m.toCol === col
            );

            if (matchingMove) {
                this.isAnimating = true;
                this.ui.animateMove(selected.row, selected.col, row, col).then(() => {
                    const result = this.game.selectSquare(row, col);
                    this.isAnimating = false;
                    this.processMoveResult(result, actingPlayer);
                });
                return;
            }
        }

        // Selection or invalid tap
        const result = this.game.selectSquare(row, col);
        if (result.type === 'SELECTED') {
            audio.playSelect();
            audio.triggerHaptic(10);
            this.ui.render(this.mode);
        } else if (result.type === 'MUST_JUMP_OTHER_PIECE' || result.type === 'INVALID') {
            audio.playError();
            audio.triggerHaptic([40, 20, 40]);
        }
    }

    processMoveResult(result, actingPlayer) {
        this.ui.lastMove = result.move;
        
        if (result.move && result.move.isJump) {
            audio.playCapture();
            audio.triggerHaptic([20, 15, 20]);
        } else {
            audio.playMove();
            audio.triggerHaptic(15);
        }

        if (result.crowned) {
            audio.playKing();
            audio.triggerHaptic([30, 20, 40]);
        }

        this.ui.logMove(result, actingPlayer);
        this.ui.render(this.mode);

        if (result.gameOver) {
            if (this.mode.startsWith('ai')) {
                if (result.winner === 'red') audio.playVictory();
                else audio.playDefeat();
            } else {
                audio.playVictory();
            }

            this.ui.showWinModal(
                result.winner,
                this.mode,
                this.game.totalMoves,
                this.game.totalCaptures,
                this.game.totalKingsCrowned
            );
            return;
        }

        if (this.mode.startsWith('ai') && this.game.currentPlayer === 'dark') {
            this.triggerAiTurn();
        }
    }

    triggerAiTurn() {
        if (this.game.gameOver || this.game.currentPlayer !== 'dark') return;

        this.isAiProcessing = true;
        this.ui.render(this.mode);

        // Natural thinking delay for AI (750ms for easy AI, 950ms for hard AI)
        const thinkingDelay = this.mode === 'ai-hard' ? 950 : 750;

        setTimeout(() => {
            if (this.game.gameOver) {
                this.isAiProcessing = false;
                return;
            }

            const aiMove = this.ai.getBestMove(this.game, 'dark');
            if (!aiMove) {
                this.isAiProcessing = false;
                return;
            }

            // Step 1: Highlight AI piece to show selection
            this.game.selectedPiece = { row: aiMove.fromRow, col: aiMove.fromCol };
            this.ui.render(this.mode);
            audio.playSelect();

            // Step 2: 250ms pause before sliding piece so player sees AI's intention
            setTimeout(() => {
                // Step 3: Animate piece slide across the board
                this.ui.animateMove(aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol).then(() => {
                    const actingPlayer = 'dark';
                    const result = this.game.makeMove(aiMove);

                    this.ui.lastMove = result.move;

                    if (result.move.isJump) {
                        audio.playCapture();
                        audio.triggerHaptic([20, 15, 20]);
                    } else {
                        audio.playMove();
                        audio.triggerHaptic(15);
                    }

                    if (result.crowned) {
                        audio.playKing();
                        audio.triggerHaptic([30, 20, 40]);
                    }

                    this.ui.logMove(result, actingPlayer);
                    this.ui.render(this.mode);

                    if (result.type === 'MULTI_JUMP_CONTINUE') {
                        // Multi-jump: brief pause before AI executes next jump step
                        setTimeout(() => {
                            this.isAiProcessing = false;
                            this.triggerAiTurn();
                        }, 350);
                    } else {
                        this.isAiProcessing = false;
                        if (result.gameOver) {
                            if (result.winner === 'red') audio.playVictory();
                            else audio.playDefeat();

                            this.ui.showWinModal(
                                result.winner,
                                this.mode,
                                this.game.totalMoves,
                                this.game.totalCaptures,
                                this.game.totalKingsCrowned
                            );
                        }
                    }
                });
            }, 250);
        }, thinkingDelay);
    }

    undoMove() {
        if (this.isAiProcessing || this.isAnimating || this.game.history.length === 0) return;

        if (this.mode.startsWith('ai') && this.game.history.length >= 2) {
            this.game.undo();
            this.game.undo();
        } else {
            this.game.undo();
        }

        this.ui.lastMove = null;
        this.ui.hintMove = null;
        this.ui.render(this.mode);
        audio.playUndo();
        audio.triggerHaptic(15);
    }

    showHint() {
        if (this.game.gameOver || this.isAiProcessing || this.isAnimating) return;
        
        // In AI mode, hint is strictly available for the human player (Red)
        if (this.mode.startsWith('ai') && this.game.currentPlayer !== 'red') return;

        const bestMove = this.ai.getBestMove(this.game, this.game.currentPlayer);
        if (bestMove) {
            this.ui.hintMove = bestMove;
            this.ui.render(this.mode);
            audio.playHint();
            audio.triggerHaptic(15);
        }
    }

    startNewGame() {
        this.isAiProcessing = false;
        this.isAnimating = false;
        this.game.reset();
        this.game.setMandatoryJump(this.mandatoryJump);
        this.ui.lastMove = null;
        this.ui.hintMove = null;
        this.ui.clearMoveLog();
        this.ui.hideWinModal();
        this.ui.render(this.mode);
    }
}

// Initialize Checkers App when DOM is ready
const initApp = () => {
    if (!window.checkersApp) {
        window.checkersApp = new App();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
