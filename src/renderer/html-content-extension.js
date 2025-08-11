import { Node, mergeAttributes } from '@tiptap/core';

// HTML埋め込み拡張機能
export const HtmlContent = Node.create({
  name: 'htmlContent',

  group: 'block',

  content: 'inline*',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'html-content',
      },
    };
  },

  addAttributes() {
    return {
      html: {
        default: null,
        parseHTML: element => element.getAttribute('data-html'),
        renderHTML: attributes => {
          if (!attributes.html) {
            return {};
          }
          return {
            'data-html': attributes.html,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.html-content',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setHtmlContent: (html) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { html },
        });
      },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div');
      Object.entries(mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)).forEach(([key, value]) => {
        dom.setAttribute(key, value);
      });

      if (node.attrs.html) {
        try {
          // 安全にHTMLを挿入
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = node.attrs.html;
          
          // DOMツリーをコピー
          while (tempDiv.firstChild) {
            dom.appendChild(tempDiv.firstChild);
          }
        } catch (error) {
          console.error('Error rendering HTML content:', error);
          dom.textContent = 'エラー: HTMLの表示に失敗しました';
        }
      }

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }

          if (updatedNode.attrs.html !== node.attrs.html) {
            // HTMLが変更された場合は再レンダリング
            dom.innerHTML = '';
            
            if (updatedNode.attrs.html) {
              try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = updatedNode.attrs.html;
                
                while (tempDiv.firstChild) {
                  dom.appendChild(tempDiv.firstChild);
                }
              } catch (error) {
                console.error('Error updating HTML content:', error);
                dom.textContent = 'エラー: HTMLの表示に失敗しました';
              }
            }
            
            node = updatedNode;
          }

          return true;
        },
      };
    };
  },
});