const userAgent = process.env.npm_config_user_agent || '';

if (!userAgent.startsWith('pnpm/')) {
  console.error(
    [
      '',
      'Market Eye uses pnpm exclusively.',
      'Using npm or Yarn creates a second lockfile and can break Expo/EAS builds.',
      '',
      'Install pnpm, remove the incorrect lockfile, then install:',
      '  corepack enable',
      '  corepack prepare pnpm@11.4.0 --activate',
      '  rm -f package-lock.json yarn.lock',
      '  pnpm install --frozen-lockfile',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
