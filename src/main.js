import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { initGamepad, isGamepadConnected, getLeftStickX, getLeftStickY, getRightStickX, getRightStickY } from './gamepad.js';
import Character from './character.js';

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

// キャラクターの初期化
const character = new Character(scene, new THREE.Vector3(0, 0, 0));

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

// レイキャスター（タップ位置の3D座標を取得するため）
const raycaster = new THREE.Raycaster();

// タップ操作による移動
renderer.domElement.addEventListener('touchstart', (event) => {
  // 複数のタッチを防止
  if (event.touches.length > 1) {
    event.preventDefault();
    return;
  }
  
  event.preventDefault();
  const touch = event.touches[0];
  const rect = renderer.domElement.getBoundingClientRect();
  
  // タップ位置を正規化（-1から1の範囲に）
  const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  
  // レイキャスターを設定
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  
  // 地形との交差を計算
  const intersects = raycaster.intersectObjects([terrain, water]);
  
  if (intersects.length > 0) {
    // タップした位置をキャラクターの目標位置として設定
    character.moveTo(intersects[0].point);
    
    // 目標位置までの距離をログ出力（デバッグ用）
    const distance = character.position.distanceTo(intersects[0].point);
    console.log(`タップ移動: 目標までの距離=${distance.toFixed(2)}、アニメーション=${distance > 5 ? 'Run' : 'Walk'}`);
  }
}, { passive: false });

// 他のタッチイベントも処理
renderer.domElement.addEventListener('touchmove', (event) => {
  event.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchend', (event) => {
  event.preventDefault();
}, { passive: false });

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
  const zeroVector = new THREE.Vector3(0, 0, 0);
  let desiredDirection = zeroVector.clone();
  let intensity = 0;

  if (isGamepadConnected()) {
    gamepadStatusElement.textContent = 'ゲームパッド: 接続中';
    gamepadStatusElement.style.background = 'rgba(0, 128, 0, 0.5)';
    
    // 左スティックの入力を取得
    const leftX = getLeftStickX();
    const leftY = getLeftStickY();

    const deadZone = 0.1;
    if (Math.abs(leftX) > deadZone || Math.abs(leftY) > deadZone) {
      // カメラの方向を取得 (XZ平面)
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();
      
      // カメラの右方向を計算
      const cameraRight = new THREE.Vector3().crossVectors(cameraDirection, camera.up).normalize();

      // スティック入力に基づいて移動方向を計算
      // 前後方向 (スティックY -> カメラ前方/後方)
      const forwardMovement = cameraDirection.clone().multiplyScalar(-leftY);
      // 左右方向 (スティックX -> カメラ右方/左方)
      const rightMovement = cameraRight.clone().multiplyScalar(leftX);

      desiredDirection.addVectors(forwardMovement, rightMovement);

      intensity = Math.min(desiredDirection.length(), 1.0); 
      if (intensity > deadZone) { // 再度デッドゾーンチェック（斜め入力考慮）
          desiredDirection.normalize();
          // 強度が0.7を超えたら走行判定用に強度を少し上げる
          if (intensity > 0.7) { intensity = 1.1; }
      } else {
          intensity = 0; // デッドゾーン内なら停止
          desiredDirection.set(0,0,0);
      }
    }
    
    // 右スティックでカメラ回転
    const rightX = getRightStickX();
    if (Math.abs(rightX) > deadZone) {
      camera.position.x += rightX * 0.05; 
      controls.update();
    }

  } else {
    gamepadStatusElement.textContent = 'ゲームパッド: 未接続';
    gamepadStatusElement.style.background = 'rgba(0, 0, 0, 0.5)';
  }

  // キャラクターに目標移動を設定
  character.setDesiredMovement(desiredDirection, intensity);
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
  const zeroVector = new THREE.Vector3(0, 0, 0);
  let desiredDirection = zeroVector.clone();
  let intensity = 0;

  // WASDキーの入力から基本的な移動ベクトルを計算 (ワールド座標基準)
  let moveX = 0;
  let moveZ = 0;
  if (keysPressed['KeyW']) { moveZ += 1; }
  if (keysPressed['KeyS']) { moveZ -= 1; }
  if (keysPressed['KeyA']) { moveX -= 1; }
  if (keysPressed['KeyD']) { moveX += 1; }
  
  // 方向入力があれば、カメラ基準の方向に変換
  if (moveX !== 0 || moveZ !== 0) {
    intensity = 1.0; // 基本強度

    // カメラの方向を取得 (XZ平面)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // カメラの右方向を計算
    const cameraRight = new THREE.Vector3().crossVectors(cameraDirection, camera.up).normalize();

    // キー入力ベクトルをカメラ基準に変換
    const forwardMovement = cameraDirection.clone().multiplyScalar(moveZ);
    const rightMovement = cameraRight.clone().multiplyScalar(moveX);
    desiredDirection.addVectors(forwardMovement, rightMovement).normalize();

    // Shiftキーが押されていたら走行強度に
    if (keysPressed['ShiftLeft'] || keysPressed['ShiftRight']) {
      intensity = 1.5; 
    }
  }

  // キャラクターに目標移動を設定
  character.setDesiredMovement(desiredDirection, intensity);
}

// 時間管理
let clock = new THREE.Clock();

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = clock.getDelta();
  
  // --- 入力処理 (優先度付け) ---
  let gamepadProvidedInput = false;
  if (isGamepadConnected()) {
      handleGamepadInput();
      // ゲームパッドが有効な移動入力を提供したかチェック
      if (character.moveIntensity > 0 || character.desiredMoveDirection.lengthSq() > 0) {
          gamepadProvidedInput = true;
      }
  }
  
  // ゲームパッドが入力を行わなかった場合のみキーボード入力を処理
  if (!gamepadProvidedInput) {
      handleKeyboardInput();
  }
  
  // --- キャラクター更新 (全てのロジックはここに含まれる) ---
  character.update(deltaTime);
  
  // カメラをキャラクターに追従
  const characterPosition = character.getPosition();
  camera.lookAt(characterPosition);
  
  water.material.uniforms['time'].value += 1.0 / 60.0;
  controls.update();
  renderer.render(scene, camera);
}

animate(); 