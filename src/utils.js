import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { clamp } from "three/src/math/MathUtils.js";

/**
 * Extracts pixel data from a texture within a specified region.
 * @param {THREE.Texture} texture
 * @param {number} clipX
 * @param {number} clipY
 * @param {number | null} clipWidth - If null, the full width is used
 * @param {number | null} clipHeight - If null, the full height is used
 */
function pixels(texture, clipX = 0, clipY = 0, clipWidth = null, clipHeight = null) {
    const { image } = texture;

    if (clipWidth === null) {
        clipWidth = image.width;
    }

    if (clipHeight === null) {
        clipHeight = image.height;
    }
    // const canvas = document.createElement("canvas");
    // const context = canvas.getContext("2d");

    const canvas = new OffscreenCanvas(clipWidth, clipHeight);

    if (!canvas) {
        throw new Error("Browser does not support OffscreenCanvas");
    }

    const context = canvas.getContext("2d");

    context.drawImage(image, clipX, clipY, clipWidth, clipHeight, 0, 0, clipWidth, clipHeight);

    return context.getImageData(0, 0, clipWidth, clipHeight).data;
}



/**
 * Converts RGB values to a single integer.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgb(r, g, b) {
    const R = clamp(Math.floor(r), 0, 255);
    const G = clamp(Math.floor(g), 0, 255);
    const B = clamp(Math.floor(b), 0, 255);

    return (R << 16) | (G << 8) | B;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgbFloat(r, g, b) {
    return rgb(r * 255, g * 255, b * 255);
}



/**
 * Loads a GLTF model and applies a metalness value of 0 to all meshes.
 * @param {string} url
 * @param {{ (model: any): void; (arg0: THREE.Group<THREE.Object3DEventMap>): void; }} onLoad
 */
function loadGLTF(url, onLoad) {
    const loader = new GLTFLoader();

    loader.load(url, (gltf) => {
        onLoad(gltf.scene);
    }, undefined, (error) => {
        console.error(error);
    });
}



/**
 * @param {Iterable<number>} map
 * @param {number} width
 * @param {number} height
 * @param {number} radius - Blur radius for smoothing
 * @returns {Float32Array}
 */
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

export { pixels, rgb, rgbFloat, loadGLTF, blurMap };
