const userAgent = process.env.npm_config_user_agent || '';
const isCi = process.env.CI === 'true';

// CI already verifies that pnpm-lock.yaml is the only lockfile before install.
// Some hosted runners preserve an npm-flavoured user-agent even when pnpm
// executes lifecycle scripts, so do not reject a verified CI installation.
if (!isCi && !userAgent.startsWith('pnpm/')) {
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
