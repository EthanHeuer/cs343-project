import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import Camera from "./camera/camera.js";
import { pixels } from "./utils.js";
import { RoomEnvironment } from "three/examples/jsm/Addons.js";

function generateVertexColors(geometry) {
    const positionAttribute = geometry.attributes.position;

    const colors = [];
    const color = new THREE.Color();

    for (let i = 0, il = positionAttribute.count; i < il; i++) {
        color.setHSL(i / il * Math.random(), 0.5, 0.5);
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

export default class App {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    clock = new THREE.Clock();
    camera = new Camera();
    stats = new Stats();
    terrain;
    container;

    constructor(container) {
        const { scene, renderer } = this;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        this.scene.background = new THREE.Color(0x72b6ed);

        const ambientLight = new THREE.AmbientLight(0x000000);
        scene.add(ambientLight);

        const light1 = new THREE.DirectionalLight(0xffffff, 3);
        light1.position.set(0, 200, 0);
        scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff, 3);
        light2.position.set(100, 200, 100);
        scene.add(light2);

        const light3 = new THREE.DirectionalLight(0xffffff, 3);
        light3.position.set(- 100, - 200, - 100);
        scene.add(light3);

        const loader = new THREE.TextureLoader();
        const texture = loader.load("textures/height-maps/RandomLowRes.png", (texture) => {
            const data = pixels(texture);

            const worldWidth = 256;
            const worldDepth = 256;

            const plane = new THREE.PlaneGeometry(worldWidth, worldDepth, worldWidth - 1, worldDepth - 1);
            plane.rotateX(-Math.PI / 2);

            const vertices = plane.attributes.position.array;

            for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
                vertices[j + 1] = data[i * 4] / 255 * 32;
            }

            generateVertexColors(plane);

            this.terrain = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
                map: texture
            }));

            scene.add(this.terrain);
        });

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.draw();
        this.stats.update();
    }

    update() {
        this.camera.update(this.clock.getDelta());
    }

    draw() {
        this.renderer.render(this.scene, this.camera.perspectiveCamera);
    }
}
