import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {createControls} from './controls.js'; //controls

console.log("main.js loaded ✅", window.location.href);

function wireLoginUi() {
    const btnGoogle = document.getElementById("loginButton");
    console.log("loginButton:", btnGoogle);

    if (btnGoogle) {
        btnGoogle.addEventListener("click", async () => {
            console.log("clicked login ✅");
            try {
                await AuthApi.signInWithGoogle();
                console.log("signInWithGoogle finished ✅");
            } catch (e) {
                console.error("signIn error ❌", e);
                alert(e?.code || e?.message || String(e));
            }
        });
    }
}

function wireLogoutUi() {
    const logoutButtons = document.querySelectorAll("[data-logout-btn]");
    logoutButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            console.log("clicked logout ✅");
            try {
                await AuthApi.signOut();
                console.log("signOut finished ✅");
                window.location.replace("./login.html");
            } catch (e) {
                console.error("signOut error ❌", e);
                alert(e?.code || e?.message || String(e));
            }
        });
    });
}

//Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0,0,1);

//Camera
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0,5,10);

//Grid
scene.add(new THREE.GridHelper(20, 100));

//Light
const dirLight = new THREE.DirectionalLight(0xffffff,3);
dirLight.position.set(5,10,7);
scene.add(dirLight);

//Loader
const loader = new GLTFLoader();

loader.load('/models/Building.glb',(gltf) => {
    const something = gltf.scene;
    scene.add(something);
})

//Renderer
const renderer = new THREE.WebGLRenderer; 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Control
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

const controls = createControls({
    camera,
    renderer,
    scene,
    ui: {
        btnMove: document.getElementById('btnMove'),
        btnRotate: document.getElementById('btnRotate'),
        btnScale: document.getElementById('btnScale'),
        selectedName: document.getElementById('selectedName'),
    }
});

//Animate
function animate(){
    requestAnimationFrame(animate);

    //orbit.update();
    controls.update();

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', ()=> {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})