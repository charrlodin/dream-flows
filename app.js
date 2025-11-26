// Main Application Logic

class ChronosApp {
    constructor() {
        this.timerDisplay = document.getElementById('time-display');
        this.statusText = document.getElementById('status-text');
        this.audioStatus = document.getElementById('audio-status');
        this.startBtn = document.getElementById('btn-start');

        this.settingsBtn = document.getElementById('btn-settings');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('btn-close-settings');
        this.volumeSlider = document.getElementById('volume-slider');

        this.audioEngine = new AudioEngine();
        this.timer = {
            minutes: 25,
            seconds: 0,
            isRunning: false,
            intervalId: null
        };

        this.dragState = {
            isDragging: false,
            startY: 0,
            startMinutes: 25,
            sensitivity: 5 // pixels per minute change
        };

        this.initEventListeners();
        this.renderTime();
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleState());

        // Settings Modal
        this.settingsBtn.addEventListener('click', () => this.settingsModal.showModal());
        this.closeSettingsBtn.addEventListener('click', () => this.settingsModal.close());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.settingsModal.close();
        });

        // Volume
        this.volumeSlider.addEventListener('input', (e) => {
            this.audioEngine.setVolume(e.target.value);
        });

        // Spacebar Control
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                this.toggleState();
            }
        });

        // Time Flux (Drag Interaction)
        this.timerDisplay.addEventListener('mousedown', (e) => this.startDrag(e));
        window.addEventListener('mousemove', (e) => this.onDrag(e));
        window.addEventListener('mouseup', () => this.endDrag());

        // Touch support
        this.timerDisplay.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        window.addEventListener('touchmove', (e) => this.onDrag(e.touches[0]));
        window.addEventListener('touchend', () => this.endDrag());
    }

    startDrag(e) {
        if (this.timer.isRunning) return; // Lock when running
        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        this.dragState.startMinutes = this.timer.minutes;
        this.dragState.hasMoved = false; // Track if it was a drag or click
        this.timerDisplay.style.cursor = 'ns-resize';
    }

    onDrag(e) {
        if (!this.dragState.isDragging) return;

        const deltaY = this.dragState.startY - e.clientY; // Drag up = positive

        // Threshold check for "Click vs Drag"
        if (Math.abs(deltaY) > 5) {
            this.dragState.hasMoved = true;
        }

        if (!this.dragState.hasMoved) return;

        const deltaMinutes = Math.floor(deltaY / this.dragState.sensitivity);

        let newMinutes = this.dragState.startMinutes + deltaMinutes;
        newMinutes = Math.max(1, Math.min(120, newMinutes)); // Clamp 1-120 mins

        if (newMinutes !== this.timer.minutes) {
            this.timer.minutes = newMinutes;
            this.timer.seconds = 0;
            // Render clear numbers during drag (no glitch)
            this.renderTime();
        }
    }

    endDrag() {
        if (!this.dragState.isDragging) return;

        this.dragState.isDragging = false;
        this.timerDisplay.style.cursor = 'pointer';

        if (!this.dragState.hasMoved) {
            // It was a click!
            this.toggleState();
        } else {
            // It was a drag - trigger a small glitch as confirmation
            this.renderGlitchTime();
            setTimeout(() => this.renderTime(), 200);
        }
    }

    renderGlitchTime() {
        // Glitch effect: Random chars mixed with numbers
        const chars = "0123456789ABCDEF";
        const m = this.timer.minutes.toString().padStart(2, '0');

        // 50% chance to show random char for each digit
        const g1 = Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : m[0];
        const g2 = Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : m[1];

        this.timerDisplay.textContent = `${g1}${g2}:00`;
    }

    async toggleState() {
        if (!this.timer.isRunning) {
            // Start
            await this.audioEngine.start();
            this.startTimer();
            this.startBtn.textContent = "ABORT_SEQUENCE";
            this.statusText.textContent = "SYSTEM_ACTIVE";
            this.audioStatus.textContent = "AUDIO_ONLINE";
            this.timer.isRunning = true;
        } else {
            // Stop
            this.stopTimer();
            this.audioEngine.stop();
            this.startBtn.textContent = "INIT_SEQUENCE";
            this.statusText.textContent = "SYSTEM_IDLE";
            this.audioStatus.textContent = "AUDIO_OFFLINE";
            this.timer.isRunning = false;
        }
    }

    startTimer() {
        if (this.timer.intervalId) clearInterval(this.timer.intervalId);

        this.timer.intervalId = setInterval(() => {
            if (this.timer.seconds === 0) {
                if (this.timer.minutes === 0) {
                    this.completeSession();
                    return;
                }
                this.timer.minutes--;
                this.timer.seconds = 59;
            } else {
                this.timer.seconds--;
            }
            this.renderTime();
        }, 1000);
    }

    stopTimer() {
        if (this.timer.intervalId) {
            clearInterval(this.timer.intervalId);
            this.timer.intervalId = null;
        }
    }

    completeSession() {
        this.stopTimer();
        this.audioEngine.stop();
        this.timer.isRunning = false;
        this.startBtn.textContent = "RESET_SEQUENCE";
        this.statusText.textContent = "SESSION_COMPLETE";
        // Reset to default
        this.timer.minutes = 25;
        this.timer.seconds = 0;
    }

    renderTime() {
        const m = this.timer.minutes.toString().padStart(2, '0');
        const s = this.timer.seconds.toString().padStart(2, '0');
        this.timerDisplay.textContent = `${m}:${s}`;
        document.title = `[${m}:${s}] DREAM.FLOWS`;
    }

    initVisualizer() {
        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 10, 0.1)'; // Fade effect
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (this.timer.isRunning) {
                // Subtle random lines/glitches when active
                ctx.fillStyle = '#ccff00';
                for (let i = 0; i < 3; i++) {
                    if (Math.random() > 0.9) {
                        const x = Math.random() * canvas.width;
                        const y = Math.random() * canvas.height;
                        const w = Math.random() * 100;
                        const h = 1;
                        ctx.fillRect(x, y, w, h);
                    }
                }
            }
            requestAnimationFrame(draw);
        };
        draw();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ChronosApp();
    window.app.initVisualizer();
});
