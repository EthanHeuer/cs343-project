import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { blurMap, createPlane, loadGLTF, loadTerrainTexture, pixels, rgb } from "../utils.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import Keyboard from "./keyboard.js";
import World from "./world.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const movementSpeedOptions = {
    "Slow (x5)": 5,
    "Normal (x10)": 10,
    "Fast (x50)": 50,
    "Faster (x100)": 100,
    "Fastest (x500)": 500
};

const powerPreferenceOptions = {
    "Default": "default",
    "Low Power": "low-power",
    "High Performance": "high-performance"
};

const precisionOptions = {
    "High": "highp",
    "Medium": "mediump",
    "Low": "lowp"
};

const cellSizeOptions = {
    "64": 64,
    "128": 128,
    "256": 256,
    "512": 512,
    "1024": 1024
};

const radiusOptions = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5
};

export default class App {
    renderer;
    container;
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    stats = new Stats();
    gui = new GUI();
    board = new Keyboard();
    camera;
    controls;
    world;

    settings = {
        misc: {
            movementSpeed: 10,
            showFPS: true
        },
        cellManager: {
            cellSize: 128,
            radius: 5
        },
        performance: {
            antialias: true,
            powerPreference: "high-performance",
            precision: "highp"
        }
    };

    /**
     * @param {HTMLElement} container
     */
    constructor(container) {
        this.container = container;

        // RENDERER SETUP

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", precision: "highp" });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.localClippingEnabled = true;

        // CAMERA SETUP

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.controls = new PointerLockControls(this.camera, container);
        this.scene.add(this.controls.getObject());

        // WORLD SETUP

        this.world = new World(this.scene, 640 * 32, 512 * 32, this.settings.cellManager.cellSize, this.settings.cellManager.radius);

        this.controls.getObject().position.set(10290, 10, 8920);

        const ambientLight = new THREE.AmbientLight(0xffffff);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 3);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(1, 1, 1);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        const d = 50;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 2);
        hemiLight.position.set(0, 1, 0);
        this.scene.add(hemiLight);

        this.scene.fog = new THREE.Fog(new THREE.Color().setHSL(0.6, 0, 1), 1000, 2000);

        const path = "textures/skybox/";
        const format = ".png";
        const urls = [
            path + "px" + format, path + "nx" + format,
            path + "py" + format, path + "ny" + format,
            path + "pz" + format, path + "nz" + format
        ];

        const textureCube = new THREE.CubeTextureLoader().load(urls);
        this.scene.background = textureCube;

        const tileSize = 20480 / this.world.cellManager.cellSize;
        const grassDiff = loadTerrainTexture("textures/grass/grass-diff.png", tileSize);
        const grassNorm = loadTerrainTexture("textures/grass/grass-norm.png", tileSize);
        const grassAo = loadTerrainTexture("textures/grass/grass-ao.png", tileSize);

        const terrainMaterialLow = new THREE.MeshStandardMaterial({
            aoMap: grassAo,
            aoMapIntensity: 0.75,
            color: new THREE.Color(0x70602a),
            clippingPlanes: this.world.clippingPlanes,
            clipIntersection: true
        });

        this.terrainMaterial = new THREE.MeshStandardMaterial({
            map: grassDiff,
            normalMap: grassNorm,
            aoMap: grassAo,
            aoMapIntensity: 0.75
        });

        this.buildTerrain("height-maps/Tamriel-low.png", 0, 0, 0, this.world.width, this.world.height, terrainMaterialLow, (terrain) => {
            terrain.translateY(-20);
        });

        this.scene.add(this.world.water);

        // LOAD MODELS

        loadGLTF("models/pony_cartoon/scene.gltf", (model) => {
            model.traverse((/** @type {THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>} */ mesh) => {
                if (mesh.isMesh) {
                    mesh.material.metalness = 0;
                }
            });

            model.position.set(10277, 2.8, 8908);
            model.scale.set(5, 5, 5);
            this.controls.getObject().lookAt(model.position.clone().setY(6));
            this.scene.add(model);
        });

        // DOM SETUP

        container.appendChild(this.renderer.domElement);
        container.appendChild(this.stats.dom);

        container.addEventListener("click", () => {
            this.controls.lock();
        });

        window.addEventListener("keydown", event => this.board.onKeyDown(event));
        window.addEventListener("keyup", event => this.board.onKeyUp(event));
        window.addEventListener("resize", this.onWindowResize.bind(this));

        this.createGUI();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.draw();
        this.stats.update();
    }

    update() {
        const { board: controller, controls } = this;
        const delta = this.clock.getDelta();

        const velocity = new THREE.Vector3();

        if (controller.keys[Keyboard.KEY.W]) {
            velocity.z += 1;
        }

        if (controller.keys[Keyboard.KEY.S]) {
            velocity.z += -1;
        }

        if (controller.keys[Keyboard.KEY.A]) {
            velocity.x += -1;
        }

        if (controller.keys[Keyboard.KEY.D]) {
            velocity.x += 1;
        }

        velocity.normalize();

        if (controller.keys[Keyboard.KEY.SPACE]) {
            velocity.y += 1;
        }

        if (controller.keys[Keyboard.KEY.SHIFT]) {
            velocity.y += -1;
        }

        controls.moveRight(velocity.x * this.settings.misc.movementSpeed * delta);
        controls.moveForward(velocity.z * this.settings.misc.movementSpeed * delta);
        controls.getObject().position.y += velocity.y * this.settings.misc.movementSpeed * delta;

        this.world.water.material.uniforms["time"].value += 1.0 / 120.0;

        this.world.update(controls.getObject().position.x, controls.getObject().position.z, (cell) => {
            this.buildTerrain("height-maps/Tamriel-mid.png", 3, cell.x, cell.y, this.world.cellManager.cellSize, this.world.cellManager.cellSize, this.terrainMaterial, (terrain) => {
                cell.mesh = terrain;
                cell.loading = false;
            });
        });
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}



/**
 * @param {string} url
 * @param {number} smoothingRadius
 * @param {number} clipX
 * @param {number} clipY
 * @param {number} clipWidth
 * @param {number} clipHeight
 * @param {THREE.Material} material
 * @param {(terrain: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>) => void} onLoad
 */
App.prototype.buildTerrain = function (url, smoothingRadius, clipX, clipY, clipWidth, clipHeight, material, onLoad) {
    const texture = new THREE.TextureLoader().load(url, (texture) => {
        const textureWidth = texture.image.width;
        const textureHeight = texture.image.height;

        const scaleClipX = clipX / this.world.width * (textureWidth - 1);
        const scaleClipY = clipY / this.world.height * (textureHeight - 1);
        const scaleClipWidth = clipWidth / this.world.width * (textureWidth - 1) + 1;
        const scaleClipHeight = clipHeight / this.world.height * (textureHeight - 1) + 1;

        const data = pixels(texture, scaleClipX - smoothingRadius, scaleClipY - smoothingRadius, scaleClipWidth + 2 * smoothingRadius, scaleClipHeight + 2 * smoothingRadius);

        const rawHeightMap = [];

        for (let i = 0; i < data.length; i += 4) {
            const scale = data[i] / 255 * 1600 - 700;
            rawHeightMap.push(scale);
        }

        const smoothMap = blurMap(rawHeightMap, scaleClipWidth + 2 * smoothingRadius, scaleClipHeight + 2 * smoothingRadius, smoothingRadius);

        const heightMap = [];

        for (let y = smoothingRadius; y < scaleClipHeight + smoothingRadius; y++) {
            for (let x = smoothingRadius; x < scaleClipWidth + smoothingRadius; x++) {
                heightMap.push(smoothMap[y * (scaleClipWidth + 2 * smoothingRadius) + x]);
            }
        }

        const planeGeometry = createPlane(clipX, clipY, clipWidth, clipHeight, scaleClipWidth - 1, scaleClipHeight - 1, heightMap);
        const terrain = new THREE.Mesh(planeGeometry, material);
        terrain.receiveShadow = true;

        this.scene.add(terrain);

        onLoad(terrain);
    });
    texture.dispose();
};



App.prototype.createGUI = function () {

    // MISC FOLDER

    const folderMisc = this.gui.addFolder("Miscellaneous");

    folderMisc.add(this.settings.misc, "movementSpeed", movementSpeedOptions);

    folderMisc.add(this.settings.misc, "showFPS").onChange((value) => {
        if (value) {
            this.stats.dom.style.display = "block";
        } else {
            this.stats.dom.style.display = "none";
        }
    });

    // CELL MANAGER FOLDER

    const folderCellManager = this.gui.addFolder("Cell Manager");

    folderCellManager.add(this.settings.cellManager, "cellSize", cellSizeOptions).onChange((value) => {
        this.world.cellManager.cellSize = value;

        this.world.cellManager.cells.forEach((cell) => {
            this.scene.remove(cell.mesh);
        });

        this.world.cellManager.cells = [];
    });

    folderCellManager.add(this.settings.cellManager, "radius", radiusOptions).onChange((value) => {
        this.world.cellManager.radius = value;

        this.world.cellManager.cells.forEach((cell) => {
            this.scene.remove(cell.mesh);
        });

        this.world.cellManager.cells = [];
    });

    // PERFORMANCE FOLDER

    const folderPerformance = this.gui.addFolder("Performance");

    folderPerformance.add(this.settings.performance, "powerPreference", powerPreferenceOptions).onChange((value) => {
        this.container.removeChild(this.renderer.domElement);
        this.renderer.dispose();
        this.renderer = new THREE.WebGLRenderer({ antialias: this.settings.performance.antialias, powerPreference: value, precision: this.settings.performance.precision });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.localClippingEnabled = true;
        this.container.appendChild(this.renderer.domElement);
    });

    folderPerformance.add(this.settings.performance, "precision", precisionOptions).onChange((value) => {
        this.container.removeChild(this.renderer.domElement);
        this.renderer.dispose();
        this.renderer = new THREE.WebGLRenderer({ antialias: this.settings.performance.antialias, powerPreference: this.settings.performance.powerPreference, precision: value });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.localClippingEnabled = true;
        this.container.appendChild(this.renderer.domElement);
    });

    folderPerformance.add(this.settings.performance, "antialias").onChange((value) => {
        this.container.removeChild(this.renderer.domElement);
        this.renderer.dispose();
        this.renderer = new THREE.WebGLRenderer({ antialias: value, powerPreference: this.settings.performance.powerPreference, precision: this.settings.performance.precision });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.localClippingEnabled = true;
        this.container.appendChild(this.renderer.domElement);
    });
};
