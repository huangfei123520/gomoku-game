// ============= 五子棋AI引擎 =============
class GomokuAI {
    constructor() {
        this.depth = 2;
        this.scoreMap = {};
    }

    getBestMove(board, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        const candidates = this.getCandidates(board, 15);
        if (candidates.length === 0) return { row: 7, col: 7 };

        let bestScore = -Infinity;
        let bestMove = candidates[0];

        // 对候选位置进行评分 - 使用更高效的评分方法
        for (const pos of candidates) {
            const score = this.evaluatePosition(board, pos.row, pos.col, player, opponent);
            if (score > bestScore) {
                bestScore = score;
                bestMove = pos;
            }
        }

        return bestMove;
    }

    getCandidates(board, maxCount) {
        const candidates = [];
        const visited = new Set();

        // 只在已有棋子周围搜索
        let minR = BOARD_SIZE, maxR = 0, minC = BOARD_SIZE, maxC = 0;
        let hasStone = false;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] !== EMPTY) {
                    hasStone = true;
                    minR = Math.min(minR, r);
                    maxR = Math.max(maxR, r);
                    minC = Math.min(minC, c);
                    maxC = Math.max(maxC, c);
                }
            }
        }

        if (!hasStone) return candidates;

        const range = 2;
        const startR = Math.max(0, minR - range);
        const endR = Math.min(BOARD_SIZE - 1, maxR + range);
        const startC = Math.max(0, minC - range);
        const endC = Math.min(BOARD_SIZE - 1, maxC + range);

        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                if (board[r][c] !== EMPTY) continue;
                // 至少有一个非空邻居
                let hasNeighbor = false;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== EMPTY) {
                            hasNeighbor = true;
                            break;
                        }
                    }
                    if (hasNeighbor) break;
                }
                if (hasNeighbor) {
                    const key = `${r},${c}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        candidates.push({ row: r, col: c });
                    }
                }
            }
        }

        // 按到中心的距离排序，优先考虑中心区域
        candidates.sort((a, b) => {
            const distA = Math.abs(a.row - 7) + Math.abs(a.col - 7);
            const distB = Math.abs(b.row - 7) + Math.abs(b.col - 7);
            return distA - distB;
        });

        return candidates.slice(0, maxCount);
    }

    evaluatePosition(board, row, col, player, opponent) {
        // 临时放置棋子
        board[row][col] = player;
        const attackScore = this.evaluatePoint(board, row, col, player);
        board[row][col] = EMPTY;

        // 防守评分
        board[row][col] = opponent;
        const defenseScore = this.evaluatePoint(board, row, col, opponent);
        board[row][col] = EMPTY;

        // 进攻权重略高
        return attackScore * 1.1 + defenseScore;
    }

    evaluatePoint(board, row, col, player) {
        const directions = [[1,0], [0,1], [1,1], [1,-1]];
        let totalScore = 0;

        for (const [dr, dc] of directions) {
            totalScore += this.evaluateDirection(board, row, col, dr, dc, player);
        }

        return totalScore;
    }

    evaluateDirection(board, row, col, dr, dc, player) {
        let count = 1;
        let openEnds = 0;

        // 正方向
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === EMPTY) {
            openEnds++;
        }

        // 反方向
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
            count++;
            r -= dr;
            c -= dc;
        }
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === EMPTY) {
            openEnds++;
        }

        return this.getPatternScore(count, openEnds);
    }

    getPatternScore(count, openEnds) {
        if (count >= 5) return 100000;
        if (openEnds === 0) return 0;

        switch (count) {
            case 4:
                return openEnds === 2 ? 10000 : 5000;
            case 3:
                return openEnds === 2 ? 1000 : 500;
            case 2:
                return openEnds === 2 ? 100 : 50;
            case 1:
                return openEnds === 2 ? 10 : 5;
            default:
                return 0;
        }
    }

    // 检查是否有立即获胜的走法
    getWinningMove(board, player) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] !== EMPTY) continue;
                board[r][c] = player;
                if (this.checkFive(board, r, c, player)) {
                    board[r][c] = EMPTY;
                    return { row: r, col: c };
                }
                board[r][c] = EMPTY;
            }
        }
        return null;
    }

    // 检查是否形成五子连珠
    checkFive(board, row, col, player) {
        const directions = [[1,0], [0,1], [1,1], [1,-1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            for (let i = 1; i < 5; i++) {
                const r = row + dr * i, c = col + dc * i;
                if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
                if (board[r][c] !== player) break;
                count++;
            }
            for (let i = 1; i < 5; i++) {
                const r = row - dr * i, c = col - dc * i;
                if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
                if (board[r][c] !== player) break;
                count++;
            }
            if (count >= 5) return true;
        }
        return false;
    }
}