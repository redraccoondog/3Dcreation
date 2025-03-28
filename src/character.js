import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Character {
    constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
        this.scene = scene;
        this.position = position;
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.direction = new THREE.Vector3(0, 0, 1); // 初期方向: z軸正方向
        this.movementSpeed = 0.1;
        this.rotationSpeed = 0.1;
        this.isMoving = false;
        this.targetPosition = null;
        this.animationMap = {
            idle: ['idle', 'stand', 'animation_0', 'Survey'],
            walk: ['walk', 'run', 'animation_1', 'Walk', 'Run']
        };
        this.moveStuckTimer = 0; // 同じ場所で動き続ける時間を計測
        this.lastPosition = new THREE.Vector3().copy(position);
        this.totalMovedDistance = 0; // 累計移動距離
        this.maxMoveDistance = 30; // 最大移動距離制限
        
        // 位置情報表示用の矢印（デバッグ用）
        const arrowHelper = new THREE.ArrowHelper(
            this.direction,
            this.position,
            2,
            0x00ff00,
            0.5,
            0.3
        );
        this.arrowHelper = arrowHelper;
        scene.add(arrowHelper);
        
        // ダミーのボックスを作成（モデルロード中の表示用）
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.dummyBox = new THREE.Mesh(boxGeometry, boxMaterial);
        this.dummyBox.position.copy(position);
        this.dummyBox.castShadow = true;
        scene.add(this.dummyBox);
        
        // 移動先マーカーを作成
        this.createTargetMarker();
        
        // 3Dモデルをロード
        this.loadModel();
    }
    
    // 移動先マーカーの作成
    createTargetMarker() {
        // マーカーの円形ジオメトリ
        const markerGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        this.targetMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.targetMarker.rotation.x = Math.PI / 2; // 水平に配置
        this.targetMarker.visible = false;
        this.scene.add(this.targetMarker);
        
        // 内側の小さい円
        const innerGeometry = new THREE.CircleGeometry(0.3, 32);
        const innerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        this.innerMarker = new THREE.Mesh(innerGeometry, innerMaterial);
        this.innerMarker.rotation.x = Math.PI / 2; // 水平に配置
        this.innerMarker.visible = false;
        this.scene.add(this.innerMarker);
    }
    
    // マーカーを表示
    showTargetMarker(position) {
        // マーカーを移動先に配置
        this.targetMarker.position.copy(position);
        this.targetMarker.position.y += 0.5; // 草の上に表示するため高さをさらに上げる
        this.targetMarker.visible = true;
        this.targetMarker.scale.set(1, 1, 1);
        
        this.innerMarker.position.copy(position);
        this.innerMarker.position.y += 0.5; // 草の上に表示するため高さをさらに上げる
        this.innerMarker.visible = true;
        
        // 時間経過でフェードアウト
        this.markerTimer = 3; // 3秒間表示
    }
    
    // マーカーを更新
    updateMarker(deltaTime) {
        if (this.markerTimer > 0) {
            this.markerTimer -= deltaTime;
            
            if (this.markerTimer <= 0) {
                // 時間切れで非表示
                this.targetMarker.visible = false;
                this.innerMarker.visible = false;
            } else {
                // マーカーをアニメーション
                const scale = 1 + 0.2 * Math.sin(Date.now() * 0.005);
                this.targetMarker.scale.set(scale, scale, 1);
                
                // 残り時間に応じて透明度を調整
                const opacity = Math.min(1, this.markerTimer / 2);
                this.targetMarker.material.opacity = opacity * 0.7;
                this.innerMarker.material.opacity = opacity * 0.5;
            }
        }
    }
    
    loadModel() {
        const loader = new GLTFLoader();
        
        // Foxモデルをロード
        loader.load('assets/characters/fox/Fox.glb', (gltf) => {
            this.model = gltf.scene;
            
            // モデルのスケールを調整（キツネは小さいので大きくする）
            this.model.scale.set(0.05, 0.05, 0.05);
            
            // モデルの向きは元のままにする（-Z方向が前方）
            
            this.model.position.copy(this.position);
            this.model.castShadow = true;
            this.model.receiveShadow = true;
            this.scene.add(this.model);
            
            // ダミーボックスを削除
            this.scene.remove(this.dummyBox);
            
            // アニメーションを設定
            this.mixer = new THREE.AnimationMixer(this.model);
            
            if (gltf.animations && gltf.animations.length > 0) {
                console.log(`読み込まれたアニメーション: ${gltf.animations.length}個`);
                
                // アニメーションクリップをコピーして使用する
                gltf.animations.forEach((clip, index) => {
                    // クリップの情報をログ表示
                    console.log(`アニメーション[${index}]: ${clip.name}, 長さ: ${clip.duration.toFixed(2)}秒`);
                    
                    // アニメーションアクションを作成
                    const action = this.mixer.clipAction(clip);
                    
                    // デフォルト設定
                    action.setLoop(THREE.LoopRepeat);
                    action.clampWhenFinished = false;
                    action.timeScale = 1.0; // 速度を標準に設定
                    
                    // アクションを保存
                    this.animations[clip.name] = action;
                });
                
                // モデルに合わせてアニメーションを割り当て
                this.ANIMATION_IDLE = "Survey";  // アイドル
                this.ANIMATION_WALK = "Walk";    // 歩行
                this.ANIMATION_RUN = "Run";      // 走行
                
                console.log("使用するアニメーション:");
                console.log(`- アイドル: ${this.ANIMATION_IDLE}`);
                console.log(`- 歩行: ${this.ANIMATION_WALK}`);
                console.log(`- 走行: ${this.ANIMATION_RUN}`);
                
                // モデル読み込み直後のアニメーション準備
                setTimeout(() => {
                    console.log('モデル読み込み完了: アイドルアニメーション初期化');
                    this.currentAnimation = null;
                    this.playAnimation(this.ANIMATION_IDLE);
                }, 100);
            } else {
                console.warn('モデルにアニメーションが含まれていません！');
            }
        }, 
        // 読み込み進捗状況
        (xhr) => {
            console.log(`モデル読み込み進捗: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
        },
        // エラー処理
        (error) => {
            console.error('モデル読み込みエラー:', error);
        });
    }
    
    // アニメーション再生（フェード処理付き） => （即時切り替えに変更）
    playAnimation(animationName) {
        if (!this.mixer || !this.animations[animationName]) {
            console.warn(`アニメーション "${animationName}" が存在しません`);
            return false;
        }
        
        // 既に再生中なら何もしない
        if (this.currentAnimation === animationName) {
            return true;
        }
        
        console.log(`アニメーション切替: ${this.currentAnimation || 'なし'} -> ${animationName}`);
        
        // 前のアニメーションを停止
        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            const prevAction = this.animations[this.currentAnimation];
            prevAction.stop(); // フェードアウトの代わりに停止
        }
        
        // 新しいアニメーションを再生
        const action = this.animations[animationName];
        action.reset();
        // action.fadeIn(0.5); // フェードインの代わりに即時再生
        action.play();
        
        // 現在のアニメーションを更新
        this.currentAnimation = animationName;
        
        return true;
    }
    
    moveInDirection(direction) {
        // 入力方向に合わせて向きを更新
        if (direction.length() > 0) {
            // 新しい向きを設定
            const newDirection = direction.clone().normalize();
            
            // 滑らかに向きを変更
            this.direction.lerp(newDirection, this.rotationSpeed);
            this.direction.normalize();
            
            // 方向を更新
            this.arrowHelper.position.copy(this.position);
            this.arrowHelper.setDirection(this.direction);
            
            if (this.model) {
                // モデルの向きを更新
                const targetAngle = Math.atan2(this.direction.x, this.direction.z);
                this.model.rotation.y = targetAngle;
            }
            
            // 移動する
            const moveVector = this.direction.clone().multiplyScalar(this.movementSpeed);
            this.position.add(moveVector);
            
            if (this.model) {
                this.model.position.copy(this.position);
            } else {
                this.dummyBox.position.copy(this.position);
            }
            
            // 入力の強さによってアニメーションを選択
            if (direction.length() > 0.7) {
                this.playAnimation(this.ANIMATION_RUN);
            } else {
                this.playAnimation(this.ANIMATION_WALK);
            }
            
            return true;
        } else {
            // 入力がない場合はアイドル状態に
            this.playAnimation(this.ANIMATION_IDLE);
            
            return false;
        }
    }
    
    update(deltaTime) {
        // アニメーションの更新
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // マーカーの更新
        this.updateMarker(deltaTime);
        
        // タップした位置への移動処理
        if (this.isMoving && this.targetPosition) {
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
            const distance = direction.length();
            
            // 移動の進捗を確認（無限移動検出）
            const movementDistance = this.position.distanceTo(this.lastPosition);
            if (movementDistance < 0.01) {
                // ほとんど動いていない場合、スタック時間を増加
                this.moveStuckTimer += deltaTime;
                // 2秒以上動かない場合、移動を中止
                if (this.moveStuckTimer > 2) {
                    console.log('移動が進まないため中止します');
                    this.isMoving = false;
                    this.targetPosition = null;
                    this.moveStuckTimer = 0;
                    this.totalMovedDistance = 0;
                    // アイドルアニメーションに切り替え
                    this.playAnimation(this.ANIMATION_IDLE);
                    return;
                }
            } else {
                // 動いている場合は累計移動距離を加算
                this.totalMovedDistance += movementDistance;
                
                // 最大移動距離を超えた場合も中止
                if (this.totalMovedDistance > this.maxMoveDistance) {
                    console.log('移動距離が制限を超えたため中止します');
                    this.isMoving = false;
                    this.targetPosition = null;
                    this.moveStuckTimer = 0;
                    this.totalMovedDistance = 0;
                    // アイドルアニメーションに切り替え
                    this.playAnimation(this.ANIMATION_IDLE);
                    return;
                }
                
                // 位置を更新
                this.lastPosition.copy(this.position);
                this.moveStuckTimer = 0;
            }
            
            // 向きを更新
            if (distance > 0.1) {
                const newDirection = direction.clone().normalize();
                
                // 滑らかな回転
                this.direction.lerp(newDirection, this.rotationSpeed);
                this.direction.normalize();
                
                // 方向を更新
                this.arrowHelper.position.copy(this.position);
                this.arrowHelper.setDirection(this.direction);
                
                if (this.model) {
                    // モデルの向きを更新
                    const targetAngle = Math.atan2(this.direction.x, this.direction.z);
                    this.model.rotation.y = targetAngle;
                }
                
                // 移動処理
                if (distance > this.movementSpeed) {
                    // 移動方向に進む
                    const moveVector = this.direction.clone().multiplyScalar(this.movementSpeed);
                    this.position.add(moveVector);
                    
                    if (this.model) {
                        this.model.position.copy(this.position);
                    } else {
                        this.dummyBox.position.copy(this.position);
                    }
                    
                    // 移動中は必ず歩行か走行アニメーションを再生（修正箇所）
                    const targetAnimation = distance > 5 ? this.ANIMATION_RUN : this.ANIMATION_WALK;
                    if (this.currentAnimation !== targetAnimation) {
                        this.playAnimation(targetAnimation);
                    }
                } else {
                    // 目的地に到着
                    this.position.copy(this.targetPosition);
                    
                    if (this.model) {
                        this.model.position.copy(this.position);
                    } else {
                        this.dummyBox.position.copy(this.position);
                    }
                    
                    this.isMoving = false;
                    this.targetPosition = null;
                    this.moveStuckTimer = 0;
                    this.totalMovedDistance = 0;
                    
                    // アイドルアニメーション
                    console.log('目的地到着: アイドルアニメーションに切替');
                    this.playAnimation(this.ANIMATION_IDLE);
                }
            } else {
                // 十分近づいたら到着とみなす
                this.isMoving = false;
                this.targetPosition = null;
                this.moveStuckTimer = 0;
                this.totalMovedDistance = 0;
                
                // アイドルアニメーション
                console.log('目的地到着: アイドルアニメーションに切替');
                this.playAnimation(this.ANIMATION_IDLE);
            }
        }
    }
    
    // 指定された位置に移動を開始
    moveTo(target) {
        if (this.position.distanceTo(target) < 0.1) {
            console.log('目標位置が近すぎるため移動しません');
            return; // 十分近い場合は移動しない
        }
        
        console.log(`移動開始: 目標地点 = (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
        
        this.targetPosition = target.clone();
        this.isMoving = true;
        this.moveStuckTimer = 0; // スタックタイマーをリセット
        this.totalMovedDistance = 0; // 移動距離をリセット
        this.lastPosition.copy(this.position); // 開始位置を記録

        // マーカーを表示
        this.showTargetMarker(this.targetPosition);
        
        // updateループでアニメーションは管理するため、ここでは呼ばない
    }
    
    getPosition() {
        return this.position;
    }
}

export default Character; 