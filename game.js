// ============= 五子棋核心游戏逻辑 =============
const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

class Game {
    constructor() {
        this.board = [];
        this.currentPlayer = BLACK;
        this.turnCount = 0;
        this.isOver = false;
        this.winner = null;
        this.winLine = null;
        this.lastMove = null;
        this.mode = 'ai'; // 'ai' | 'p2p_host' | 'p2p_join'
        this.playerColor = BLACK;
        this.history = [];
        this.initBoard();
    }

    initBoard() {
        this.board = Array.from({ length: BOARD_SIZE }, () =>
            Array(BOARD_SIZE).fill(EMPTY)
        );
        this.currentPlayer = BLACK;
        this.turnCount = 0;
        this.isOver = false;
        this.winner = null;
        this.winLine = null;
        this.lastMove = null;
        this.history = [];
    }

    reset() {
        this.initBoard();
    }

    isValidMove(row, col) {
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
        return this.board[row][col] === EMPTY;
    }

    placePiece(row, col) {
        if (!this.isValidMove(row, col) || this.isOver) return false;
        this.board[row][col] = this.currentPlayer;
        this.lastMove = { row, col };
        this.history.push({ row, col, player: this.currentPlayer });
        this.turnCount++;

        // 检查胜负
        const winResult = this.checkWin(row, col, this.currentPlayer);
        if (winResult) {
            this.isOver = true;
            this.winner = this.currentPlayer;
            this.winLine = winResult;
            return true;
        }

        // 平局
        if (this.turnCount >= BOARD_SIZE * BOARD_SIZE) {
            this.isOver = true;
            this.winner = 0;
            return true;
        }

        this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK;
        return true;
    }

    undo() {
        if (this.history.length === 0) return false;
        const last = this.history.pop();
        this.board[last.row][last.col] = EMPTY;
        this.currentPlayer = last.player;
        this.turnCount--;
        this.isOver = false;
        this.winner = null;
        this.winLine = null;
        this.lastMove = this.history.length > 0 ? this.history[this.history.length - 1] : null;
        return true;
    }

    checkWin(row, col, player) {
        const directions = [
            [1, 0],  // 垂直
            [0, 1],  // 水平
            [1, 1],  // 对角线
            [1, -1]  // 反对角线
        ];

        for (const [dr, dc] of directions) {
            let cells = [{ row, col }];
            // 正方向
            for (let i = 1; i < 5; i++) {
                const r = row + dr * i, c = col + dc * i;
                if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
                if (this.board[r][c] !== player) break;
                cells.push({ row: r, col: c });
            }
            // 反方向
            for (let i = 1; i < 5; i++) {
                const r = row - dr * i, c = col - dc * i;
                if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
                if (this.board[r][c] !== player) break;
                cells.push({ row: r, col: c });
            }
            if (cells.length >= 5) return cells;
        }
        return null;
    }

    getBoardCopy() {
        return this.board.map(row => [...row]);
    }

    isMyTurn() {
        if (this.mode === 'ai') return true;
        if (this.mode === 'p2p_host') return this.currentPlayer === BLACK;
        if (this.mode === 'p2p_join') return this.currentPlayer === WHITE;
        return true;
    }
}

// ============= 棋盘渲染器 =============
class BoardRenderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        this.cellSize = 0;
        this.padding = 0;
        this.boardPixelSize = 0;
        this.animating = [];
        this.winLineAnimProgress = 0;
        this.isAnimatingWin = false;
        this.resize();
        this.setupResize();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height, 440);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.ctx.scale(dpr, dpr);
        this.boardPixelSize = size;
        this.padding = size * 0.045;
        this.cellSize = (size - this.padding * 2) / (BOARD_SIZE - 1);
    }

    setupResize() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.resize();
                this.render();
            }, 100);
        });
    }

    getClickPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const col = Math.round((x - this.padding) / this.cellSize);
        const row = Math.round((y - this.padding) / this.cellSize);
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            return { row, col };
        }
        return null;
    }

    getStonePosition(row, col) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        return { x, y };
    }

    render() {
        const ctx = this.ctx;
        const size = this.boardPixelSize;
        const pad = this.padding;
        const cell = this.cellSize;
        const board = this.game.board;

        // 清空
        ctx.clearRect(0, 0, size, size);

        // 绘制棋盘背景（木质纹理效果）
        this.drawBoardBackground(ctx, size, pad, cell);

        // 绘制网格线
        this.drawGrid(ctx, size, pad, cell);

        // 绘制星位（天元/星位）
        this.drawStarPoints(ctx, pad, cell);

        // 绘制棋子
        this.drawPieces(ctx, board, pad, cell);

        // 绘制最后落子标记
        this.drawLastMoveMarker(ctx, pad, cell);

        // 绘制胜利连线
        if (this.game.winLine) {
            this.drawWinLine(ctx, pad, cell);
        }

        // 绘制落子动画
        this.drawAnimations(ctx, pad, cell);
    }

    drawBoardBackground(ctx, size, pad, cell) {
        // 木质渐变背景
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#d4a853');
        gradient.addColorStop(0.2, '#c99b45');
        gradient.addColorStop(0.4, '#dbb05e');
        gradient.addColorStop(0.6, '#c99b45');
        gradient.addColorStop(0.8, '#d4a853');
        gradient.addColorStop(1, '#c99b45');
        ctx.fillStyle = gradient;
        this.roundRect(ctx, 4, 4, size - 8, size - 8, 10);
        ctx.fill();

        // 木纹纹理
        ctx.globalAlpha = 0.06;
        for (let i = 0; i < 40; i++) {
            const y = pad + Math.random() * (size - pad * 2);
            ctx.strokeStyle = '#8B6914';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let x = pad + Math.random() * 20;
            ctx.moveTo(x, y);
            for (let j = 0; j < 5; j++) {
                x += 20 + Math.random() * 30;
                ctx.lineTo(x, y + (Math.random() - 0.5) * 3);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 边缘阴影
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(139,105,20,0.3)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, 4, 4, size - 8, size - 8, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawGrid(ctx, size, pad, cell) {
        ctx.strokeStyle = 'rgba(80,50,20,0.5)';
        ctx.lineWidth = 1;

        // 垂直线
        for (let i = 0; i < BOARD_SIZE; i++) {
            const x = pad + i * cell;
            ctx.beginPath();
            ctx.moveTo(x, pad);
            ctx.lineTo(x, size - pad);
            ctx.stroke();
        }

        // 水平线
        for (let i = 0; i < BOARD_SIZE; i++) {
            const y = pad + i * cell;
            ctx.beginPath();
            ctx.moveTo(pad, y);
            ctx.lineTo(size - pad, y);
            ctx.stroke();
        }
    }

    drawStarPoints(ctx, pad, cell) {
        const stars = [
            [3, 3], [3, 7], [3, 11],
            [7, 3], [7, 7], [7, 11],
            [11, 3], [11, 7], [11, 11]
        ];
        const r = this.cellSize * 0.08;
        ctx.fillStyle = 'rgba(80,50,20,0.6)';
        for (const [row, col] of stars) {
            const { x, y } = this.getStonePosition(row, col);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPieces(ctx, board, pad, cell) {
        const stoneRadius = cell * 0.42;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === EMPTY) continue;
                const { x, y } = this.getStonePosition(r, c);
                this.drawStone(ctx, x, y, stoneRadius, board[r][c]);
            }
        }
    }

    drawStone(ctx, x, y, radius, color) {
        ctx.save();
        // 阴影
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = radius * 0.3;
        ctx.shadowOffsetX = radius * 0.05;
        ctx.shadowOffsetY = radius * 0.08;

        if (color === BLACK) {
            // 黑子: 带有光泽的深色渐变
            const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
            grad.addColorStop(0, '#666');
            grad.addColorStop(0.3, '#333');
            grad.addColorStop(0.7, '#1a1a1a');
            grad.addColorStop(1, '#0a0a0a');
            ctx.fillStyle = grad;
        } else {
            // 白子: 带有光泽的浅色渐变
            const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#f5f5f5');
            grad.addColorStop(0.7, '#e0e0e0');
            grad.addColorStop(1, '#c0c0c0');
            ctx.fillStyle = grad;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        if (color === BLACK) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
        }
        ctx.beginPath();
        ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // 边缘描边
        ctx.strokeStyle = color === BLACK ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawLastMoveMarker(ctx, pad, cell) {
        const last = this.game.lastMove;
        if (!last) return;
        const { x, y } = this.getStonePosition(last.row, last.col);
        const color = this.game.board[last.row][last.col];
        const markerColor = color === BLACK ? '#ff4444' : '#ff4444';
        ctx.fillStyle = markerColor;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.06, 0, Math.PI * 2);
        ctx.fill();
    }

    drawWinLine(ctx, pad, cell) {
        const line = this.game.winLine;
        if (!line || line.length < 2) return;

        const start = this.getStonePosition(line[0].row, line[0].col);
        const end = this.getStonePosition(line[line.length - 1].row, line[line.length - 1].col);

        ctx.save();
        // 发光效果
        const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        gradient.addColorStop(0, 'rgba(255,50,50,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,200,50,0.9)');
        gradient.addColorStop(1, 'rgba(255,50,50,0.8)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = cell * 0.12;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255,50,50,0.6)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // 白色中心线
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = cell * 0.04;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();

        // 胜利棋子闪烁动画
        const time = Date.now() / 500;
        for (const cell of line) {
            const { x, y } = this.getStonePosition(cell.row, cell.col);
            const glow = 0.3 + Math.sin(time) * 0.2;
            ctx.save();
            ctx.shadowColor = 'rgba(255,200,50,0.4)';
            ctx.shadowBlur = 15 + Math.sin(time + cell.row) * 8;
            ctx.beginPath();
            ctx.arc(x, y, cell * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,200,50,${glow * 0.15})`;
            ctx.fill();
            ctx.restore();
        }
    }

    drawAnimations(ctx, pad, cell) {
        // 落子动画：简单缩放效果
        const now = Date.now();
        const animDuration = 200;
        for (let i = this.animating.length - 1; i >= 0; i--) {
            const a = this.animating[i];
            const elapsed = now - a.startTime;
            if (elapsed >= animDuration) {
                this.animating.splice(i, 1);
                continue;
            }
            const progress = elapsed / animDuration;
            const scale = 0.3 + 0.7 * progress;
            const { x, y } = this.getStonePosition(a.row, a.col);
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.translate(-x, -y);
            this.drawStone(ctx, x, y, cell * 0.42, a.color);
            ctx.restore();
        }
    }

    addPlaceAnimation(row, col, color) {
        this.animating.push({ row, col, color, startTime: Date.now() });
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}