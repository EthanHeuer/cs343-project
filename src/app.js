import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { pixels, rgb } from "./utils.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import Keyboard from "./keyboard.js";
import { Water } from "three/addons/objects/Water.js";

export default class App {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    clock = new THREE.Clock();
    stats = new Stats();
    board = new Keyboard();
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 5000);
    controls;
    terrain;
    water;

    constructor(container) {
        const { scene, renderer, camera } = this;

        // Renderer setup

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;

        container.appendChild(renderer.domElement);
        container.appendChild(this.stats.dom);

        // Light setup

        scene.add(new THREE.AmbientLight(rgb(0.1, 0.1, 0.1)));

        const directionalLight = new THREE.DirectionalLight(rgb(1, 1, 1), 1);
        directionalLight.castShadow = true;
        directionalLight.target.position.set(1, -1, 1);
        scene.add(directionalLight);

        // Camera setup

        this.controls = new PointerLockControls(camera, container);

        scene.add(this.controls.getObject());

        container.addEventListener("click", () => {
            this.controls.lock();
        });

        // Skybox setup

        const path = "textures/skybox/";
        const format = ".jpg";
        const urls = [
            path + "px" + format, path + "nx" + format,
            path + "py" + format, path + "ny" + format,
            path + "pz" + format, path + "nz" + format
        ];

        const textureCube = new THREE.CubeTextureLoader().load(urls);
        scene.background = textureCube;
        scene.fog = new THREE.Fog(0xa0a0a0, 3000, 5000);

        // Water setup

        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load("textures/water/water-norm.jpg", (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;

                }),
                waterColor: 0x001e0f,
                distortionScale: 3
            }
        );
        this.water.rotation.x = -Math.PI / 2;
        this.water.material.transparent = true;

        scene.add(this.water);

        // Terrain setup

        this.buildTerrain();
    }

    buildTerrain() {
        const { scene } = this;

        const texture = new THREE.TextureLoader().load("textures/heightmaps/TamrielLowRes.png", (texture) => {
            const data = pixels(texture);
            const { width, height } = texture.image;
            const scalar = 32;

            const planeGeometry = new THREE.PlaneGeometry(width * scalar, height * scalar, width - 1, height - 1);
            planeGeometry.rotateX(-Math.PI / 2);

            for (let i = 0; i < width * height; i++) {
                planeGeometry.attributes.position.array[i * 3 + 1] = (data[i * 4] / 255) * 1600 - 700;
            }

            planeGeometry.computeVertexNormals();

            const grassDiffuse = new THREE.TextureLoader().load("textures/grass/aerial_grass_rock_diff_4k.png");
            grassDiffuse.wrapS = THREE.RepeatWrapping;
            grassDiffuse.wrapT = THREE.RepeatWrapping;
            grassDiffuse.colorSpace = THREE.LinearSRGBColorSpace;
            grassDiffuse.repeat.set(40, 32);

            const grassNormal = new THREE.TextureLoader().load("textures/grass/aerial_grass_rock_nor_4k.png");
            grassNormal.wrapS = THREE.RepeatWrapping;
            grassNormal.wrapT = THREE.RepeatWrapping;
            grassNormal.colorSpace = THREE.LinearSRGBColorSpace;
            grassNormal.repeat.set(40, 32);

            this.terrain = new THREE.Mesh(planeGeometry, new THREE.MeshStandardMaterial({
                metalness: 0,
                roughness: 1,
                map: grassDiffuse,
                normalMap: grassNormal
            }));
            this.terrain.receiveShadow = true;

            scene.add(this.terrain);

            this.controls.getObject().position.y = 120;
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.draw();
        this.stats.update();
    }

    update() {
        const { board: controller, controls, camera } = this;
        const delta = this.clock.getDelta();

        const velocity = new THREE.Vector3();
        const speed = 1000;

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
            velocity.y += 1000;
        }

        if (controller.keys["shift"]) {
            velocity.y += -1000;
        }

        controls.moveRight(velocity.x * speed * delta);
        controls.moveForward(velocity.z * speed * delta);
        controls.getObject().position.y += velocity.y * delta;

        this.water.material.uniforms["time"].value += 1.0 / 60.0;
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }
}
