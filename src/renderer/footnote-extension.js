import { Mark, mergeAttributes } from '@tiptap/core';

// 脚注拡張機能
export const Footnote = Mark.create({
  name: 'footnote',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'footnote',
      },
    };
  },

  addAttributes() {
    return {
      number: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'sup.footnote',
        getAttrs: dom => ({
          number: dom.getAttribute('data-footnote-number'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-footnote-number': HTMLAttributes.number,
    }), 0];
  },

  addCommands() {
    return {
      setFootnote: (number) => ({ chain }) => {
        return chain()
          .setMark(this.name, { number })
          .run();
      },
      toggleFootnote: (number) => ({ chain }) => {
        return chain()
          .toggleMark(this.name, { number })
          .run();
      },
      unsetFootnote: () => ({ chain }) => {
        return chain()
          .unsetMark(this.name)
          .run();
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-F': () => this.editor.commands.toggleFootnote(),
    };
  },
});