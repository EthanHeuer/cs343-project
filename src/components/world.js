import * as THREE from "three";
import { Cell, CellManager } from "./cell-manager.js";
import { Water } from "three/addons/objects/Water.js";

export default class World {
    scene;
    width;
    height;
    cellManager;

    /** @type {THREE.Plane[]} */
    clippingPlanes = [];

    sun;
    water;
    /** @type {THREE.Mesh<THREE.PlaneGeometry, THREE.Material>} */
    terrainMaterial;

    /**
     * @param {THREE.Scene} scene
     * @param {number} width
     * @param {number} height
     * @param {number} cellSize
     * @param {number} radius
     */
    constructor(scene, width, height, cellSize, radius) {
        this.scene = scene;
        this.width = width;
        this.height = height;

        this.cellManager = new CellManager(cellSize, radius);

        this.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), -this.cellManager.cellScale),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), -this.cellManager.cellScale),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.cellManager.cellScale),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), -this.cellManager.cellScale)
        ];

        this.sun = new THREE.Vector3();

        const waterGeometry = new THREE.PlaneGeometry(this.width, this.height, 100, 100);
        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load("textures/water-norm.jpg", (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                }),
                waterColor: 0x05373b,
                distortionScale: 2,
                fog: true
            }
        );
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.x = 0.5 * (640 * 32 + 1);
        this.water.position.z = 0.5 * (512 * 32 + 1);
        this.water.material.uniforms["size"].value = 2;
    }

    /**
     * Rounds a number down to the nearest cell.
     * @param {number} x
     */
    floor(x) {
        return Math.floor(x / this.cellManager.cellSize) * this.cellManager.cellSize;
    }

    /**
     * Rounds a number up to the nearest cell.
     * @param {number} x
     */
    ceil(x) {
        const frac = x / this.cellManager.cellSize;
        let round = Math.ceil(frac);

        if (frac === round) {
            round += 1;
        }

        return round * this.cellManager.cellSize;
    }

    /**
     * Creates a cell at the given X and Y coordinate. If a cell already exists at the given coordinate, it will be returned.
     * @param {number} x
     * @param {number} y
     */
    createCell(x, y) {
        const existing = this.cellManager.cells.find((cell) => cell.x === x && cell.y === y);

        if (existing) {
            return existing;
        }

        const cell = new Cell(x, y);
        this.cellManager.cells.push(cell);
        return cell;
    }

    /**
     * Takes an X and Y coordinate and updates the worlds cells. If a cell is not visible it will be removed from the scene. If a cell is visible and has no mesh, onCreate will be called.
     * @param {number} newX
     * @param {number} newY
     * @param {(cell: Cell) => void} onCreate
     */
    update(newX, newY, onCreate) {
        const fx = this.floor(newX);
        const fy = this.floor(newY);

        if (fx === this.cellManager.centerCellX && fy === this.cellManager.centerCellY) {
            return;
        }

        const cx = this.ceil(newX);
        const cy = this.ceil(newY);

        this.cellManager.centerCellX = fx;
        this.cellManager.centerCellY = fy;

        // Update clipping planes

        this.clippingPlanes[0].constant = -cx - this.cellManager.cellScale;
        this.clippingPlanes[1].constant = fx - this.cellManager.cellScale;
        this.clippingPlanes[2].constant = -cy - this.cellManager.cellScale;
        this.clippingPlanes[3].constant = fy - this.cellManager.cellScale;

        this.cellManager.cells.forEach((cell) => {
            cell.visible = false;
        });

        // Create cells

        for (let y = -this.cellManager.radius; y <= this.cellManager.radius; y++) {
            for (let x = -this.cellManager.radius; x <= this.cellManager.radius; x++) {
                const dx = fx + x * this.cellManager.cellSize;
                const dy = fy + y * this.cellManager.cellSize;

                const cell = this.createCell(dx, dy);
                cell.visible = true;

                if (cell.mesh === undefined && !cell.loading) {
                    cell.loading = true;

                    setTimeout(() => {
                        onCreate(cell);
                        this.cellManager.queue--;
                    }, this.cellManager.queue * this.cellManager.queueDelay);

                    this.cellManager.queue++;
                }
            }
        }

        // Render cells

        this.cellManager.cells.forEach((cell) => {
            if (!cell.visible) {
                this.scene.remove(cell.mesh);
            } else if (cell.mesh !== undefined) {
                if (!this.scene.children.includes(cell.mesh)) {
                    this.scene.add(cell.mesh);
                }
            }
        });
    }
}
