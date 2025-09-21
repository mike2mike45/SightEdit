// Chrome拡張のバックグラウンドスクリプト

chrome.runtime.onInstalled.addListener(() => {
  console.log('SightEdit Chrome Extension installed');
});

// エディターページはpopup.jsから開くため、action.onClickedは不要

// ストレージの管理
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes, namespace);
});

// メッセージの処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStorageData') {
    chrome.storage.local.get(request.keys || null, (result) => {
      sendResponse(result);
    });
    return true; // 非同期レスポンスを示す
  }

  if (request.action === 'setStorageData') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});