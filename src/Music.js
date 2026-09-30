// The game's theme track - see theme.wav at the project root (a generated
// placeholder chiptune loop; swap the file for a real recorded track later
// without touching the on/off wiring in Game.js's "Музика" checkbox).
export default class Music {

    #audio;
    #isPlaying = false;

    constructor(src = "./theme.wav") {
        this.#audio = new Audio(src);
        this.#audio.loop = true;
        this.#audio.volume = 0.35;
        this.#audio.preload = "auto";
    }

    get isPlaying() {
        return this.#isPlaying;
    }

    toggle() {
        if (this.#isPlaying) {
            this.stop();
        }
        else {
            this.start();
        }
        return this.#isPlaying;
    }

    // Must be called from a user-gesture handler (click/tap) - browsers
    // refuse unsolicited audio playback otherwise.
    start() {
        if (this.#isPlaying) {
            return;
        }
        this.#isPlaying = true;
        this.#audio.play().catch(() => {
            this.#isPlaying = false;
        });
    }

    stop() {
        this.#isPlaying = false;
        this.#audio.pause();
    }
}
