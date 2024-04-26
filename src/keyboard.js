export default class Keyboard {
    keys = {};
    previousKeys = {};

    constructor() {
        window.addEventListener("keydown", event => this.onKeyDown(event), false);
        window.addEventListener("keyup", event => this.onKeyUp(event), false);
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = true;
    }

    onKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = false;
    }
}
