// ============================================
// CHECKERS SYNTH AUDIO ENGINE (Web Audio API)
// ============================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    playTone(freq, type = 'sine', duration = 0.1, startVolume = 0.3) {
        if (!this.enabled || !this.initialized || !this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(startVolume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playSelect() {
        this.playTone(523.25, 'sine', 0.08, 0.2); // C5 short click
    }

    playMove() {
        this.playTone(329.63, 'triangle', 0.12, 0.3); // E4 slide sound
    }

    playCapture() {
        // Two-stage pop sound for capture
        this.playTone(220, 'sine', 0.1, 0.4);
        setTimeout(() => this.playTone(440, 'triangle', 0.15, 0.3), 60);
    }

    playKing() {
        // Arpeggio fanfare for crowning
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.18, 0.3), idx * 70);
        });
    }

    playHint() {
        this.playTone(880, 'sine', 0.15, 0.2);
    }

    playError() {
        this.playTone(150, 'sawtooth', 0.2, 0.3);
    }

    playVictory() {
        const victorySequence = [
            { f: 523.25, d: 0.15 }, { f: 659.25, d: 0.15 }, { f: 783.99, d: 0.15 },
            { f: 1046.50, d: 0.4 }
        ];
        let delay = 0;
        victorySequence.forEach(item => {
            setTimeout(() => this.playTone(item.f, 'triangle', item.d, 0.4), delay);
            delay += item.d * 1000;
        });
    }

    playDefeat() {
        const defeatSequence = [
            { f: 400, d: 0.2 }, { f: 350, d: 0.2 }, { f: 300, d: 0.2 },
            { f: 220, d: 0.5 }
        ];
        let delay = 0;
        defeatSequence.forEach(item => {
            setTimeout(() => this.playTone(item.f, 'sawtooth', item.d, 0.35), delay);
            delay += item.d * 1000;
        });
    }

    triggerHaptic(pattern = 15) {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {}
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

export const audio = new SoundEngine();

// Auto-initialize audio context on first user interaction (including touch)
const unlockAudio = () => {
    if (!audio.initialized) {
        audio.init();
    }
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('touchend', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
};

document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('keydown', unlockAudio);

