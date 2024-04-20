import App from "./app.js";

const root = document.getElementById("root");

if (!root) {
    throw new Error("Root element not found");
}

const app = new App(root);
app.animate();
