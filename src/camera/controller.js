import Mouse from "./mouse.js";

export default class Controller {
    mouse = new Mouse();
    keys = {};
    previousKeys = {};

    constructor() {
        document.addEventListener("mousedown", event => this.onMouseDown(event), false);
        document.addEventListener("mouseup", event => this.onMouseUp(event), false);
        document.addEventListener("mousemove", event => this.onMouseMove(event), false);
        document.addEventListener("keydown", event => this.onKeyDown(event), false);
        document.addEventListener("keyup", event => this.onKeyUp(event), false);
    }

    onMouseDown(event) {}

    onMouseUp(event) {}

    onMouseMove(event) {
        this.mouse.x = event.pageX - window.innerWidth / 2;
        this.mouse.y = event.pageY - window.innerHeight / 2;
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = true;
    }

    onKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = false;
    }

    update(elapsedTime = 1) {
        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
    }
}
