const KEY = Object.freeze({
    W: "w",
    A: "a",
    S: "s",
    D: "d",
    SPACE: " ",
    SHIFT: "shift",
});

export default class Keyboard {
    /** @type {Object<string, boolean>} */
    keys = {};

    /**
     * @param {KeyboardEvent} event
     */
    onKeyDown(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = true;
    }

    /**
     * @param {KeyboardEvent} event
     */
    onKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = false;
    }

    static get KEY() {
        return KEY;
    }
}
