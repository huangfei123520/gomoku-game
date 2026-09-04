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

            } catch (err) {
                reject(err);
            }
        });
    }

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
                    const conn = this.peer.connect(hostId, { reliable: true });
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
            if (this.onMessage) this.onMessage(data);
        });
        this.conn.on('close', () => {
            this.isConnected = false;
            if (this.onDisconnected) this.onDisconnected();
        });
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
            return true;
        }
        return false;
    }

    sendMove(row, col) { this.send({ type: 'move', row, col }); }
    sendRestart() { this.send({ type: 'restart' }); }
    sendRestartAccept() { this.send({ type: 'restart_accept' }); }

    disconnect() {
        if (this.conn) { this.conn.close(); this.conn = null; }
        if (this.peer) { this.peer.destroy(); this.peer = null; }
        this.isConnected = false;
        this.peerId = null;
    }
}
