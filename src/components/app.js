import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { blurMap, loadGLTF, pixels, rgb } from "../utils.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import Keyboard from "./keyboard.js";
import { Water } from "three/addons/objects/Water.js";
import World from "./world.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export default class App {
    renderer;
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    stats = new Stats();
    gui = new GUI();
    board = new Keyboard();
    camera;
    controls;
    sun;
    water;
    /** @type {THREE.Mesh<THREE.PlaneGeometry, THREE.Material>} */
    terrain;
    terrainMaterial;
    world;
    worker;

    settings = {
        movementSpeed: 10,
        showFPS: true
    };

    /**
     * @param {HTMLElement} container
     */
    constructor(container) {

        // RENDERER SETUP

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
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

        this.world = new World(this.scene, 640 * 32, 512 * 32, 512, 1);

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

        this.sun = new THREE.Vector3();

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

        const waterGeometry = new THREE.PlaneGeometry(this.world.width, this.world.height, 100, 100);

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

        this.scene.add(this.water);

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

        const speed = {
            "Slow (x5)": 5,
            "Normal (x10)": 10,
            "Fast (x50)": 50,
            "Faster (x100)": 100,
            "Fastest (x500)": 500
        };

        this.gui.add(this.settings, "movementSpeed", speed);
        this.gui.add(this.settings, "showFPS").onChange((value) => {
            if (value) {
                this.stats.dom.style.display = "block";
            } else {
                this.stats.dom.style.display = "none";
            }
        });

        this.worker = new Worker("./worker.js");
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

        controls.moveRight(velocity.x * this.settings.movementSpeed * delta);
        controls.moveForward(velocity.z * this.settings.movementSpeed * delta);
        controls.getObject().position.y += velocity.y * this.settings.movementSpeed * delta;

        this.water.material.uniforms["time"].value += 1.0 / 120.0;

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




/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} widthSegments
 * @param {number} heightSegments
 * @param {number[]} heightMap
 */
function createPlane(x, y, width, height, widthSegments, heightSegments, heightMap) {
    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(x + 0.5 * width, 0, y + 0.5 * height);

    for (let i = 0; i < geometry.attributes.position.array.length; i += 3) {
        geometry.attributes.position.array[i + 1] = heightMap[i / 3];
    }

    geometry.computeVertexNormals();

    return geometry;
}



/**
 * @param {string} url
 * @param {number} tileSize
 */
function loadTerrainTexture(url, tileSize) {
    const texture = new THREE.TextureLoader().load(url, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(641 / tileSize, 513 / tileSize);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 1;
    });

    return texture;
}
