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
        
        // --- 状態変数 ---
        this.direction = new THREE.Vector3(0, 0, 1); // 現在のキャラクターの向き
        this.movementSpeed = 0.1; // 基本移動速度
        this.rotationSpeed = 0.1; // 回転速度
        
        // タップ移動用
        this.targetPosition = null; // 目標地点
        
        // 方向入力 (キーボード/ゲームパッド) 用
        this.desiredMoveDirection = new THREE.Vector3(0, 0, 0); // 入力に基づく目標移動方向
        this.moveIntensity = 0; // 入力強度 (0:停止, 1:歩行相当, >1:走行相当)
        
        // アニメーション名定数
        this.ANIMATION_IDLE = "Survey";
        this.ANIMATION_WALK = "Walk";
        this.ANIMATION_RUN = "Run";
        
        // --- 内部状態/デバッグ用 ---
        this.moveStuckTimer = 0;
        this.lastPosition = new THREE.Vector3().copy(position);
        this.totalMovedDistance = 0;
        this.maxMoveDistance = 30;
        
        // 位置情報表示用の矢印（デバッグ用）
        const arrowHelper = new THREE.ArrowHelper(
            this.direction, this.position, 2, 0x00ff00, 0.5, 0.3
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
        console.log('モデル読み込み開始: assets/characters/animals/tiger_001.glb');
        
        // Tigerモデルをロード
        loader.load('assets/characters/animals/tiger_001.glb', 
        (gltf) => {
            console.log('>>> モデル読み込み成功!');
            this.model = gltf.scene;
            console.log('>>> モデルオブジェクト:', this.model);
            
            // モデルのスケールを調整（一旦等倍で読み込む）
            this.model.scale.set(1, 1, 1); 
            console.log('>>> スケール設定完了');
            
            // モデルの向きは元のままにする（-Z方向が前方）
            
            this.model.position.copy(this.position);
            console.log('>>> 位置設定完了', this.position);
            
            // モデルとその子要素にシャドウを設定
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            console.log('>>> シャドウ設定完了');
            
            try {
                this.scene.add(this.model);
                console.log('>>> モデルをシーンに追加完了');
            } catch (e) {
                console.error('>>> モデルのシーン追加エラー:', e);
            }
            
            // ダミーボックスを削除
            if(this.dummyBox && this.dummyBox.parent) {
                 try {
                    this.scene.remove(this.dummyBox);
                    console.log('>>> ダミーボックス削除完了');
                } catch (e) {
                    console.error('>>> ダミーボックス削除エラー:', e);
                }
            } else {
                 console.log('>>> ダミーボックスが見つからないか、既に削除されています');
            }
            
            // アニメーションを設定
            this.mixer = new THREE.AnimationMixer(this.model);
            this.animations = {}; // アニメーションマップを初期化
            console.log('>>> AnimationMixer 初期化完了');
            
            if (gltf.animations && gltf.animations.length > 0) {
                console.log(`>>> 読み込まれたアニメーション: ${gltf.animations.length}個`);
                
                // アニメーションクリップをコピーして使用する
                gltf.animations.forEach((clip, index) => {
                    // クリップの情報をログ表示
                    console.log(`>>> アニメーション[${index}]: ${clip.name}, 長さ: ${clip.duration.toFixed(2)}秒`);
                    
                    // アニメーションアクションを作成
                    const action = this.mixer.clipAction(clip);
                    
                    // デフォルト設定
                    action.setLoop(THREE.LoopRepeat);
                    action.clampWhenFinished = false;
                    action.timeScale = 1.0; // 速度を標準に設定
                    
                    // アクションを保存
                    this.animations[clip.name] = action;
                });
                console.log('>>> アニメーションアクション保存完了');
                
                // --- アニメーション名のマッピング (モデルに合わせて調整が必要！) ---
                // console.log("モデルのアニメーション名を確認し、以下を調整してください:");
                // this.ANIMATION_IDLE = "???";  // 例: "Idle" や "Survey" など
                // this.ANIMATION_WALK = "???";  // 例: "Walk" や "Run" など
                // this.ANIMATION_RUN = "???";   // 例: "Run" や "Sprint" など
                
                // // 暫定: 最初のアニメーションをIdleとして使う
                // const firstAnimName = gltf.animations[0].name;
                // this.ANIMATION_IDLE = firstAnimName;
                // this.ANIMATION_WALK = firstAnimName; // 無理やり割り当て
                // this.ANIMATION_RUN = firstAnimName; // 無理やり割り当て
                
                // console.log("仮割り当てされたアニメーション:");
                // console.log(`- アイドル: ${this.ANIMATION_IDLE}`);
                // console.log(`- 歩行: ${this.ANIMATION_WALK}`);
                // console.log(`- 走行: ${this.ANIMATION_RUN}`);
                
                // モデル読み込み直後のアニメーション準備
                setTimeout(() => {
                    console.log('>>> モデル読み込み完了: アニメーション初期化試行');
                    this.currentAnimation = null;
                    // アイドルアニメーション名が確定したら以下を有効化
                    // this.playAnimation(this.ANIMATION_IDLE);
                    
                    // 暫定: 最初のアニメーションを再生してみる
                    if(gltf.animations.length > 0 && this.animations[gltf.animations[0].name]) {
                         const firstAnimName = gltf.animations[0].name;
                         console.log(`>>> 暫定的に最初のアニメーション ${firstAnimName} を再生します`);
                         try {
                             this.playAnimation(firstAnimName);
                             console.log(`>>> ${firstAnimName} 再生開始`);
                         } catch (e) {
                             console.error(`>>> ${firstAnimName} の再生エラー:`, e);
                         }
                    }
                }, 100);
            } else {
                console.warn('>>> モデルにアニメーションが含まれていません！');
            }
        }, 
        // 読み込み進捗状況
        (xhr) => {
            // 進捗ログは一旦省略
        },
        // エラー処理
        (error) => {
            console.error('>>> モデル読み込みエラー発生!', error);
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
    
    // キーボード/ゲームパッドからの入力設定
    setDesiredMovement(direction, intensity) {
        this.desiredMoveDirection.copy(direction);
        this.moveIntensity = intensity;
        // 方向入力がある場合、タップ移動はキャンセル
        if (direction.lengthSq() > 0) {
             this.targetPosition = null;
        }
    }
    
    // タップによる移動目標設定
    moveTo(target) {
        if (this.position.distanceTo(target) < 0.1) {
            console.log('目標位置が近すぎるため移動しません');
            return;
        }
        console.log(`タップ移動開始: 目標地点 = (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
        this.targetPosition = target.clone();
        this.desiredMoveDirection.set(0, 0, 0); // 他の入力をリセット
        this.moveIntensity = 0;
        this.moveStuckTimer = 0;
        this.totalMovedDistance = 0;
        this.lastPosition.copy(this.position);
        this.showTargetMarker(this.targetPosition);
    }
    
    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        this.updateMarker(deltaTime);

        let isMoving = false;
        let targetAnimation = this.ANIMATION_IDLE;
        let moveVector = new THREE.Vector3(0, 0, 0);
        let actualMovementSpeed = this.movementSpeed;

        // 1. タップ移動の処理
        if (this.targetPosition) {
            const directionToTarget = new THREE.Vector3().subVectors(this.targetPosition, this.position);
            const distanceToTarget = directionToTarget.length();

            if (distanceToTarget > 0.1) {
                isMoving = true;
                const moveDirection = directionToTarget.normalize();
                
                // 向きを更新 (Lerp)
                this.direction.lerp(moveDirection, this.rotationSpeed).normalize();
                
                // 移動ベクトルを計算
                actualMovementSpeed = this.movementSpeed; // タップ移動は一定速度
                moveVector = this.direction.clone().multiplyScalar(Math.min(actualMovementSpeed, distanceToTarget)); // 目的地を超えないように

                // アニメーション決定 (距離ではなく一定速度で Walk/Run を決める方が良いかも？一旦距離で)
                targetAnimation = distanceToTarget > 5 ? this.ANIMATION_RUN : this.ANIMATION_WALK; // TODO: 閾値調整

                // スタック検出 (既存ロジックを流用)
                const movementDistance = this.position.distanceTo(this.lastPosition);
                 if (movementDistance < 0.01 && deltaTime > 0) { // Avoid division by zero or tiny delta issues
                     this.moveStuckTimer += deltaTime;
                     if (this.moveStuckTimer > 2) {
                         console.log('タップ移動が進まないため中止します');
                         this.targetPosition = null; // Stop movement
                         isMoving = false;
                         targetAnimation = this.ANIMATION_IDLE;
                     }
                 } else {
                     this.totalMovedDistance += movementDistance;
                     if (this.totalMovedDistance > this.maxMoveDistance) {
                         console.log('タップ移動距離が制限を超えたため中止します');
                         this.targetPosition = null; // Stop movement
                         isMoving = false;
                         targetAnimation = this.ANIMATION_IDLE;
                     }
                     this.lastPosition.copy(this.position);
                     this.moveStuckTimer = 0;
                 }


            } else {
                // 到着
                this.position.copy(this.targetPosition); // 最終位置を正確に設定
                this.targetPosition = null;
                isMoving = false;
                targetAnimation = this.ANIMATION_IDLE;
                console.log('目的地到着 (タップ)');
            }
        } 
        // 2. 方向入力 (キーボード/ゲームパッド) の処理
        else if (this.moveIntensity > 0 && this.desiredMoveDirection.lengthSq() > 0) {
            isMoving = true;
            
            // 向きを更新 (Lerp)
            this.direction.lerp(this.desiredMoveDirection, this.rotationSpeed).normalize();
            
            // 移動ベクトルを計算 (強度に応じて速度変更も可能)
            // 例: 走行判定 (強度が1以上など)
            const isRunning = this.moveIntensity > 1.0; 
            actualMovementSpeed = isRunning ? this.movementSpeed * 1.5 : this.movementSpeed; // 走行時は速度アップ
            moveVector = this.direction.clone().multiplyScalar(actualMovementSpeed);

            // アニメーション決定
            targetAnimation = isRunning ? this.ANIMATION_RUN : this.ANIMATION_WALK;
        }

        // 3. 移動の実行
        if (isMoving) {
            this.position.add(moveVector);
        }

        // 4. モデルの位置と向きを更新
        if (this.model) {
            this.model.position.copy(this.position);
            // モデルのY軸回転を設定 (向きベクトルから角度計算)
            const targetAngle = Math.atan2(this.direction.x, this.direction.z);
            this.model.rotation.y = targetAngle; 
        } else {
            // ダミーボックスも更新
             this.dummyBox.position.copy(this.position);
        }
        
        // デバッグ用矢印ヘルパーの更新
        this.arrowHelper.position.copy(this.position);
        this.arrowHelper.setDirection(this.direction);

        // 5. アニメーションの再生
        this.playAnimation(targetAnimation);
        
        // lastPosition の更新を移動後に行う (スタック検出用)
        // Note: タップ移動の場合、スタック検出は移動判定ブロック内で行う方が良いかも
        // if (!this.targetPosition) { // Only update lastPosition if not tap-moving?
        //     this.lastPosition.copy(this.position);
        // }
    }
    
    getPosition() {
        return this.position;
    }
}

export default Character; 