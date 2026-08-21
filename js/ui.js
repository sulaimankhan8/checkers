// ============================================
// CHECKERS UI RENDERER & INTERACTION CONTROLLER
// ============================================

import { PIECE_TYPES } from './game.js';
import { audio } from './audio.js';

export class CheckersUI {
    constructor(game) {
        this.game = game;
        this.lastMove = null;
        this.hintMove = null;
        this.onSquareClick = null;
        this.onPieceDrop = null;
        
        // Touch Dragging State
        this.dragState = {
            isDragging: false,
            fromRow: null,
            fromCol: null,
            dragElement: null,
            hoverCell: null
        };

        this.elements = {
            homeScreen: document.getElementById('homeScreen'),
            gameScreen: document.getElementById('gameScreen'),
            board: document.getElementById('checkersBoard'),
            turnBanner: document.getElementById('turnBanner'),
            turnText: document.getElementById('turnText'),
            redPieceCount: document.getElementById('redPieceCount'),
            darkPieceCount: document.getElementById('darkPieceCount'),
            redPlayerCard: document.getElementById('playerRedCard'),
            darkPlayerCard: document.getElementById('playerDarkCard'),
            redCapturedContainer: document.getElementById('redCapturedContainer'),
            darkCapturedContainer: document.getElementById('darkCapturedContainer'),
            moveLogList: document.getElementById('moveLogList'),
            moveLogDrawer: document.getElementById('moveLogDrawer'),
            toggleLogBtn: document.getElementById('toggleLogBtn'),
            closeLogBtn: document.getElementById('closeLogBtn'),
            undoBtn: document.getElementById('undoBtn'),
            hintBtn: document.getElementById('hintBtn'),
            headerModeLabel: document.getElementById('headerModeLabel'),
            winModal: document.getElementById('winModal'),
            modalBox: document.getElementById('modalBox'),
            winTitle: document.getElementById('winTitle'),
            winSubtitle: document.getElementById('winSubtitle'),
            winIconSvg: document.getElementById('winIconSvg'),
            winMovesCount: document.getElementById('winMovesCount'),
            winCapturesCount: document.getElementById('winCapturesCount'),
            winKingsCount: document.getElementById('winKingsCount'),
            darkAvatarIcon: document.getElementById('darkAvatarIcon'),
            darkPlayerName: document.getElementById('darkPlayerName'),
            confettiCanvas: document.getElementById('confettiCanvas')
        };

        this.initBoardDOM();
        this.bindGlobalTouchListeners();
        this.bindDrawerListeners();
    }

    showHomeScreen() {
        document.body.className = `theme-${document.querySelector('.theme-pill.active')?.dataset.theme || 'wood'} screen-home`;
        this.elements.homeScreen.classList.add('active');
        this.elements.gameScreen.classList.remove('active');
    }

    showGameScreen() {
        document.body.className = `theme-${document.querySelector('.theme-pill.active')?.dataset.theme || 'wood'} screen-game`;
        this.elements.homeScreen.classList.remove('active');
        this.elements.gameScreen.classList.add('active');
    }

    initBoardDOM() {
        this.elements.board.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = document.createElement('div');
                const isDarkCell = (r + c) % 2 === 1;
                cell.className = `board-cell ${isDarkCell ? 'cell-dark' : 'cell-light'}`;
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Click listener
                cell.addEventListener('click', () => {
                    if (this.onSquareClick) {
                        this.onSquareClick(r, c);
                    }
                });

                this.elements.board.appendChild(cell);
            }
        }
    }

    bindGlobalTouchListeners() {
        document.addEventListener('touchmove', (e) => {
            if (!this.dragState.isDragging || !this.dragState.dragElement) return;
            e.preventDefault();

            const touch = e.touches[0];
            this.dragState.dragElement.style.left = `${touch.clientX}px`;
            this.dragState.dragElement.style.top = `${touch.clientY}px`;

            const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            const cell = targetEl ? targetEl.closest('.board-cell') : null;

            if (this.dragState.hoverCell && this.dragState.hoverCell !== cell) {
                this.dragState.hoverCell.classList.remove('cell-drag-over');
            }

            if (cell && cell.classList.contains('cell-dark')) {
                cell.classList.add('cell-drag-over');
                this.dragState.hoverCell = cell;
            } else {
                this.dragState.hoverCell = null;
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!this.dragState.isDragging) return;

            if (this.dragState.hoverCell) {
                this.dragState.hoverCell.classList.remove('cell-drag-over');
                const toRow = parseInt(this.dragState.hoverCell.dataset.row);
                const toCol = parseInt(this.dragState.hoverCell.dataset.col);

                if (this.onPieceDrop) {
                    this.onPieceDrop(this.dragState.fromRow, this.dragState.fromCol, toRow, toCol);
                }
            }

            this.cleanupDrag();
        });
    }

    cleanupDrag() {
        if (this.dragState.dragElement) {
            this.dragState.dragElement.remove();
            this.dragState.dragElement = null;
        }
        if (this.dragState.hoverCell) {
            this.dragState.hoverCell.classList.remove('cell-drag-over');
            this.dragState.hoverCell = null;
        }
        this.dragState.isDragging = false;
        this.dragState.fromRow = null;
        this.dragState.fromCol = null;
    }

    bindDrawerListeners() {
        if (this.elements.toggleLogBtn) {
            this.elements.toggleLogBtn.addEventListener('click', () => {
                this.elements.moveLogDrawer.classList.toggle('active');
                audio.playSelect();
                audio.triggerHaptic(15);
            });
        }

        if (this.elements.closeLogBtn) {
            this.elements.closeLogBtn.addEventListener('click', () => {
                this.elements.moveLogDrawer.classList.remove('active');
            });
        }
    }

    animateMove(fromRow, fromCol, toRow, toCol) {
        return new Promise((resolve) => {
            const fromCell = this.elements.board.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
            const toCell = this.elements.board.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
            
            if (!fromCell || !toCell) return resolve();

            const pieceEl = fromCell.querySelector('.piece');
            if (!pieceEl) return resolve();

            const fromRect = fromCell.getBoundingClientRect();
            const toRect = toCell.getBoundingClientRect();
            const deltaX = toRect.left - fromRect.left;
            const deltaY = toRect.top - fromRect.top;

            pieceEl.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
            pieceEl.style.zIndex = '100';
            pieceEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.12)`;

            setTimeout(() => {
                resolve();
            }, 360);
        });
    }

    render(mode = 'pvp') {
        const board = this.game.board;
        const selected = this.game.selectedPiece;
        const validMoves = this.game.validMoves;

        // Update header & player cards mode names/avatars
        if (mode.startsWith('ai')) {
            const isHard = mode === 'ai-hard';
            this.elements.headerModeLabel.textContent = isHard ? 'vs AI (Hard)' : 'vs AI (Easy)';
            this.elements.darkAvatarIcon.innerHTML = `<svg class="svg-icon"><use href="#icon-${isHard ? 'brain' : 'robot'}"></use></svg>`;
            this.elements.darkPlayerName.textContent = isHard ? 'Computer (Hard)' : 'Computer (Easy)';
        } else {
            this.elements.headerModeLabel.textContent = 'Pass & Play';
            this.elements.darkAvatarIcon.innerHTML = `<svg class="svg-icon"><use href="#icon-user"></use></svg>`;
            this.elements.darkPlayerName.textContent = 'Player 2 (Dark)';
        }

        // Render cell contents
        const cells = this.elements.board.children;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const pieceVal = board[r][c];

            cell.innerHTML = '';
            cell.classList.remove('cell-selected', 'cell-last-move', 'cell-drag-over');

            // Highlight last move
            if (this.lastMove && 
                ((r === this.lastMove.fromRow && c === this.lastMove.fromCol) ||
                 (r === this.lastMove.toRow && c === this.lastMove.toCol))) {
                cell.classList.add('cell-last-move');
            }

            // Highlight selected cell
            if (selected && selected.row === r && selected.col === c) {
                cell.classList.add('cell-selected');
            }

            // Render piece
            if (pieceVal !== PIECE_TYPES.EMPTY) {
                const pieceEl = document.createElement('div');
                const isRed = pieceVal === PIECE_TYPES.RED || pieceVal === PIECE_TYPES.RED_KING;
                const isKing = pieceVal === PIECE_TYPES.RED_KING || pieceVal === PIECE_TYPES.DARK_KING;

                pieceEl.className = `piece ${isRed ? 'red-piece' : 'dark-piece'}`;
                if (isKing) {
                    pieceEl.classList.add('piece-king');
                    pieceEl.innerHTML = `<svg class="svg-icon piece-crown-icon"><use href="#icon-crown"></use></svg>`;
                }
                if (selected && selected.row === r && selected.col === c) {
                    pieceEl.classList.add('selected-piece');
                }

                // Touch Start handler for dragging
                pieceEl.addEventListener('touchstart', (e) => {
                    const actingPlayer = this.game.currentPlayer;
                    const pieceOwner = isRed ? 'red' : 'dark';

                    if (actingPlayer !== pieceOwner) return;

                    const touch = e.touches[0];
                    this.dragState.isDragging = true;
                    this.dragState.fromRow = r;
                    this.dragState.fromCol = c;

                    if (!selected || selected.row !== r || selected.col !== c) {
                        if (this.onSquareClick) this.onSquareClick(r, c);
                    }

                    const dragAv = pieceEl.cloneNode(true);
                    dragAv.className = `piece ${isRed ? 'red-piece' : 'dark-piece'} dragging-piece`;
                    dragAv.style.left = `${touch.clientX}px`;
                    dragAv.style.top = `${touch.clientY}px`;
                    document.body.appendChild(dragAv);
                    this.dragState.dragElement = dragAv;

                    audio.triggerHaptic(15);
                }, { passive: true });

                cell.appendChild(pieceEl);
            }

            // Render valid move hint dot
            if (selected) {
                const matchingMove = validMoves.find(m => 
                    m.fromRow === selected.row && m.fromCol === selected.col &&
                    m.toRow === r && m.toCol === c
                );
                if (matchingMove) {
                    const hintDot = document.createElement('div');
                    hintDot.className = 'valid-move-hint';
                    cell.appendChild(hintDot);
                }
            }

            // Render AI Hint highlight if requested
            if (this.hintMove && r === this.hintMove.fromRow && c === this.hintMove.fromCol) {
                cell.classList.add('cell-selected');
            }
            if (this.hintMove && r === this.hintMove.toRow && c === this.hintMove.toCol) {
                const hintDot = document.createElement('div');
                hintDot.className = 'valid-move-hint';
                cell.appendChild(hintDot);
            }
        }

        // Update Turn Banners & Cards
        const isRedTurn = this.game.currentPlayer === 'red';
        this.elements.redPlayerCard.classList.toggle('active-turn', isRedTurn);
        this.elements.darkPlayerCard.classList.toggle('active-turn', !isRedTurn);

        this.elements.turnText.textContent = isRedTurn ? "Red Player's Turn" : "Dark Player's Turn";
        const dot = this.elements.turnBanner.querySelector('.turn-dot');
        if (dot) {
            dot.className = `turn-dot ${isRedTurn ? 'red-dot' : 'dark-dot'}`;
        }

        // Update piece counts & captured stats
        const counts = this.game.getPieceCount();
        this.elements.redPieceCount.textContent = counts.red;
        this.elements.darkPieceCount.textContent = counts.dark;

        this.renderCapturedPieces();

        // Update Undo button state
        this.elements.undoBtn.disabled = this.game.history.length === 0 || this.game.gameOver;
    }

    renderCapturedPieces() {
        this.elements.redCapturedContainer.innerHTML = '';
        this.elements.darkCapturedContainer.innerHTML = '';

        for (let i = 0; i < this.game.capturedDark; i++) {
            const dot = document.createElement('div');
            dot.className = 'captured-piece dark';
            this.elements.redCapturedContainer.appendChild(dot);
        }

        for (let i = 0; i < this.game.capturedRed; i++) {
            const dot = document.createElement('div');
            dot.className = 'captured-piece red';
            this.elements.darkCapturedContainer.appendChild(dot);
        }
    }

    logMove(moveResult, player) {
        if (!moveResult || !moveResult.move) return;

        const { move, crowned } = moveResult;
        const colNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const fromPos = `${colNames[move.fromCol]}${8 - move.fromRow}`;
        const toPos = `${colNames[move.toCol]}${8 - move.toRow}`;

        let text = `${player === 'red' ? 'Red' : 'Dark'} moved ${fromPos} ➔ ${toPos}`;
        if (move.isJump) {
            text = `${player === 'red' ? 'Red' : 'Dark'} captured at ${colNames[move.captured.col]}${8 - move.captured.row} (${fromPos} ➔ ${toPos})`;
        }
        if (crowned) {
            text += ' (Crowned King!)';
        }

        const logItem = document.createElement('div');
        logItem.className = `move-log-item ${player}-move`;
        logItem.textContent = text;

        const emptyPlaceholder = this.elements.moveLogList.querySelector('.move-log-empty');
        if (emptyPlaceholder) {
            emptyPlaceholder.remove();
        }

        this.elements.moveLogList.prepend(logItem);
    }

    clearMoveLog() {
        this.elements.moveLogList.innerHTML = '<div class="move-log-empty">Game started. Red to move.</div>';
    }

    showWinModal(winner, mode, totalMoves, totalCaptures, totalKings) {
        const isUserVictory = winner === 'red' || mode === 'pvp';

        this.elements.modalBox.className = `modal-box ${isUserVictory ? 'modal-victory' : 'modal-defeat'}`;
        
        if (isUserVictory) {
            audio.playVictory();
            audio.triggerHaptic([30, 20, 50, 30, 80]);
            this.elements.winTitle.textContent = winner === 'red' ? 'VICTORY!' : 'PLAYER 2 WINS!';
            this.elements.winSubtitle.textContent = 'Outstanding strategy and dominant moves!';
            this.elements.winIconSvg.querySelector('use').setAttribute('href', '#icon-trophy');
            this.triggerConfetti();
        } else {
            audio.playDefeat();
            audio.triggerHaptic([60, 40, 100]);
            this.elements.winTitle.textContent = 'DEFEAT!';
            this.elements.winSubtitle.textContent = 'The Computer outmaneuvered your forces.';
            this.elements.winIconSvg.querySelector('use').setAttribute('href', '#icon-defeat');
            if (this.elements.confettiCanvas) this.elements.confettiCanvas.style.display = 'none';
        }

        this.elements.winMovesCount.textContent = totalMoves;
        this.elements.winCapturesCount.textContent = totalCaptures;
        this.elements.winKingsCount.textContent = totalKings;

        this.elements.winModal.classList.add('active');
    }

    hideWinModal() {
        this.elements.winModal.classList.remove('active');
        if (this.elements.confettiCanvas) {
            this.elements.confettiCanvas.style.display = 'none';
        }
    }

    triggerConfetti() {
        const canvas = this.elements.confettiCanvas;
        if (!canvas) return;
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#ffd700', '#ff5252', '#00f5d4', '#ff2a85', '#38bdf8', '#ffffff'];
        const particles = [];
        for (let i = 0; i < 180; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 8 + 4,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: (Math.random() - 0.5) * 2,
                rot: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10
            });
        }

        let startTime = Date.now();
        const duration = 4000;

        const anim = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.style.display = 'none';
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.y += p.vy;
                p.x += p.vx;
                p.rot += p.vRot;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rot * Math.PI) / 180);
                ctx.globalAlpha = 1 - elapsed / duration;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            requestAnimationFrame(anim);
        };
        anim();
    }
}
