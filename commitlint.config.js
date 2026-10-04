const CLAUDE_SIGNATURE = /co-authored-by:.*claude|generated with \[?claude code/i;

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'no-claude-signature': ({ raw }) => [!CLAUDE_SIGNATURE.test(raw ?? ''), 'o commit não pode ter assinatura do Claude'],
      },
    },
  ],
  rules: {
    'scope-empty': [2, 'always'],
    'header-max-length': [2, 'always', 80],
    'no-claude-signature': [2, 'always'],
  },
};
