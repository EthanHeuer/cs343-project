# CS 343 - Project

![Demo](demo/full.png)

Live demo: [ethanheuer.github.io/cs343-project/public/](https://ethanheuer.github.io/cs343-project/public/)

## About

This project is a simple demo of height map rendering in WebGL using Three.js. The environment features low-res and high-res terrain, real-time water simulation, a model with basic material properties, and a skybox.

## Optimizations

A cell manager is used to optimize the rendering of high level of detail terrain. The terrain is divided into cells, and only the cells that are visible are rendered.

## Assets

- Skybox: [Cloudy Skyboxes by Spiney](https://opengameart.org/content/cloudy-skyboxes)
- Car Model: [Pony Cartoon by Slava Z.](https://sketchfab.com/3d-models/pony-cartoon-885d9f60b3a9429bb4077cfac5653cf9)
- Water: [Three.js](https://github.com/mrdoob/three.js/tree/master/examples/textures)
