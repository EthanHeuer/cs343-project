import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { pixels, rgb } from "./utils.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import Keyboard from "./keyboard.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";
import { GLTFLoader, PLYLoader } from "three/examples/jsm/Addons.js";

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

    SPEED = 5;

    constructor(container) {
        const { scene, renderer, camera } = this;

        // RENDERER SETUP

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        //renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        // SCENE SETUP

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 10);
        hemiLight.position.set(0, 1, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(75, 300, -75);
        dirLight.position.normalize();
        scene.add(dirLight);

        scene.fog = new THREE.Fog(0xa0a0a0, 500, 1000);

        // CAMERA SETUP

        this.controls = new PointerLockControls(camera, container);

        scene.add(this.controls.getObject());

        // WORLD SETUP

        this.sun = new THREE.Vector3();

        this.buildWater();
        this.buildSky();
        //this.buildSkybox();
        this.buildTerrain();

        // Load models

        const loader = new GLTFLoader();
        loader.load("models/pony_cartoon/scene.gltf", (gltf) => {
            const model = gltf.scene;

            const meshes = [];

            model.traverse((child) => {
                // @ts-ignore
                if (child.isMesh) {
                    meshes.push(child);
                }
            });

            meshes.forEach((mesh) => {
                mesh.material.metalness = 0;
            });

            model.position.set(35, 2.8, 716);

            scene.add(model);
        }, undefined, (error) => {
            console.error(error);
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

    buildSky() {
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
    }

    buildSkybox() {
        const { scene } = this;

        const path = "textures/skybox/";
        const format = ".png";
        const urls = [
            path + "px" + format, path + "nx" + format,
            path + "py" + format, path + "ny" + format,
            path + "pz" + format, path + "nz" + format
        ];

        const textureCube = new THREE.CubeTextureLoader().load(urls);
        scene.background = textureCube;
    }

    buildWater() {
        const { scene } = this;

        const waterGeometry = new THREE.PlaneGeometry(640 * 32, 512 * 32, 1, 1);

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
                distortionScale: 2,
                fog: true
            }
        );
        this.water.rotation.x = -Math.PI / 2;
        this.water.material.uniforms["size"].value = 10;

        scene.add(this.water);
    }

    buildTerrain() {
        const { scene } = this;

        const loader = new THREE.TextureLoader();
        const texture = loader.load("heightmaps/Tamriel-low.png", (texture) => {
            const data = pixels(texture);
            const { width, height } = texture.image;
            const scalar = 32;

            const planeGeometry = new THREE.PlaneGeometry(width * scalar, height * scalar, width - 1, height - 1);
            planeGeometry.rotateX(-Math.PI / 2);

            const heightMap = [];

            for (let i = 0; i < data.length; i += 4) {
                heightMap.push(data[i] / 255);
            }

            const smoothHeightMap = [];
            const radius = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0;
                    let count = 0;

                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;

                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                sum += heightMap[ny * width + nx];
                                count++;
                            }
                        }
                    }

                    smoothHeightMap[y * width + x] = sum / count;
                }
            }

            for (let i = 0; i < width * height; i++) {
                planeGeometry.attributes.position.array[i * 3 + 1] = smoothHeightMap[i] * 1600 - 700;
            }

            planeGeometry.computeVertexNormals();

            const tileSize = 1;

            const grassDiffuse = new THREE.TextureLoader().load("textures/grass/grass-diff.png");
            grassDiffuse.wrapS = THREE.RepeatWrapping;
            grassDiffuse.wrapT = THREE.RepeatWrapping;
            grassDiffuse.repeat.set(640 / tileSize, 512 / tileSize);
            grassDiffuse.minFilter = THREE.NearestMipMapLinearFilter;
            grassDiffuse.colorSpace = THREE.SRGBColorSpace;

            const grassNormal = new THREE.TextureLoader().load("textures/grass/grass-norm.png");
            grassNormal.wrapS = THREE.RepeatWrapping;
            grassNormal.wrapT = THREE.RepeatWrapping;
            grassNormal.repeat.set(640 / tileSize, 512 / tileSize);
            grassNormal.minFilter = THREE.NearestMipMapLinearFilter;
            grassNormal.colorSpace = THREE.SRGBColorSpace;

            const grassAo = new THREE.TextureLoader().load("textures/grass/grass-ao.png");
            grassAo.wrapS = THREE.RepeatWrapping;
            grassAo.wrapT = THREE.RepeatWrapping;
            grassAo.repeat.set(640 / tileSize, 512 / tileSize);
            grassAo.minFilter = THREE.NearestMipMapLinearFilter;
            grassAo.colorSpace = THREE.SRGBColorSpace;

            this.terrain = new THREE.Mesh(planeGeometry, new THREE.MeshStandardMaterial({
                map: grassDiffuse,
                normalMap: grassNormal,
                aoMap: grassAo
            }));
            this.terrain.receiveShadow = true;

            scene.add(this.terrain);
        });
        texture.dispose();
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

        controls.moveRight(velocity.x * this.SPEED * delta);
        controls.moveForward(velocity.z * this.SPEED * delta);
        controls.getObject().position.y += velocity.y * this.SPEED * delta;

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
