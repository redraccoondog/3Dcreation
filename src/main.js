import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { initGamepad, isGamepadConnected, getLeftStickX, getLeftStickY, getRightStickX, getRightStickY, isButtonPressed } from './gamepad.js';

// シーンの初期化
const scene = new THREE.Scene();

// カメラの設定
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

// レンダラーの設定
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
document.body.appendChild(renderer.domElement);

// コントロールの設定
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// スカイボックスの作成
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

const sun = new THREE.Vector3();
const pmremGenerator = new THREE.PMREMGenerator(renderer);

// 水面の作成
const waterGeometry = new THREE.PlaneGeometry(100, 100);
const water = new Water(
  waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined
  }
);
water.rotation.x = -Math.PI / 2;
water.position.y = -1;
scene.add(water);

// 地形の作成
const terrainGeometry = new THREE.PlaneGeometry(50, 50, 128, 128);
const terrainMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x3c7521,
  roughness: 0.8,
  metalness: 0.2,
  displacementMap: new THREE.TextureLoader().load('textures/heightmap.png'),
  displacementScale: 2,
  displacementBias: -0.5
});
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
scene.add(terrain);

// 簡単な箱を追加（プレイヤーの代わり）
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.set(0, 0, 0);
box.castShadow = true;
scene.add(box);

// ライトの設定
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -25;
directionalLight.shadow.camera.right = 25;
directionalLight.shadow.camera.top = 25;
directionalLight.shadow.camera.bottom = -25;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

// 太陽の位置を更新する関数
function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - 45);
  const theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();
  scene.environment = pmremGenerator.fromScene(sky).texture;
}
updateSun();

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 移動速度
const moveSpeed = 0.1;
const rotationSpeed = 0.05;

// モバイル用コントロール
document.getElementById('moveForward').addEventListener('click', () => {
  box.position.z -= moveSpeed;
});
document.getElementById('moveBack').addEventListener('click', () => {
  box.position.z += moveSpeed;
});
document.getElementById('moveLeft').addEventListener('click', () => {
  box.position.x -= moveSpeed;
});
document.getElementById('moveRight').addEventListener('click', () => {
  box.position.x += moveSpeed;
});

// ゲームパッドサポートの初期化
initGamepad();

// ゲームパッド接続状態のUI表示
const gamepadStatusElement = document.createElement('div');
gamepadStatusElement.style.position = 'absolute';
gamepadStatusElement.style.top = '10px';
gamepadStatusElement.style.right = '10px';
gamepadStatusElement.style.padding = '5px 10px';
gamepadStatusElement.style.background = 'rgba(0, 0, 0, 0.5)';
gamepadStatusElement.style.color = 'white';
gamepadStatusElement.style.fontFamily = 'Arial, sans-serif';
gamepadStatusElement.style.borderRadius = '5px';
gamepadStatusElement.textContent = 'ゲームパッド: 未接続';
document.body.appendChild(gamepadStatusElement);

// ゲームパッドによる移動処理
function handleGamepadInput() {
  if (isGamepadConnected()) {
    gamepadStatusElement.textContent = 'ゲームパッド: 接続中';
    gamepadStatusElement.style.background = 'rgba(0, 128, 0, 0.5)';
    
    // 左スティックで移動
    const leftX = getLeftStickX();
    const leftY = getLeftStickY();
    
    if (Math.abs(leftX) > 0) {
      box.position.x += leftX * moveSpeed;
    }
    
    if (Math.abs(leftY) > 0) {
      box.position.z -= leftY * moveSpeed;
    }
    
    // 右スティックでカメラ回転
    const rightX = getRightStickX();
    if (Math.abs(rightX) > 0) {
      camera.position.x += rightX * rotationSpeed;
      controls.update();
    }
  } else {
    gamepadStatusElement.textContent = 'ゲームパッド: 未接続';
    gamepadStatusElement.style.background = 'rgba(0, 0, 0, 0.5)';
  }
}

// キーボード入力による移動
const keysPressed = {};
document.addEventListener('keydown', (event) => {
  keysPressed[event.code] = true;
});
document.addEventListener('keyup', (event) => {
  keysPressed[event.code] = false;
});

function handleKeyboardInput() {
  // WASDキーでの移動
  if (keysPressed['KeyW']) {
    box.position.z -= moveSpeed;
  }
  if (keysPressed['KeyS']) {
    box.position.z += moveSpeed;
  }
  if (keysPressed['KeyA']) {
    box.position.x -= moveSpeed;
  }
  if (keysPressed['KeyD']) {
    box.position.x += moveSpeed;
  }
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  // ゲームパッド入力の処理
  handleGamepadInput();
  
  // キーボード入力の処理
  handleKeyboardInput();
  
  water.material.uniforms['time'].value += 1.0 / 60.0;
  controls.update();
  renderer.render(scene, camera);
}

animate(); 