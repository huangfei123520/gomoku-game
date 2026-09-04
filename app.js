// ============= 主应用控制器 =============
const app = {
    game: null,
    renderer: null,
    ai: null,
    sound: null,
    network: null,
    currentMode: null,
    restartRequested: false,

    init() {
        this.game = new Game();
        this.ai = new GomokuAI();
        this.sound = new SoundEngine();
        this.network = new NetworkManager();
        this.setupUI();
        this.setupNetworkEvents();
        this.setupGameLoop();
        this.showScreen('home');
    },

    setupUI() {
        // 首页按钮
        document.getElementById('btn-ai').addEventListener('click', () => {
            this.sound.click();
            this.startAIGame();
        });
        document.getElementById('btn-create').addEventListener('click', () => {
            this.sound.click();
            this.startCreateRoom();
        });
        document.getElementById('btn-join').addEventListener('click', () => {
            this.sound.click();
            this.showScreen('join-room');
        });

        // 返回按钮
        document.getElementById('back-create').addEventListener('click', () => {
            this.sound.click();
            this.network.disconnect();
            this.showScreen('home');
        });
        document.getElementById('back-join').addEventListener('click', () => {
            this.sound.click();
            this.showScreen('home');
        });
        document.getElementById('back-game').addEventListener('click', () => {
            this.sound.click();
            if (this.network.isConnected) {
                this.network.disconnect();
            }
            this.showScreen('home');
        });

        // 加入房间
        document.getElementById('btn-confirm-join').addEventListener('click', () => {
            this.sound.click();
            this.confirmJoin();
        });

        // 结果弹窗
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.sound.click();
            this.handleRestart();
        });
        document.getElementById('btn-back-home').addEventListener('click', () => {
            this.sound.click();
            if (this.network.isConnected) {
                this.network.disconnect();
            }
            this.showScreen('home');
            document.getElementById('result-modal').classList.add('hidden');
        });

        // 回车键加入
        document.getElementById('input-room-id').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirmJoin();
            }
        });

        // 自定义确认按钮
        document.getElementById('btn-confirm-yes').addEventListener('click', () => {
            this.sound.click();
            document.getElementById('confirm-modal').classList.add('hidden');
            this.network.sendRestartAccept();
            this.doRestart();
        });
        document.getElementById('btn-confirm-no').addEventListener('click', () => {
            this.sound.click();
            document.getElementById('confirm-modal').classList.add('hidden');
        });

        // 复制房间ID
        document.getElementById('btn-copy-roomid').addEventListener('click', () => {
            const roomId = document.getElementById('room-id').textContent;
            if (!roomId) return;
            navigator.clipboard.writeText(roomId).then(() => {
                const btn = document.getElementById('btn-copy-roomid');
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
                setTimeout(() => {
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
                }, 1500);
            }).catch(() => {
                // 降级方案：选中文本
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(document.getElementById('room-id'));
                sel.removeAllRanges();
                sel.addRange(range);
            });
            this.sound.click();
        });

        // 粘贴房间ID
        document.getElementById('btn-paste').addEventListener('click', () => {
            navigator.clipboard.readText().then((text) => {
                document.getElementById('input-room-id').value = text.trim();
                this.sound.click();
            }).catch(() => {
                // 降级：聚焦输入框让用户手动粘贴
                document.getElementById('input-room-id').focus();
                this.sound.invalid();
            });
        });
    },

    setupNetworkEvents() {
        this.network.onConnected = () => {
            this.sound.connected();
            if (this.network.isHost) {
                // 主机作为黑方
                this.game.mode = 'p2p_host';
                this.game.playerColor = BLACK;
                this.startGame();
            } else {
                // 加入方作为白方
                this.game.mode = 'p2p_join';
                this.game.playerColor = WHITE;
                this.startGame();
            }
        };

        this.network.onMessage = (data) => {
            this.handleNetworkMessage(data);
        };

        this.network.onDisconnected = () => {
            if (this.game.isOver) return;
            // 显示对手断开连接
            const status = document.getElementById('game-status');
            status.textContent = '对手已断开连接';
            status.style.color = '#f87171';
        };

        this.network.onError = (err) => {
            console.error('Network error:', err);
            // 如果是创建房间或加入房间过程中的错误，显示提示
            const status = document.getElementById('game-status');
            if (status) {
                status.textContent = '连接失败: ' + err;
                status.style.color = '#f87171';
            }
        };
    },

    handleNetworkMessage(data) {
        switch (data.type) {
            case 'move':
                if (this.game && !this.game.isOver) {
                    const { row, col } = data;
                    this.game.placePiece(row, col);
                    this.renderer.addPlaceAnimation(row, col, this.game.board[row][col]);
                    this.sound.opponentMove();
                    this.updateGameUI();
                    this.renderer.render();
                    this.checkGameResult();
                }
                break;
            case 'restart':
                this.restartRequested = true;
                // 显示自定义确认对话框
                const modal = document.getElementById('confirm-modal');
                modal.classList.remove('hidden');
                break;
            case 'restart_accept':
                this.restartRequested = true;
                this.doRestart();
                break;
        }
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        // 隐藏模态框
        document.getElementById('result-modal').classList.add('hidden');
    },

    // ============= AI对战模式 =============
    startAIGame() {
        this.currentMode = 'ai';
        this.game.reset();
        this.game.mode = 'ai';
        this.game.playerColor = BLACK;
        this.startGame();
        document.getElementById('black-name').textContent = '你 (黑方)';
        document.getElementById('white-name').textContent = 'AI (白方)';
    },

    // ============= 创建房间 =============
    async startCreateRoom() {
        this.currentMode = 'p2p_host';
        this.showScreen('create-room');
        document.getElementById('qrcode').innerHTML = '<div class="connection-status"><div class="spinner"></div><p>初始化中...</p></div>';

        try {
            const peerId = await this.network.createRoom();
            document.getElementById('room-id').textContent = peerId;

            // 生成二维码
            document.getElementById('qrcode').innerHTML = '';
            QRCode.toCanvas(
                peerId,
                { width: 200, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } },
                (err, canvas) => {
                    if (err) {
                        console.error('QR generation error:', err);
                        document.getElementById('qrcode').innerHTML = `
                            <div class="qrcode-fallback">
                                <p>二维码生成失败，请手动输入房间ID</p>
                                <div class="large-room-id">${peerId}</div>
                                <button class="btn primary" id="btn-retry-qr">重新生成</button>
                            </div>
                        `;
                        document.getElementById('btn-retry-qr').addEventListener('click', () => {
                            this.startCreateRoom();
                            this.sound.click();
                        });
                    } else {
                        document.getElementById('qrcode').appendChild(canvas);
                    }
                }
            );
        } catch (err) {
            document.getElementById('qrcode').innerHTML = '<div class="qrcode-fallback"><p>创建房间失败：' + err.message + '</p><button class="btn primary" id="btn-retry-create">重试</button></div>';
            document.getElementById('btn-retry-create').addEventListener('click', () => {
                this.startCreateRoom();
                this.sound.click();
            });
            console.error('Create room error:', err);
        }
    },

    // ============= 加入房间 =============
    async confirmJoin() {
        const input = document.getElementById('input-room-id');
        const roomId = input.value.trim();
        if (!roomId) {
            input.style.borderColor = '#f87171';
            setTimeout(() => input.style.borderColor = '', 1000);
            return;
        }

        this.currentMode = 'p2p_join';
        input.style.borderColor = '';
        document.getElementById('back-join').textContent = '连接中...';

        try {
            await this.network.joinRoom(roomId);
        } catch (err) {
            input.style.borderColor = '#f87171';
            document.getElementById('back-join').textContent = '返回';
            alert('加入失败: ' + err.message);
        }
    },

    // ============= 游戏控制 =============
    startGame() {
        this.showScreen('game');
        const canvas = document.getElementById('board');
        this.renderer = new BoardRenderer(canvas, this.game);
        this.renderer.render();
        this.updateGameUI();

        // 如果是对战模式且是白方（加入方），等待对手
        if (this.game.mode === 'p2p_join' && this.game.playerColor === WHITE) {
            const status = document.getElementById('game-status');
            status.textContent = '等待对方落子...';
            status.className = 'status';
        } else if (this.game.mode === 'p2p_host' && this.game.playerColor === BLACK) {
            const status = document.getElementById('game-status');
            status.textContent = '轮到你落子 (黑方)';
            status.className = 'status your-turn';
        }

                // 绑定点击事件
        const handleClick = (e) => {
            this.handleBoardClick(e);
        };
        canvas.onclick = handleClick;

        // iOS触摸事件需要 passive: false 来阻止滚动
        const handleTouchStart = (e) => {
            // 只阻止默认滚动，如果点击在棋盘上
            e.preventDefault();
        };
        const handleTouchEnd = (e) => {
            const touch = e.changedTouches[0];
            this.handleBoardClick({ clientX: touch.clientX, clientY: touch.clientY });
            e.preventDefault();
        };
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        // 如果是AI模式且AI先手（AI是白方，黑方先手，所以玩家先走）
        // 不需要额外操作
    },

    handleBoardClick(e) {
        if (this.game.isOver) return;

        const pos = this.renderer.getClickPosition(e.clientX, e.clientY);
        if (!pos) return;

        const { row, col } = pos;

        // 检查是否当前玩家的回合
        if (!this.game.isMyTurn()) {
            this.sound.invalid();
            return;
        }

        // 检查是否是有效位置
        if (!this.game.isValidMove(row, col)) {
            this.sound.invalid();
            return;
        }

        // 落子
        this.game.placePiece(row, col);
        this.renderer.addPlaceAnimation(row, col, this.game.board[row][col]);
        this.sound.placePiece();
        this.renderer.render();
        this.updateGameUI();

        // 发送网络消息
        if (this.game.mode === 'p2p_host' || this.game.mode === 'p2p_join') {
            this.network.sendMove(row, col);
        }

        // 检查结果
        if (this.checkGameResult()) return;

        // AI模式 - AI走棋
        if (this.game.mode === 'ai' && !this.game.isOver) {
            const status = document.getElementById('game-status');
            status.textContent = 'AI思考中...';
            status.className = 'status';

            // 延迟一下让动画先播放
            setTimeout(() => {
                this.aiMove();
            }, 300);
        }
    },

    aiMove() {
        if (this.game.isOver) return;

        const board = this.game.getBoardCopy();
        const aiColor = WHITE;

        // 检查AI是否有立即获胜的走法
        let move = this.ai.getWinningMove(board, aiColor);
        if (!move) {
            // 检查是否需要防守（对手下一步是否能赢）
            move = this.ai.getWinningMove(board, BLACK);
        }
        if (!move) {
            // 使用评分策略
            move = this.ai.getBestMove(board, aiColor);
        }

        if (move) {
            this.game.placePiece(move.row, move.col);
            this.renderer.addPlaceAnimation(move.row, move.col, aiColor);
            this.sound.opponentMove();
            this.renderer.render();
            this.updateGameUI();
            this.checkGameResult();
        }
    },

    updateGameUI() {
        const status = document.getElementById('game-status');
        const blackPlayer = document.getElementById('black-name');
        const whitePlayer = document.getElementById('white-name');

        if (this.game.isOver) {
            if (this.game.winner === BLACK) {
                status.textContent = '黑方胜利!';
                status.className = 'status';
                status.style.color = '#4ade80';
            } else if (this.game.winner === WHITE) {
                status.textContent = '白方胜利!';
                status.className = 'status';
                status.style.color = '#4ade80';
            } else {
                status.textContent = '平局!';
                status.className = 'status';
                status.style.color = '#f0c040';
            }
            return;
        }

        // 更新玩家指示器
        const blackIndicator = document.querySelector('.player.black');
        const whiteIndicator = document.querySelector('.player.white');
        blackIndicator.classList.toggle('active', this.game.currentPlayer === BLACK);
        whiteIndicator.classList.toggle('active', this.game.currentPlayer === WHITE);

        // 更新状态文字
        if (this.game.mode === 'ai') {
            if (this.game.currentPlayer === BLACK) {
                status.textContent = '轮到你落子 (黑方)';
                status.className = 'status your-turn';
                status.style.color = '';
            } else {
                status.textContent = 'AI思考中...';
                status.className = 'status';
                status.style.color = '';
            }
        } else {
            const isMyTurn = this.game.isMyTurn();
            const playerName = this.game.currentPlayer === BLACK ? '黑方' : '白方';
            if (isMyTurn) {
                status.textContent = `轮到你落子 (${playerName})`;
                status.className = 'status your-turn';
                status.style.color = '';
            } else {
                status.textContent = `等待对方落子 (${playerName})`;
                status.className = 'status';
                status.style.color = '';
            }
        }
    },

    checkGameResult() {
        if (!this.game.isOver) return false;

        // 播放胜利/失败音效
        if (this.game.mode === 'ai') {
            if (this.game.winner === BLACK) {
                this.sound.victory();
            } else if (this.game.winner === WHITE) {
                this.sound.defeat();
            } else {
                this.sound.draw();
            }
        } else {
            const isWinner = (this.game.winner === BLACK && this.game.playerColor === BLACK) ||
                             (this.game.winner === WHITE && this.game.playerColor === WHITE);
            if (isWinner) {
                this.sound.victory();
            } else if (this.game.winner !== 0) {
                this.sound.defeat();
            } else {
                this.sound.draw();
            }
        }

        // 显示结果弹窗
        const modal = document.getElementById('result-modal');
        const resultText = document.getElementById('result-text');
        if (this.game.winner === BLACK) {
            resultText.textContent = '\u26ab 黑方胜利!';
        } else if (this.game.winner === WHITE) {
            resultText.textContent = '\u26aa 白方胜利!';
        } else {
            resultText.textContent = '\u26aa 平局!';
        }
        modal.classList.remove('hidden');

        // 渲染胜利线
        this.renderer.render();
        return true;
    },

    handleRestart() {
        document.getElementById('result-modal').classList.add('hidden');

        if (this.game.mode === 'ai') {
            this.doRestart();
        } else {
            // 网络对战，请求对方同意
            if (this.network.isConnected) {
                this.restartRequested = false;
                this.network.sendRestart();
                const status = document.getElementById('game-status');
                status.textContent = '等待对方同意...';
            }
        }
    },

    doRestart() {
        this.game.reset();
        this.renderer.resize();
        this.renderer.render();
        this.updateGameUI();
        document.getElementById('result-modal').classList.add('hidden');

        // 网络对战模式下，重新开始后轮到黑方
        if (this.game.mode === 'p2p_host' || this.game.mode === 'p2p_join') {
            const status = document.getElementById('game-status');
            if (this.game.isMyTurn()) {
                status.textContent = '轮到你落子 (黑方)';
                status.className = 'status your-turn';
            } else {
                status.textContent = '等待对方落子 (白方)';
                status.className = 'status';
            }
        }
    },

    setupGameLoop() {
        // 游戏循环 - 处理AI动画
        setInterval(() => {
            if (this.renderer && this.renderer.animating.length > 0) {
                this.renderer.render();
            }
        }, 16);
    }
};

// 注册 Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((reg) => {
            console.log('SW registered:', reg.scope);
        }).catch((err) => {
            console.warn('SW registration failed:', err);
        });
    });
}

// 启动
document.addEventListener('DOMContentLoaded', () => app.init());