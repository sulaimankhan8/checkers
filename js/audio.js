// ============================================
// CHECKERS MASTER - AUDIO ENGINE (Web Audio API)
// Full Procedural BGM Soundtrack & Organic SFX
// ============================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.initialized = false;

        // Gain nodes
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;

        // BGM Scheduler state
        this.bgmPlaying = false;
        this.currentStep = 0;
        this.tempo = 88; // BPM
        this.nextNoteTime = 0;
        this.timerID = null;
        this.scheduleAheadTime = 0.15; // 150ms lookahead
        this.lookaheadInterval = 35; // 35ms tick
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // SFX Sub-bus
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.7 : 0, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            // BGM Sub-bus
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);

            this.initialized = true;

            // Start BGM if music is enabled
            if (this.musicEnabled) {
                this.startBgm();
            }
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.sfxEnabled = false;
            this.musicEnabled = false;
        }
    }

    resumeContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ============================================
    // PROCEDURAL BGM SOUNDTRACK (Lo-Fi Chill Chess/Checkers Theme)
    // ============================================

    startBgm() {
        if (!this.initialized || this.bgmPlaying || !this.ctx) return;
        this.resumeContext();
        this.bgmPlaying = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;

        // Smooth fade-in
        if (this.bgmGain) {
            this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.bgmGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            this.bgmGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + 1.2);
        }

        this.bgmScheduler();
    }

    stopBgm() {
        if (!this.bgmPlaying) return;
        this.bgmPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        if (this.bgmGain && this.ctx) {
            this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.bgmGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        }
    }

    bgmScheduler() {
        if (!this.bgmPlaying || !this.ctx) return;

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleBeat(this.currentStep, this.nextNoteTime);
            this.advanceBeat();
        }

        this.timerID = setTimeout(() => this.bgmScheduler(), this.lookaheadInterval);
    }

    advanceBeat() {
        const secondsPerBeat = 60.0 / this.tempo;
        const secondsPer16th = secondsPerBeat / 4; // 16th-note steps
        this.nextNoteTime += secondsPer16th;
        this.currentStep = (this.currentStep + 1) % 64; // 4-bar loop (16 * 4 = 64 steps)
    }

    scheduleBeat(step, time) {
        const barIndex = Math.floor(step / 16);
        const beatInBar = step % 16;

        // Chord progression across 4 bars:
        // Bar 0: Cmaj7 [C3, G3, B3, E4] + Bass C2
        // Bar 1: Am7   [A2, E3, G3, C4] + Bass A1
        // Bar 2: Fmaj7 [F2, C3, E3, A3] + Bass F1
        // Bar 3: G9    [G2, D3, F3, B3, A4] + Bass G1
        const chordProfiles = [
            { bass: 65.41, pad: [130.81, 196.00, 246.94, 329.63] }, // C2, C3, G3, B3, E4
            { bass: 55.00, pad: [110.00, 164.81, 196.00, 261.63] }, // A1, A2, E3, G3, C4
            { bass: 43.65, pad: [87.31, 130.81, 164.81, 220.00] },  // F1, F2, C3, E3, A3
            { bass: 49.00, pad: [98.00, 146.83, 174.61, 246.94] }   // G1, G2, D3, F3, B3
        ];

        const chord = chordProfiles[barIndex];

        // 1. Sustained ambient Pad chord on step 0 of each bar
        if (beatInBar === 0) {
            this.playSynthPad(chord.pad, time, (60.0 / this.tempo) * 3.8);
            this.playSynthBass(chord.bass, time, (60.0 / this.tempo) * 3.6);
        }

        // 2. Gentle rhythmic pulse / marimba pluck arpeggios
        const melodyPattern = [
            // Bar 0: Cmaj7 vibes
            { step: 0, freq: 523.25 }, { step: 3, freq: 659.25 }, { step: 6, freq: 783.99 },
            { step: 10, freq: 659.25 }, { step: 12, freq: 587.33 }, { step: 14, freq: 523.25 },
            // Bar 1: Am7 vibes
            { step: 16, freq: 440.00 }, { step: 19, freq: 523.25 }, { step: 22, freq: 659.25 },
            { step: 26, freq: 783.99 }, { step: 28, freq: 659.25 }, { step: 30, freq: 523.25 },
            // Bar 2: Fmaj7 vibes
            { step: 32, freq: 349.23 }, { step: 35, freq: 440.00 }, { step: 38, freq: 523.25 },
            { step: 42, freq: 659.25 }, { step: 44, freq: 523.25 }, { step: 46, freq: 440.00 },
            // Bar 3: G9 / resolution vibes
            { step: 48, freq: 392.00 }, { step: 51, freq: 493.88 }, { step: 54, freq: 587.33 },
            { step: 58, freq: 783.99 }, { step: 60, freq: 659.25 }, { step: 62, freq: 587.33 }
        ];

        const melNote = melodyPattern.find(m => m.step === step);
        if (melNote) {
            this.playSynthPluck(melNote.freq, time, 0.45, 0.12);
        }

        // 3. Ambient vinyl click / soft percussion texture on 8th notes
        if (beatInBar % 4 === 0) {
            this.playSoftPercussion(time, beatInBar === 0 ? 'kick' : 'click');
        } else if (beatInBar % 2 === 0) {
            this.playSoftPercussion(time, 'shaker');
        }
    }

    playSynthPad(frequencies, time, duration) {
        if (!this.musicEnabled || !this.ctx) return;
        try {
            frequencies.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, time);

                // Warm detune
                osc.detune.setValueAtTime((Math.random() - 0.5) * 8, time);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(650, time);
                filter.frequency.linearRampToValueAtTime(950, time + duration * 0.5);
                filter.frequency.linearRampToValueAtTime(600, time + duration);

                // Gentle swelling envelope
                gain.gain.setValueAtTime(0.0001, time);
                gain.gain.linearRampToValueAtTime(0.035, time + 0.6);
                gain.gain.setValueAtTime(0.035, time + duration - 0.6);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.bgmGain);

                osc.start(time);
                osc.stop(time + duration);
            });
        } catch (e) {}
    }

    playSynthBass(freq, time, duration) {
        if (!this.musicEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, time);

            gain.gain.setValueAtTime(0.0001, time);
            gain.gain.linearRampToValueAtTime(0.08, time + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(time);
            osc.stop(time + duration);
        } catch (e) {}
    }

    playSynthPluck(freq, time, duration = 0.4, vol = 0.12) {
        if (!this.musicEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1600, time);
            filter.frequency.exponentialRampToValueAtTime(400, time + duration);

            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(time);
            osc.stop(time + duration);
        } catch (e) {}
    }

    playSoftPercussion(time, type = 'shaker') {
        if (!this.musicEnabled || !this.ctx) return;
        try {
            if (type === 'kick') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.setValueAtTime(90, time);
                osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
                gain.gain.setValueAtTime(0.05, time);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start(time);
                osc.stop(time + 0.12);
            } else {
                // Subtle filtered noise click
                const bufferSize = this.ctx.sampleRate * 0.03;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(type === 'click' ? 2400 : 5200, time);
                filter.Q.setValueAtTime(3, time);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(type === 'click' ? 0.02 : 0.012, time);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.bgmGain);

                noise.start(time);
                noise.stop(time + 0.03);
            }
        } catch (e) {}
    }

    // ============================================
    // SOUND EFFECTS (SFX)
    // ============================================

    playTone(freq, type = 'sine', duration = 0.1, startVolume = 0.3) {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(startVolume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    // Modern piece slide + wooden click
    playMove() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        try {
            const time = this.ctx.currentTime;
            
            // 1. Smooth slide swoosh
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(260, time);
            osc.frequency.exponentialRampToValueAtTime(360, time + 0.12);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, time);

            gain.gain.setValueAtTime(0.18, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time);
            osc.stop(time + 0.12);

            // 2. Subtle wooden wood-clack at destination
            setTimeout(() => {
                this.playWoodClack(0.25);
            }, 80);
        } catch (e) {}
    }

    playWoodClack(vol = 0.3) {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        try {
            const time = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(380, time);
            osc.frequency.exponentialRampToValueAtTime(140, time + 0.06);

            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.06);
        } catch (e) {}
    }

    // High impact capture crunch & chime
    playCapture() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        try {
            const time = this.ctx.currentTime;
            
            // 1. Initial sharp impact
            this.playWoodClack(0.45);

            // 2. High pop resonance
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, time + 0.02);
            osc.frequency.exponentialRampToValueAtTime(880, time + 0.15);

            gain.gain.setValueAtTime(0.28, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time + 0.02);
            osc.stop(time + 0.18);
        } catch (e) {}
    }

    // Regal Royal Crown Fanfare
    playKing() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        const fanfare = [
            { f: 523.25, d: 0.12, del: 0 },    // C5
            { f: 659.25, d: 0.12, del: 90 },   // E5
            { f: 783.99, d: 0.14, del: 180 },  // G5
            { f: 1046.50, d: 0.45, del: 280 }  // C6
        ];
        fanfare.forEach(note => {
            setTimeout(() => {
                this.playTone(note.f, 'triangle', note.d, 0.38);
            }, note.del);
        });
    }

    // Sparkle crystal hint bell
    playHint() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        const hintNotes = [
            { f: 659.25, d: 0.1, del: 0 },
            { f: 880.00, d: 0.1, del: 70 },
            { f: 1318.51, d: 0.25, del: 140 }
        ];
        hintNotes.forEach(n => {
            setTimeout(() => this.playTone(n.f, 'sine', n.d, 0.22), n.del);
        });
    }

    // UI Click & Button Selection
    playSelect() {
        this.playTone(600, 'sine', 0.04, 0.15);
    }

    // Undo / Rewind whoosh
    playUndo() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        try {
            const time = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, time);
            osc.frequency.exponentialRampToValueAtTime(220, time + 0.16);

            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time);
            osc.stop(time + 0.16);
        } catch (e) {}
    }

    playError() {
        this.playTone(160, 'sawtooth', 0.18, 0.25);
    }

    // Triumphant Victory Orchestration
    playVictory() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        const victorySequence = [
            { f: 523.25, d: 0.15, del: 0 },
            { f: 659.25, d: 0.15, del: 120 },
            { f: 783.99, d: 0.18, del: 240 },
            { f: 1046.50, d: 0.22, del: 380 },
            { f: 880.00, d: 0.16, del: 550 },
            { f: 1046.50, d: 0.6, del: 700 }
        ];
        victorySequence.forEach(item => {
            setTimeout(() => this.playTone(item.f, 'triangle', item.d, 0.45), item.del);
        });
    }

    playDefeat() {
        if (!this.sfxEnabled || !this.initialized || !this.ctx) return;
        this.resumeContext();
        const defeatSequence = [
            { f: 392.00, d: 0.22, del: 0 },
            { f: 349.23, d: 0.22, del: 200 },
            { f: 329.63, d: 0.25, del: 400 },
            { f: 261.63, d: 0.55, del: 650 }
        ];
        defeatSequence.forEach(item => {
            setTimeout(() => this.playTone(item.f, 'sawtooth', item.d, 0.3), item.del);
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
        this.sfxEnabled = !this.sfxEnabled;
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.7 : 0, this.ctx.currentTime);
        }
        if (this.sfxEnabled) {
            this.playSelect();
        }
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            if (!this.bgmPlaying) {
                this.startBgm();
            } else if (this.bgmGain && this.ctx) {
                this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
                this.bgmGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                this.bgmGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + 0.8);
            }
        } else {
            this.stopBgm();
        }
        return this.musicEnabled;
    }
}

export const audio = new SoundEngine();

// Auto-initialize audio context on first user interaction (including touch)
const unlockAudio = () => {
    if (!audio.initialized) {
        audio.init();
    } else {
        audio.resumeContext();
        if (audio.musicEnabled && !audio.bgmPlaying) {
            audio.startBgm();
        }
    }
};

document.addEventListener('click', unlockAudio, { once: false });
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('keydown', unlockAudio);


