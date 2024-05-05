import * as THREE from "three";

class Cell {
    x;
    y;
    visible = false;
    loading = false;

    /** @type {THREE.Mesh<THREE.PlaneGeometry, THREE.Material>} */
    mesh;

    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class CellManager {
    centerCellX = 0;
    centerCellY = 0;
    cellSize;
    radius;
    queue = 0;
    queueDelay = 10;

    /** @type {Cell[]} */
    cells = [];

    /**
     * @param {number} cellSize
     * @param {number} radius
     */
    constructor(cellSize, radius) {
        this.cellSize = cellSize;
        this.radius = radius;
    }

    get cellScale() {
        return this.radius * this.cellSize;
    }
}

export { Cell, CellManager };
