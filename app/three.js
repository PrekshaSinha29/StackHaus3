// UCL, Bartlett, RC5
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

import { createControls } from "./controls.js";
import { createWarpClient } from "../warp/warpClient.js";
import { initParamsUi } from "../sender/paramsUi.js";
import { initChatUi } from "../sender/chatUi.js";

const viewport = document.getElementById("viewport");
if (!viewport) throw new Error("Viewport container not found");

const ROOM_KEY = window.APP_ROOM_KEY || "bookshelf";
const URL_MAIN = "wss://relay.curvf.com/ws";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 15, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.28 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(50, 50, 0x888888, 0xdddddd);
grid.position.y = -0.01;
scene.add(grid);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
outlinePass.edgeStrength = 4;
outlinePass.edgeThickness = 3;
outlinePass.visibleEdgeColor.set(0xa44924);
outlinePass.hiddenEdgeColor.set(0xa44924);
composer.addPass(outlinePass);

const fxaaPass = new ShaderPass(FXAAShader);
composer.addPass(fxaaPass);

const gtaoPass = new GTAOPass(scene, camera, 1, 1);
composer.addPass(gtaoPass);
composer.addPass(new OutputPass());

try {
  const envMap = await new RGBELoader().loadAsync(
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr"
  );
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = envMap;
} catch (err) {
  console.warn("HDR environment failed to load:", err);
}

const controls = createControls({
  camera,
  renderer,
  scene,
  ui: {
    btnMove: document.getElementById("btnMove"),
    btnRotate: document.getElementById("btnRotate"),
    btnScale: document.getElementById("btnScale"),
    selectedName: document.getElementById("selectedName"),
  },
  onSelect: (obj) => {
    outlinePass.selectedObjects = obj ? [obj] : [];
  },
});

const statusText = document.getElementById("statusText");
const connectionDot = document.getElementById("connectionDot");
const loadingSpinner = document.getElementById("loadingSpinner");

function setLoadingProgress(p) {
  if (!loadingSpinner) return;
  const pct = Math.round(Math.max(0, Math.min(1, Number(p) || 0)) * 100);
  loadingSpinner.style.setProperty("--p", String(pct));
  loadingSpinner.setAttribute("data-pct", String(pct));
}

function setLoadingVisible(visible) {
  if (!loadingSpinner) return;
  loadingSpinner.style.opacity = visible ? "1" : "0.45";
}

function setDotState(state) {
  if (!connectionDot) return;
  connectionDot.classList.remove("connected", "connecting");
  if (state === "connected") connectionDot.classList.add("connected");
  else if (state === "connecting") connectionDot.classList.add("connecting");
}

function setStatus(state) {
  if (statusText) statusText.innerText = state;
  setDotState(state);
}

let warpGroup = new THREE.Group();
warpGroup.name = "Warp Group";
scene.add(warpGroup);

const sharedMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.5,
  metalness: 0.5,
  envMapIntensity: 1.0,
  side: THREE.DoubleSide,
});

function clearWarpGeometries() {
  controls.detach?.();
  controls.clearPickables?.();

  while (warpGroup.children.length > 0) {
    const child = warpGroup.children[warpGroup.children.length - 1];
    warpGroup.remove(child);
    child.geometry?.dispose();
  }
}

function setWarpGeometries(geometries) {
  clearWarpGeometries();

  for (let i = 0; i < geometries.length; i++) {
    const mesh = new THREE.Mesh(geometries[i], sharedMaterial);
    mesh.name = `Warp Mesh ${i}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    warpGroup.add(mesh);
    controls.addPickable?.(mesh);
  }
}

const liveWidth = document.getElementById("liveWidth");
const liveDepth = document.getElementById("liveDepth");
const liveHeight = document.getElementById("liveHeight");
const liveRotation = document.getElementById("liveRotation");
const liveVDiv = document.getElementById("liveVDiv");
const liveHDiv = document.getElementById("liveHDiv");

function bindDisplay(sliderId, valueId, onInput) {
  const slider = document.getElementById(sliderId);
  const value = document.getElementById(valueId);
  if (!slider || !value) return;

  const update = () => {
    value.textContent = slider.value;
    if (onInput) onInput(slider.value);
  };

  slider.addEventListener("input", update);
  update();
}

bindDisplay("sWidth", "vWidth", (v) => { if (liveWidth) liveWidth.textContent = v; });
bindDisplay("sDepth", "vDepth", (v) => { if (liveDepth) liveDepth.textContent = v; });
bindDisplay("sHeight", "vHeight", (v) => { if (liveHeight) liveHeight.textContent = v; });
bindDisplay("sRot", "vRot", (v) => { if (liveRotation) liveRotation.textContent = v; });
bindDisplay("sVDiv", "vVDiv", (v) => { if (liveVDiv) liveVDiv.textContent = v; });
bindDisplay("sHDiv", "vHDiv", (v) => { if (liveHDiv) liveHDiv.textContent = v; });

let warpClientInstance = null;
let paramsUiHandle = null;

function initWarp(roomKey) {
  clearWarpGeometries();
  setLoadingVisible(true);
  setLoadingProgress(0);

  if (warpClientInstance) {
    try { warpClientInstance.close(); } catch {}
    warpClientInstance = null;
  }

  warpClientInstance = createWarpClient({
    relayBase: URL_MAIN,
    room: roomKey,

    onStatus: (state) => {
      setStatus(state);

      if (state === "connected") {
        setLoadingVisible(true);
        setLoadingProgress(0);

        if (paramsUiHandle) {
          setTimeout(() => {
            paramsUiHandle.pushAll();
          }, 0);
        }
      }

      if (["disconnected", "error", "bad_binary", "bad_json"].includes(state)) {
        setLoadingVisible(false);
      }
    },

    onProgress: (p, meta) => {
      if (meta?.state === "idle") {
        setLoadingVisible(false);
        return;
      }

      setLoadingVisible(true);

      if (meta?.state === "begin") setLoadingProgress(0);
      else if (meta?.state === "downloading") setLoadingProgress(p);
      else if (meta?.state === "parsing") setLoadingProgress(0.95);
      else if (meta?.state === "decompressing") setLoadingProgress(0.96);
      else if (meta?.state === "done") {
        setLoadingProgress(1);
        setTimeout(() => setLoadingVisible(false), 200);
      }
    },

    onMesh: (payload) => {
      const geometries = payload?.geometries || [];
      setWarpGeometries(geometries);
    },
  });

  paramsUiHandle = initParamsUi({
    warp: {
      sendParams: (p) => (warpClientInstance ? warpClientInstance.sendParams(p) : false),
    },
    throttle: 50,
    sendAll: true,
    mappings: [
      { sliderId: "sWidth", valueId: "vWidth", key: "width" },
      { sliderId: "sDepth", valueId: "vDepth", key: "depth" },
      { sliderId: "sHeight", valueId: "vHeight", key: "height" },
      { sliderId: "sRot", valueId: "vRot", key: "rotation" },
      { sliderId: "sVDiv", valueId: "vVDiv", key: "verticalDivisions" },
      { sliderId: "sHDiv", valueId: "vHDiv", key: "horizontalDivisions" },
    ],
  });
}

initChatUi({
  warp: {
    sendParams: (p) => (warpClientInstance ? warpClientInstance.sendParams(p) : false),
  },
  getBaseParams: () => (paramsUiHandle ? paramsUiHandle.currentParams : {}),
});

initWarp(ROOM_KEY);

function resizeRenderer() {
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  outlinePass.setSize(width, height);

  const pr = renderer.getPixelRatio();
  fxaaPass.material.uniforms.resolution.value.set(
    1 / (width * pr),
    1 / (height * pr)
  );

  gtaoPass?.setSize?.(width, height);
}

window.addEventListener("resize", resizeRenderer);
resizeRenderer();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();