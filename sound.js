// ============= 音效引擎 =============
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.5;
        this.init();
    }

    init() {
        try {
            // 延迟初始化 AudioContext，在首次用户交互时创建
            const initContext = () => {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
                document.removeEventListener('touchstart', initContext);
                document.removeEventListener('click', initContext);
            };
            document.addEventListener('touchstart', initContext);
            document.addEventListener('click', initContext);
        } catch (e) {
            console.warn('Audio not supported');
            this.enabled = false;
        }
    }

    ensureContext() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                return false;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return true;
    }

    playTone(frequency, duration, type = 'sine', volumeMod = 1) {
        if (!this.enabled || !this.ensureContext()) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        gain.gain.setValueAtTime(this.volume * volumeMod, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, volumeMod = 1) {
        if (!this.enabled || !this.ensureContext()) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * volumeMod * 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    // 落子音效
    placePiece() {
        if (!this.enabled) return;
        this.playTone(800, 0.05, 'sine', 0.4);
        this.playNoise(0.03, 0.3);
        // 低频共鸣
        setTimeout(() => this.playTone(200, 0.08, 'sine', 0.15), 10);
    }

    // 胜利音效
    victory() {
        if (!this.enabled || !this.ensureContext()) return;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.4), i * 150);
        });
        setTimeout(() => {
            this.playTone(1047, 0.6, 'sine', 0.5);
            this.playTone(1319, 0.5, 'triangle', 0.3);
        }, notes.length * 150);
    }

    // 失败音效
    defeat() {
        if (!this.enabled) return;
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.25, 'sine', 0.3), i * 200);
        });
    }

    // 平局音效
    draw() {
        if (!this.enabled) return;
        [400, 500, 400, 500].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.3), i * 100);
        });
    }

    // 按钮点击
    click() {
        if (!this.enabled) return;
        this.playTone(1200, 0.05, 'sine', 0.2);
    }

    // 连接成功
    connected() {
        if (!this.enabled) return;
        [523, 659, 784].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'triangle', 0.3), i * 80);
        });
    }

    // 无法落子
    invalid() {
        if (!this.enabled) return;
        this.playTone(150, 0.1, 'square', 0.15);
    }

    // 对手落子提示
    opponentMove() {
        if (!this.enabled) return;
        this.playTone(600, 0.05, 'sine', 0.2);
        this.playTone(900, 0.05, 'sine', 0.15);
    }
}