import App from "./app.js";
import WebGL from "three/addons/capabilities/WebGL.js";

(() => {
    const root = document.body;

    if (!root) {
        throw new Error("Root element not found");
    }

    if (!WebGL.isWebGLAvailable()) {
        const warning = WebGL.getWebGLErrorMessage();
        root.appendChild(warning);
        throw new Error(warning.textContent);
    }

    const app = new App(root);
    app.animate();

    console.log(app);
})();
