// ============= 局域网对战网络模块 (PeerJS) =============
class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.isConnected = false;
        this.isHost = false;
        this.onMessage = null;
        this.onConnected = null;
        this.onDisconnected = null;
        this.onError = null;
    }

    // 创建房间（主机）
    createRoom() {
        return new Promise((resolve, reject) => {
            try {
                this.isHost = true;
                this.peer = new Peer('', {
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun.stunprotocol.org:3478' }
                        ]
                    }
                });

                this.peer.on('open', (id) => {
                    this.peerId = id;
                    resolve(id);
                });

                this.peer.on('connection', (conn) => {
                    this.conn = conn;
                    this.setupConnection();
                    this.isConnected = true;
                    if (this.onConnected) this.onConnected();
                });

                this.peer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    if (this.onError) this.onError(err.message);
                    reject(err);
                });

                // 超时处理
                setTimeout(() => {
                    if (!this.isConnected) {
                        // 未连接成功，但peer ID已生成，继续等待
                    }
                }, 30000);

            } catch (err) {
                reject(err);
            }
        });
    }

    // 加入房间
    joinRoom(hostId) {
        return new Promise((resolve, reject) => {
            try {
                this.isHost = false;
                this.peer = new Peer('', {
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun.stunprotocol.org:3478' }
                        ]
                    }
                });

                this.peer.on('open', () => {
                    const conn = this.peer.connect(hostId, {
                        reliable: true
                    });
                    this.conn = conn;
                    this.setupConnection();
                    this.isConnected = true;
                    if (this.onConnected) this.onConnected();
                    resolve();
                });

                this.peer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    if (this.onError) this.onError(err.message);
                    reject(err);
                });

                // 超时
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('连接超时'));
                    }
                }, 15000);

            } catch (err) {
                reject(err);
            }
        });
    }

    setupConnection() {
        this.conn.on('open', () => {
            this.isConnected = true;
        });

        this.conn.on('data', (data) => {
            if (this.onMessage) {
                this.onMessage(data);
            }
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            if (this.onDisconnected) this.onDisconnected();
        });
    }

    // 发送消息
    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
            return true;
        }
        return false;
    }

    // 发送落子
    sendMove(row, col) {
        this.send({ type: 'move', row, col });
    }

    // 发送重开请求
    sendRestart() {
        this.send({ type: 'restart' });
    }

    // 发送重开确认
    sendRestartAccept() {
        this.send({ type: 'restart_accept' });
    }

    // 断开连接
    disconnect() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.isConnected = false;
        this.peerId = null;
    }
}