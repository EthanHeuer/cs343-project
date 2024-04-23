import * as THREE from "three";
import { clamp } from "three/src/math/MathUtils.js";

/**
 * @param {THREE.Texture} texture
 */
function pixels(texture) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const { width, height } = texture.image;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(texture.image, 0, 0);

    return ctx.getImageData(0, 0, width, height).data;
}

/**
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

export { pixels, rgb };
