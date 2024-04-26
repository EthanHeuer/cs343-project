import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { loadGLTF, pixels, rgb } from "./utils.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import Keyboard from "./keyboard.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";

export default class App {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    clock = new THREE.Clock();
    stats = new Stats();
    board = new Keyboard();
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls;
    terrain;
    sun;
    sky;
    water;

    movementSpeed = 5;

    constructor(container) {
        const { scene, renderer, camera } = this;

        // RENDERER SETUP

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;

        // CAMERA SETUP

        this.controls = new PointerLockControls(camera, container);

        scene.add(this.controls.getObject());

        // WORLD SETUP

        const ambientLight = new THREE.AmbientLight(0x404040);
        ambientLight.name = "light-ambient";
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
        hemiLight.position.set(0, 1, 0);
        hemiLight.name = "light-hemi";
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(75, 300, -75);
        dirLight.position.normalize();
        dirLight.castShadow = true;
        dirLight.name = "light-dir";
        scene.add(dirLight);

        scene.fog = new THREE.Fog(0xa0a0a0, 500, 1000);

        this.sun = new THREE.Vector3();
        scene.background = createSkybox();
        this.buildWater();
        this.buildTerrain();

        // LOAD MODELS

        loadGLTF("models/pony_cartoon/scene.gltf", (model) => {
            model.position.set(35, 2.8, 716);
            scene.add(model);
        });

        this.controls.getObject().position.set(37, 5, 718);
        this.controls.getObject().lookAt(35, 2.8, 716);

        // DOM SETUP

        container.appendChild(renderer.domElement);
        container.appendChild(this.stats.dom);

        window.addEventListener("resize", this.onWindowResize.bind(this));

        container.addEventListener("click", () => {
            this.controls.lock();
        });
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

        if (controller.keys["w"]) {
            velocity.z += 1;
        }

        if (controller.keys["s"]) {
            velocity.z += -1;
        }

        if (controller.keys["a"]) {
            velocity.x += -1;
        }

        if (controller.keys["d"]) {
            velocity.x += 1;
        }

        velocity.normalize();

        if (controller.keys[" "]) {
            velocity.y += 1;
        }

        if (controller.keys["shift"]) {
            velocity.y += -1;
        }

        controls.moveRight(velocity.x * this.movementSpeed * delta);
        controls.moveForward(velocity.z * this.movementSpeed * delta);
        controls.getObject().position.y += velocity.y * this.movementSpeed * delta;

        this.water.material.uniforms["time"].value += 1.0 / 120.0;
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const { camera, renderer } = this;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

App.prototype.buildWater = function () {
    const { scene } = this;

    const waterGeometry = new THREE.PlaneGeometry(641 * 32, 513 * 32, 640, 512);

    this.water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load("textures/water-norm.jpg", (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
            }),
            waterColor: 0x0b4d52,
            distortionScale: 5,
            fog: true
        }
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.material.uniforms["size"].value = 10;

    scene.add(this.water);
};

function loadTileTexture(url, tileSize) {
    const texture = new THREE.TextureLoader().load(url);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(640 / tileSize, 512 / tileSize);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 1;

    return texture;
};

App.prototype.buildTerrain = function () {
    const { scene } = this;

    const loader = new THREE.TextureLoader();
    const texture = loader.load("heightmaps/Tamriel-low.png", (texture) => {
        const data = pixels(texture);
        const { width, height } = texture.image;
        const scalar = 32;

        const heightMap = [];

        for (let i = 0; i < data.length; i += 4) {
            const scale = data[i] / 255 * 1600 - 700;
            heightMap.push(scale);
        }

        const planeGeometry = createPlane(width * scalar, height * scalar, width - 1, height - 1, heightMap);

        const tileSize = 1;

        const grassDiff = loadTileTexture("textures/grass/grass-diff.png", tileSize);
        const grassNorm = loadTileTexture("textures/grass/grass-norm.png", tileSize);
        const grassAo = loadTileTexture("textures/grass/grass-ao.png", tileSize);

        this.terrain = new THREE.Mesh(planeGeometry, new THREE.MeshStandardMaterial({
            map: grassDiff,
            normalMap: grassNorm,
            aoMap: grassAo
        }));
        this.terrain.receiveShadow = true;

        scene.add(this.terrain);

        grassDiff.dispose();
        grassNorm.dispose();
        grassAo.dispose();
    });
    texture.dispose();
};

App.prototype.buildTerrain2 = function () {
    const { scene } = this;

    new THREE.TextureLoader().load("heightmaps/Tamriel-high.png", (texture) => {
        const { width, height } = texture.image;

        const chunkSize = 1024;

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        const xStart = 0.5 * (width - 1) - chunkSize * 0.5;
        const yStart = 0.5 * (height - 1) - chunkSize * 0.5;
        const xEnd = xStart + chunkSize;
        const yEnd = yStart + chunkSize;

        const data = pixels(texture, xStart, yStart, chunkSize, chunkSize);

        const heightMap = [];

        for (let i = 0; i < data.length; i += 4) {
            const scale = data[i] / 255 * 1600 - 700;
            heightMap.push(scale);
        }

        const smoothMap = blurMap(heightMap, chunkSize, chunkSize, 9);

        const offset = vertices.length;

        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                const i = (y - yStart) * chunkSize + (x - xStart);

                vertices.push(x - (width - 1) * 0.5, smoothMap[i], y - (height - 1) * 0.5);
            }
        }

        for (let y = 0; y < chunkSize - 1; y++) {
            for (let x = 0; x < chunkSize - 1; x++) {
                const i = y * chunkSize + x + offset;

                indices.push(i, i + chunkSize, i + 1);
                indices.push(i + 1, i + chunkSize, i + chunkSize + 1);
            }
        }

        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const tileSize = 1;

        const grassDiff = loadTileTexture("textures/grass/test.png", tileSize);

        this.terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            map: grassDiff
        }));
        this.terrain.receiveShadow = true;

        scene.add(this.terrain);
    });
};

App.prototype.buildSky = function () {
    const { scene, renderer } = this;

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);

    const skyUniforms = this.sky.material.uniforms;

    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    const parameters = {
        elevation: 15,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
    this.water.material.uniforms["sunDirection"].value.copy(this.sun).normalize();

    sceneEnv.add(this.sky);
    const renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(this.sky);

    scene.environment = renderTarget.texture;
    scene.environmentIntensity = 0;
};

function createSkybox() {
    const path = "textures/skybox/";
    const format = ".png";
    const urls = [
        path + "px" + format, path + "nx" + format,
        path + "py" + format, path + "ny" + format,
        path + "pz" + format, path + "nz" + format
    ];

    const textureCube = new THREE.CubeTextureLoader().load(urls);

    return textureCube;
};

function blurMap(map, width, height, radius = 0) {
    const mapCopy = new Float32Array(map);
    const outMap = new Float32Array(map);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        sum += mapCopy[ny * width + nx];
                        count++;
                    }
                }
            }

            outMap[y * width + x] = sum / count;
        }
    }

    return outMap;
}

function createPlane(width, height, widthSegments, heightSegments, heightMap) {
    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    geometry.rotateX(-Math.PI / 2);

    for (let i = 0; i < geometry.attributes.position.array.length; i += 3) {
        geometry.attributes.position.array[i + 1] = heightMap[i / 3];
    }

    geometry.computeVertexNormals();

    return geometry;
}
