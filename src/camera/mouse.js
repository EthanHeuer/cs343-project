export default class Mouse {
    x = 0;
    y = 0;
    prevX = 0;
    prevY = 0;

    deltaX = () => this.x - this.prevX;
    deltaY = () => this.y - this.prevY;
}
