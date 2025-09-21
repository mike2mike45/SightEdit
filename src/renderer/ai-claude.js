// Claude AI統合
(function() {
  if (typeof window === 'undefined') return;

  const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
  const CLAUDE_API_VERSION = '2023-06-01';
  const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022'; // 最新のClaude 3.5 Sonnetモデル（Claude 4はまだAPI未対応）

  // Claude APIを呼び出し
  async function callClaudeAPI(text, apiKey, action = 'summarize') {
    let systemPrompt = '';
    let userPrompt = '';

    // アクションに応じてプロンプトを設定
    switch(action) {
      case 'summarize':
        systemPrompt = 'あなたは日本語でテキストを要約するアシスタントです。簡潔で分かりやすい要約を提供してください。';
        userPrompt = `以下のテキストを要約してください：\n\n${text}`;
        break;
      case 'proofread':
        systemPrompt = 'あなたは日本語の文章校正アシスタントです。誤字脱字、文法の誤り、より良い表現を提案してください。';
        userPrompt = `以下のテキストを校正してください：\n\n${text}`;
        break;
      case 'translate':
        systemPrompt = 'あなたは日英翻訳のスペシャリストです。自然で正確な翻訳を提供してください。';
        userPrompt = `以下のテキストを翻訳してください（日本語なら英語に、英語なら日本語に）：\n\n${text}`;
        break;
      case 'title':
        systemPrompt = 'あなたは魅力的なタイトルを生成するアシスタントです。内容に基づいた適切なタイトルを提案してください。';
        userPrompt = `以下のテキストに適したタイトルを5つ提案してください：\n\n${text}`;
        break;
      case 'heading':
        systemPrompt = 'あなたは文書構造のスペシャリストです。適切な見出しを提案してください。';
        userPrompt = `以下のテキストに適した見出し構造を提案してください：\n\n${text}`;
        break;
      case 'introduction':
        systemPrompt = 'あなたは文章作成のスペシャリストです。魅力的な導入文を作成してください。';
        userPrompt = `以下のテキストに基づいて導入文を作成してください：\n\n${text}`;
        break;
      case 'conclusion':
        systemPrompt = 'あなたは文章作成のスペシャリストです。適切な結論文を作成してください。';
        userPrompt = `以下のテキストに基づいて結論文を作成してください：\n\n${text}`;
        break;
      case 'keywords':
        systemPrompt = 'あなたはSEOとコンテンツマーケティングのスペシャリストです。';
        userPrompt = `以下のテキストから重要なキーワードとタグを抽出してください：\n\n${text}`;
        break;
      case 'style_formal':
        systemPrompt = 'あなたは文体変換のスペシャリストです。丁寧でフォーマルな文体に変換してください。';
        userPrompt = `以下のテキストを丁寧語・敬語を使った文体に変換してください：\n\n${text}`;
        break;
      case 'style_casual':
        systemPrompt = 'あなたは文体変換のスペシャリストです。カジュアルで親しみやすい文体に変換してください。';
        userPrompt = `以下のテキストをカジュアルな文体に変換してください：\n\n${text}`;
        break;
      default:
        systemPrompt = 'あなたは優秀な日本語アシスタントです。';
        userPrompt = text;
    }

    const requestBody = {
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    };

    try {
      const response = await fetch(CLAUDE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'anthropic-version': CLAUDE_API_VERSION
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // デバッグ用：レスポンス構造をログ出力
      // console.log('Claude API Response:', JSON.stringify(data, null, 2));
      
      // Claude APIのレスポンス構造から内容を取得
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
      
      // エラーレスポンスの確認
      if (data.error) {
        throw new Error(`Claude API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      console.error('Invalid response format:', data);
      throw new Error('レスポンス形式が無効です');
    } catch (error) {
      console.error('Claude API Error:', error);
      throw error;
    }
  }

  // グローバルに公開
  window.aiClaude = {
    callAPI: callClaudeAPI
  };
})();