// Audio Engine using Tone.js

class AudioEngine {
    constructor() {
        this.isInitialized = false;
        this.isPlaying = false;
        this.synths = [];
        this.loops = [];
    }

    async init() {
        if (this.isInitialized) return;

        await Tone.start();
        console.log("Audio Context Started");

        // Master Effects
        this.reverb = new Tone.Reverb({
            decay: 10,
            wet: 0.5
        }).toDestination();

        this.delay = new Tone.FeedbackDelay({
            delayTime: "8n",
            feedback: 0.3,
            wet: 0.2
        }).connect(this.reverb);

        this.filter = new Tone.Filter({
            frequency: 800,
            type: "lowpass",
            rolloff: -12
        }).connect(this.delay);

        // Create Synths
        this.createDrone();
        this.createMelody();

        this.isInitialized = true;
    }

    createDrone() {
        const drone = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: "fatsine",
                count: 3,
                spread: 30
            },
            envelope: {
                attack: 2,
                decay: 1,
                sustain: 1,
                release: 2
            }
        }).connect(this.filter);

        drone.volume.value = -12;
        this.synths.push(drone);

        // Slow chord changes
        const chords = [
            ["C3", "E3", "G3", "B3"], // Cmaj7
            ["A2", "C3", "E3", "G3"], // Amin7
            ["F2", "A2", "C3", "E3"], // Fmaj7
            ["G2", "B2", "D3", "F3"]  // G7
        ];

        let chordIndex = 0;

        const loop = new Tone.Loop(time => {
            drone.triggerAttackRelease(chords[chordIndex], "4m", time);
            chordIndex = (chordIndex + 1) % chords.length;
        }, "4m");

        this.loops.push(loop);
    }

    createMelody() {
        const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.05,
                decay: 0.1,
                sustain: 0.1,
                release: 1
            }
        }).connect(this.delay);

        synth.volume.value = -12;
        this.synths.push(synth);

        // Pentatonic scale (C Minor Pentatonic for focus)
        const notes = ["C4", "Eb4", "F4", "G4", "Bb4", "C5"];

        // Phasing Loops Logic
        // We create multiple loops with different prime number intervals to create shifting patterns

        // Loop 1: Every 7 beats
        const loop1 = new Tone.Loop(time => {
            synth.triggerAttackRelease(notes[0], "8n", time);
            if (Math.random() > 0.5) synth.triggerAttackRelease(notes[2], "8n", time + Tone.Time("8n").toSeconds());
        }, "7n");

        // Loop 2: Every 11 beats
        const loop2 = new Tone.Loop(time => {
            const note = notes[Math.floor(Math.random() * notes.length)];
            synth.triggerAttackRelease(note, "8n", time);
        }, "11n");

        // Loop 3: Every 13 beats (lower register)
        const loop3 = new Tone.Loop(time => {
            synth.triggerAttackRelease("C3", "2n", time);
        }, "13n");

        this.loops.push(loop1, loop2, loop3);
    }

    async start() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!this.isPlaying) {
            Tone.Transport.start();
            this.loops.forEach(loop => loop.start(0));
            this.isPlaying = true;
        }
    }

    stop() {
        if (this.isPlaying) {
            Tone.Transport.stop();
            this.loops.forEach(loop => loop.stop());
            // Release all notes
            this.synths.forEach(synth => {
                if (synth.releaseAll) synth.releaseAll();
            });
            this.isPlaying = false;
        }
    }

    setVolume(db) {
        Tone.Destination.volume.rampTo(db, 0.1);
    }
}
