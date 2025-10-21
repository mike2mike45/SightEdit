// 初期設定ウィザード（拡張版 - Google Drive対応）

let currentStep = 1;
const totalSteps = 4;
let selectedProvider = 'gemini';
let selectedFeatures = { ai: true, drive: false };

// DOM要素
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const errorMessage = document.getElementById('error-message');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // 既存の設定を読み込み
    await loadExistingSettings();

    // 機能選択のイベントリスナー
    setupFeatureSelection();

    // プロバイダー選択のイベントリスナー
    setupProviderSelection();

    // ボタンのイベントリスナー
    prevBtn.addEventListener('click', previousStep);
    nextBtn.addEventListener('click', nextStep);

    // 初期表示
    updateUI();
});

/**
 * 既存の設定を読み込み
 */
async function loadExistingSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(
            ['geminiApiKey', 'geminiModel', 'claudeApiKey', 'claudeModel', 'googleDriveEnabled'],
            (result) => {
                // Gemini設定
                if (result.geminiApiKey) {
                    document.getElementById('gemini-api-key').value = result.geminiApiKey;
                }
                if (result.geminiModel) {
                    document.getElementById('gemini-model').value = result.geminiModel;
                }

                // Claude設定
                if (result.claudeApiKey) {
                    document.getElementById('claude-api-key').value = result.claudeApiKey;
                }
                if (result.claudeModel) {
                    document.getElementById('claude-model').value = result.claudeModel;
                }

                // Google Drive設定
                if (result.googleDriveEnabled) {
                    document.getElementById('feature-drive').checked = true;
                    selectedFeatures.drive = true;
                }

                resolve();
            }
        );
    });
}

/**
 * 機能選択のセットアップ
 */
function setupFeatureSelection() {
    const aiCheckbox = document.getElementById('feature-ai');
    const driveCheckbox = document.getElementById('feature-drive');

    aiCheckbox.addEventListener('change', (e) => {
        selectedFeatures.ai = e.target.checked;
    });

    driveCheckbox.addEventListener('change', (e) => {
        selectedFeatures.drive = e.target.checked;
    });
}

/**
 * プロバイダー選択のセットアップ
 */
function setupProviderSelection() {
    const providerOptions = document.querySelectorAll('.provider-option[data-provider]');

    providerOptions.forEach(option => {
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                selectedProvider = radio.value;

                // 選択状態を更新
                providerOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });
    });

    // ラジオボタンの変更も監視
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedProvider = e.target.value;
            providerOptions.forEach(opt => opt.classList.remove('selected'));
            e.target.closest('.provider-option').classList.add('selected');
        });
    });
}

/**
 * 次のステップへ
 */
async function nextStep() {
    // エラーメッセージをクリア
    hideError();

    // 現在のステップのバリデーション
    if (currentStep === 1) {
        // 機能選択の確認
        if (!selectedFeatures.ai && !selectedFeatures.drive) {
            showError('少なくとも1つの機能を選択してください');
            return;
        }
    } else if (currentStep === 3 && selectedFeatures.ai) {
        // AI機能が選択されている場合、APIキーを検証
        const isValid = await validateStep3();
        if (!isValid) {
            return;
        }

        // 設定を保存
        await saveSettings();
    }

    // 次のステップを決定
    const nextStepNumber = getNextStep();

    if (nextStepNumber) {
        currentStep = nextStepNumber;
        updateUI();
    } else if (currentStep === totalSteps) {
        // 完了したのでエディターを開く
        chrome.tabs.create({
            url: chrome.runtime.getURL('editor.html')
        });
        window.close();
    }
}

/**
 * 前のステップへ
 */
function previousStep() {
    hideError();

    const prevStepNumber = getPreviousStep();
    if (prevStepNumber) {
        currentStep = prevStepNumber;
        updateUI();
    }
}

/**
 * 次のステップ番号を取得（スキップロジック含む）
 */
function getNextStep() {
    if (currentStep === 1) {
        // AI機能が選択されている場合はステップ2（プロバイダー選択）へ
        if (selectedFeatures.ai) {
            return 2;
        }
        // AI機能が選択されていない場合はステップ3（Google Drive設定）へ
        else if (selectedFeatures.drive) {
            return 3;
        }
    } else if (currentStep === 2) {
        // プロバイダー選択後はステップ3（APIキー入力）へ
        return 3;
    } else if (currentStep === 3) {
        // APIキー入力後はステップ4（完了）へ
        return 4;
    }

    return null;
}

/**
 * 前のステップ番号を取得（スキップロジック含む）
 */
function getPreviousStep() {
    if (currentStep === 2) {
        // ステップ2からはステップ1へ戻る
        return 1;
    } else if (currentStep === 3) {
        // AI機能が選択されている場合はステップ2へ戻る
        if (selectedFeatures.ai) {
            return 2;
        }
        // そうでなければステップ1へ戻る
        return 1;
    } else if (currentStep === 4) {
        // ステップ4からはステップ3へ戻る
        return 3;
    }

    return null;
}

/**
 * ステップ3のバリデーション
 */
async function validateStep3() {
    if (selectedFeatures.ai) {
        if (selectedProvider === 'gemini') {
            const apiKey = document.getElementById('gemini-api-key').value.trim();
            if (!apiKey) {
                showError('Gemini APIキーを入力してください');
                return false;
            }
            if (!apiKey.startsWith('AIza')) {
                showError('有効なGemini APIキーを入力してください（AIzaで始まる必要があります）');
                return false;
            }
        } else if (selectedProvider === 'claude') {
            const apiKey = document.getElementById('claude-api-key').value.trim();
            if (!apiKey) {
                showError('Claude APIキーを入力してください');
                return false;
            }
            if (!apiKey.startsWith('sk-ant-')) {
                showError('有効なClaude APIキーを入力してください（sk-ant-で始まる必要があります）');
                return false;
            }
        }
    }

    return true;
}

/**
 * 設定を保存
 */
async function saveSettings() {
    const settings = {};

    // AI機能の設定
    if (selectedFeatures.ai) {
        if (selectedProvider === 'gemini') {
            settings.geminiApiKey = document.getElementById('gemini-api-key').value.trim();
            settings.geminiModel = document.getElementById('gemini-model').value;
        } else if (selectedProvider === 'claude') {
            settings.claudeApiKey = document.getElementById('claude-api-key').value.trim();
            settings.claudeModel = document.getElementById('claude-model').value;
        }
    }

    // Google Drive設定
    settings.googleDriveEnabled = selectedFeatures.drive;

    return new Promise((resolve) => {
        chrome.storage.sync.set(settings, () => {
            console.log('設定を保存しました:', settings);
            resolve();
        });
    });
}

/**
 * UIを更新
 */
function updateUI() {
    // すべてのステップを非表示
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });

    // 現在のステップを表示
    const currentStepElement = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }

    // プログレスバーを更新
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // ボタンの表示を更新
    if (currentStep === 1) {
        prevBtn.style.display = 'none';
        nextBtn.textContent = '次へ →';
    } else if (currentStep === totalSteps) {
        prevBtn.style.display = 'none';
        nextBtn.textContent = 'エディターを開く';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.textContent = '次へ →';
    }

    // ステップ3の場合、表示するフォームを切り替え
    if (currentStep === 3) {
        updateStep3Form();
    }
}

/**
 * ステップ3のフォームを更新
 */
function updateStep3Form() {
    const geminiForm = document.getElementById('gemini-form');
    const claudeForm = document.getElementById('claude-form');
    const driveForm = document.getElementById('google-drive-form');

    // すべて非表示に
    geminiForm.style.display = 'none';
    claudeForm.style.display = 'none';
    driveForm.style.display = 'none';

    // AI機能が選択されている場合
    if (selectedFeatures.ai) {
        if (selectedProvider === 'gemini') {
            geminiForm.style.display = 'block';
        } else {
            claudeForm.style.display = 'block';
        }
    }
    // Google Drive連携のみの場合
    else if (selectedFeatures.drive) {
        driveForm.style.display = 'block';
        // Google Drive連携の状態を確認
        checkGoogleDriveStatus();
    }
}

/**
 * Google Drive連携の状態を確認
 */
async function checkGoogleDriveStatus() {
    const statusElement = document.getElementById('drive-status');

    try {
        // C#中継アプリへの接続を確認
        const response = await fetch('http://127.0.0.1:8080/api/status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            statusElement.innerHTML = `
                <span style="color: #4caf50;">✓ 接続成功</span><br>
                <small style="color: #666;">C#中継アプリが起動しています</small>
            `;
            statusElement.style.background = '#e8f5e9';
        } else {
            throw new Error('接続失敗');
        }
    } catch (error) {
        statusElement.innerHTML = `
            <span style="color: #f44336;">✗ 接続できません</span><br>
            <small style="color: #666;">C#中継アプリ（SightEditRelay.exe）を起動してください</small>
        `;
        statusElement.style.background = '#ffebee';
    }
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

/**
 * エラーメッセージを非表示
 */
function hideError() {
    errorMessage.classList.remove('show');
}
