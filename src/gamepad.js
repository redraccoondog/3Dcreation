/**
 * ゲームパッドコントローラーの操作をサポートするモジュール
 */

// ゲームパッドの状態を保持
let gamepads = {};
let gamepadConnected = false;

// アナログスティックのデッドゾーン
const DEADZONE = 0.1;

/**
 * ゲームパッドの接続イベントリスナー
 */
function connectGamepadHandler(event) {
    console.log("Gamepad connected: ", event.gamepad);
    gamepadConnected = true;
    gamepads[event.gamepad.index] = event.gamepad;
}

/**
 * ゲームパッドの切断イベントリスナー
 */
function disconnectGamepadHandler(event) {
    console.log("Gamepad disconnected: ", event.gamepad);
    delete gamepads[event.gamepad.index];
    
    // 接続されているゲームパッドがなくなった場合
    if (Object.keys(gamepads).length === 0) {
        gamepadConnected = false;
    }
}

/**
 * ゲームパッドの状態を更新
 */
function updateGamepads() {
    // ブラウザのGamepad APIからゲームパッドの状態を取得
    const detectedGamepads = navigator.getGamepads ? navigator.getGamepads() : 
                          (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    
    for (let i = 0; i < detectedGamepads.length; i++) {
        if (detectedGamepads[i]) {
            gamepads[detectedGamepads[i].index] = detectedGamepads[i];
        }
    }
}

/**
 * 左スティックの水平方向の値を取得 (-1.0 から 1.0)
 */
function getLeftStickX() {
    updateGamepads();
    
    for (const gamepad of Object.values(gamepads)) {
        // 左スティックのX軸（一般的に0番目の軸）
        const value = gamepad.axes[0];
        // デッドゾーン適用
        if (Math.abs(value) > DEADZONE) {
            return value;
        }
    }
    return 0;
}

/**
 * 左スティックの垂直方向の値を取得 (-1.0 から 1.0)
 */
function getLeftStickY() {
    updateGamepads();
    
    for (const gamepad of Object.values(gamepads)) {
        // 左スティックのY軸（一般的に1番目の軸）
        const value = gamepad.axes[1];
        // デッドゾーン適用（Y軸は通常反転しているため、符号を反転）
        if (Math.abs(value) > DEADZONE) {
            return -value; // 上が正、下が負になるように反転
        }
    }
    return 0;
}

/**
 * 右スティックの水平方向の値を取得 (-1.0 から 1.0)
 */
function getRightStickX() {
    updateGamepads();
    
    for (const gamepad of Object.values(gamepads)) {
        // 右スティックのX軸（一般的に2番目の軸）
        const value = gamepad.axes[2] || gamepad.axes[3]; // コントローラーによって異なる場合がある
        // デッドゾーン適用
        if (Math.abs(value) > DEADZONE) {
            return value;
        }
    }
    return 0;
}

/**
 * 右スティックの垂直方向の値を取得 (-1.0 から 1.0)
 */
function getRightStickY() {
    updateGamepads();
    
    for (const gamepad of Object.values(gamepads)) {
        // 右スティックのY軸（一般的に3番目の軸）
        const value = gamepad.axes[3] || gamepad.axes[4]; // コントローラーによって異なる場合がある
        // デッドゾーン適用（Y軸は通常反転しているため、符号を反転）
        if (Math.abs(value) > DEADZONE) {
            return -value; // 上が正、下が負になるように反転
        }
    }
    return 0;
}

/**
 * ゲームパッドのボタンが押されているかどうかを確認
 * @param {number} buttonIndex - ボタンのインデックス
 * @returns {boolean} - 押されていればtrue
 */
function isButtonPressed(buttonIndex) {
    updateGamepads();
    
    for (const gamepad of Object.values(gamepads)) {
        if (gamepad.buttons[buttonIndex] && gamepad.buttons[buttonIndex].pressed) {
            return true;
        }
    }
    return false;
}

/**
 * ゲームパッドコントローラーを初期化
 */
function initGamepad() {
    // ゲームパッドの接続/切断イベントリスナーを登録
    window.addEventListener("gamepadconnected", connectGamepadHandler);
    window.addEventListener("gamepaddisconnected", disconnectGamepadHandler);
    
    console.log("Gamepad support initialized. Connect a gamepad and press any button to use it.");
}

/**
 * ゲームパッドが接続されているかどうかを確認
 */
function isGamepadConnected() {
    return gamepadConnected;
}

// モジュールとしてエクスポート
export {
    initGamepad,
    isGamepadConnected,
    getLeftStickX,
    getLeftStickY,
    getRightStickX,
    getRightStickY,
    isButtonPressed
}; 