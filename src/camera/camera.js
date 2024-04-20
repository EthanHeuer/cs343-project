import { clamp } from "three/src/math/MathUtils.js";
import Controller from "./controller.js";
import * as THREE from "three";

export default class Camera {
    perspectiveCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 5000);
    controller = new Controller();
    rotation = new THREE.Quaternion();
    translation = new THREE.Vector3(0, 50, 0);
    phi = 0;
    theta = 0;

    constructor() {}

    update(elapsedTime = 1) {
        this.updateRotation(elapsedTime);
        this.updateCamera(elapsedTime);
        this.updateTranslation(elapsedTime);
        this.controller.update(elapsedTime);
    }

    updateCamera(elapsedTime) {
        this.perspectiveCamera.quaternion.copy(this.rotation);
        this.perspectiveCamera.position.copy(this.translation);
    }

    updateRotation(elapsedTime) {
        const xh = this.controller.mouse.deltaX() / window.innerWidth;
        const yh = this.controller.mouse.deltaY() / window.innerHeight;

        this.phi += -xh * 5;
        this.theta = clamp(this.theta - yh * 5, -Math.PI / 2, Math.PI / 2);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);

        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this.rotation.copy(q);
    }

    updateTranslation(elapsedTime) {
        const forwardVelocity = (this.controller.keys["w"] ? 1 : 0) + (this.controller.keys["s"] ? -1 : 0);
        const strafeVelocity = (this.controller.keys["a"] ? 1 : 0) + (this.controller.keys["d"] ? -1 : 0);
        const jumpVelocity = (this.controller.keys[" "] ? 1 : 0) + (this.controller.keys["shift"] ? -1 : 0);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * elapsedTime * 20);

        const strafe = new THREE.Vector3(-1, 0, 0);
        strafe.applyQuaternion(qx);
        strafe.multiplyScalar(strafeVelocity * elapsedTime * 20);

        const jump = new THREE.Vector3(0, 1, 0);
        jump.multiplyScalar(jumpVelocity * elapsedTime * 20);

        this.translation.add(forward);
        this.translation.add(strafe);
        this.translation.add(jump);
    }
}
