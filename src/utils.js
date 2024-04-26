import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { clamp } from "three/src/math/MathUtils.js";

/**
 * Extracts pixel data from a texture within a specified region.
 * @param {THREE.Texture} texture
 * @param {number} clipX
 * @param {number} clipY
 * @param {number | null} clipWidth
 * @param {number | null} clipHeight
 */
function pixels(texture, clipX = 0, clipY = 0, clipWidth = null, clipHeight = null) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas 2D context not available");
    }

    const { image } = texture;

    if (clipWidth === null) {
        clipWidth = image.width;
    }

    if (clipHeight === null) {
        clipHeight = image.height;
    }

    canvas.width = clipWidth;
    canvas.height = clipHeight;

    context.drawImage(image, clipX, clipY, clipWidth, clipHeight, 0, 0, clipWidth, clipHeight);

    return context.getImageData(0, 0, clipWidth, clipHeight).data;
}

/**
 * Converts normalized RGB values to a single integer.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgb(r, g, b) {
    const R = clamp(255 * r, 0, 255);
    const G = clamp(255 * g, 0, 255);
    const B = clamp(255 * b, 0, 255);

    return (R << 16) | (G << 8) | B;
}

function loadGLTF(url, onLoad) {
    const loader = new GLTFLoader();

    loader.load(url, (gltf) => {
        const model = gltf.scene;

        model.traverse((mesh) => {
            // @ts-ignore
            if (mesh.isMesh) {
                // @ts-ignore
                mesh.material.metalness = 0;
            }
        });

        onLoad(model);
    }, undefined, (error) => {
        console.error(error);
    });
}

export { pixels, rgb, loadGLTF };
