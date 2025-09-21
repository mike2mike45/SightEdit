// Chrome拡張のポップアップスクリプト

document.addEventListener('DOMContentLoaded', () => {
  // 言語設定を読み込み
  loadLanguageSettings();

  // エディターを開くボタン（重複防止）
  const openEditorBtn = document.getElementById('open-editor');
  if (openEditorBtn && !openEditorBtn.dataset.listenerAdded) {
    openEditorBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('dist/editor.html')
      });
      window.close();
    });
    openEditorBtn.dataset.listenerAdded = 'true';
  }


  // 言語選択の変更を監視
  document.querySelectorAll('input[name="language"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        const selectedLanguage = e.target.value;
        saveLanguageSettings(selectedLanguage);
        updateUI(selectedLanguage);
      }
    });
  });
});

// 言語設定を読み込む
function loadLanguageSettings() {
  chrome.storage.sync.get(['language'], (result) => {
    const language = result.language || 'ja';
    const radioButton = document.querySelector(`input[name="language"][value="${language}"]`);
    if (radioButton) {
      radioButton.checked = true;
    }
    updateUI(language);
  });
}

// 言語設定を保存
function saveLanguageSettings(language) {
  chrome.storage.sync.set({ language: language });
}

// UIの言語を更新
function updateUI(language) {
  const texts = {
    ja: {
      openEditor: 'エディターを開く',
      aiSettings: '⚙️ AI設定',
      subtitle: 'Visual Markdown Editor',
      aiFeature: 'AI機能（Gemini & Claude）',
      wysiwygFeature: 'WYSIWYG Markdownエディター',
      exportFeature: '各種プラットフォームへエクスポート',
      tiptapFeature: 'TipTapベースの高機能エディター'
    },
    en: {
      openEditor: 'Open Editor',
      subtitle: 'Visual Markdown Editor',
      aiFeature: 'AI Features (Gemini & Claude)',
      wysiwygFeature: 'WYSIWYG Markdown Editor',
      exportFeature: 'Export to Various Platforms',
      tiptapFeature: 'TipTap-based Advanced Editor'
    }
  };

  const currentTexts = texts[language] || texts.ja;

  // UIテキストを更新
  document.getElementById('open-editor').textContent = currentTexts.openEditor;
  document.querySelector('.subtitle').textContent = currentTexts.subtitle;

  // 機能説明テキストを更新
  const features = document.querySelectorAll('.feature-item span:last-child');
  if (features.length >= 4) {
    features[0].textContent = currentTexts.aiFeature;
    features[1].textContent = currentTexts.wysiwygFeature;
    features[2].textContent = currentTexts.exportFeature;
    features[3].textContent = currentTexts.tiptapFeature;
  }
}