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

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = clipWidth;
    canvas.height = clipHeight;

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

export { pixels, rgb, rgbFloat, loadGLTF, blurMap, createPlane, loadTerrainTexture };
