import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// 検索ハイライト拡張機能
export const SearchHighlight = Mark.create({
  name: 'searchHighlight',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'search-highlight',
      },
      searchTerm: '',
      currentResult: 0,
      results: [],
    };
  },

  addAttributes() {
    return {
      current: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.search-highlight',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const className = HTMLAttributes.current 
      ? 'search-highlight current' 
      : 'search-highlight';
    
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: className,
    }), 0];
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('searchHighlight');
    let searchTerm = '';
    let currentIndex = -1;

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decorationSet, oldState, newState) {
            const meta = tr.getMeta(pluginKey);
            
            if (meta) {
              if (meta.searchTerm !== undefined) {
                searchTerm = meta.searchTerm;
                currentIndex = meta.currentIndex || -1;
              } else if (meta.clear) {
                searchTerm = '';
                currentIndex = -1;
                return DecorationSet.empty;
              }
            }

            if (!searchTerm) {
              return DecorationSet.empty;
            }

            // 検索してハイライトを作成
            const decorations = [];
            const results = [];
            
            newState.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text;
                const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
                let match;
                
                while ((match = regex.exec(text)) !== null) {
                  const from = pos + match.index;
                  const to = from + match[0].length;
                  const isCurrent = results.length === currentIndex;
                  
                  results.push({ from, to });
                  
                  const decoration = Decoration.inline(from, to, {
                    class: isCurrent ? 'search-highlight current' : 'search-highlight',
                  });
                  
                  decorations.push(decoration);
                }
              }
            });

            return DecorationSet.create(newState.doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state);
          }
        }
      })
    ];
  },

  addCommands() {
    return {
      setSearchTerm: (searchTerm) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(new PluginKey('searchHighlight'), { searchTerm, currentIndex: 0 });
        }
        return true;
      },
      clearSearch: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(new PluginKey('searchHighlight'), { clear: true });
        }
        return true;
      },
      nextSearchResult: () => ({ tr, dispatch, state }) => {
        const pluginKey = new PluginKey('searchHighlight');
        const decorations = pluginKey.getState(state);
        
        if (dispatch && decorations.find().length > 0) {
          const currentIndex = (this.options.currentResult + 1) % decorations.find().length;
          this.options.currentResult = currentIndex;
          tr.setMeta(pluginKey, { currentIndex });
        }
        return true;
      },
      previousSearchResult: () => ({ tr, dispatch, state }) => {
        const pluginKey = new PluginKey('searchHighlight');
        const decorations = pluginKey.getState(state);
        
        if (dispatch && decorations.find().length > 0) {
          let currentIndex = this.options.currentResult - 1;
          if (currentIndex < 0) {
            currentIndex = decorations.find().length - 1;
          }
          this.options.currentResult = currentIndex;
          tr.setMeta(pluginKey, { currentIndex });
        }
        return true;
      },
    };
  },
});

// 正規表現用エスケープ関数
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}