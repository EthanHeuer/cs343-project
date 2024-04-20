import * as THREE from "three";

/**
 * @param {THREE.Texture} texture
 */
function pixels(texture) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = texture.image.width;
    canvas.height = texture.image.height;

    ctx.drawImage(texture.image, 0, 0);

    return ctx.getImageData(0, 0, texture.image.width, texture.image.height).data;
}

export { pixels };
