// Learn more https://docs.expo.dev/guides/customizing-metro
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Fix @expo/cli bug where iOS Expo Go or tunnel proxies send
 * `x-forwarded-proto: exp` or `https, http`, causing `_getBundleUrl` to
 * produce a non-http(s) URL (`exp://...` or `https, http://...`), which
 * crashes `bundleUrl.match(/^https?:\/\/.*?\//)[0]` with:
 *   "Warning: Unable to resolve manifest assets. Icons and fonts might not work.
 *    Cannot read properties of null (reading '0')."
 * and causes Expo Go on iPhone to fail downloading the JS bundle.
 */
function normalizeHttpProtocol(rawProto) {
  if (!rawProto) {
    return undefined;
  }
  const first = String(rawProto)
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (first === 'https' || first === 'exps') {
    return 'https';
  }
  if (first === 'http' || first === 'exp') {
    return 'http';
  }
  return 'http';
}

function patchExpoCliManifestMiddleware() {
  try {
    const candidateDirs = new Set();

    for (const cachedPath of Object.keys(require.cache)) {
      const normalized = cachedPath.replace(/\\/g, '/');
      const idx = normalized.indexOf('/@expo/cli/');
      if (idx !== -1) {
        candidateDirs.add(normalized.slice(0, idx + '/@expo/cli'.length));
      }
    }

    const pnpmDir = path.join(__dirname, 'node_modules', '.pnpm');
    if (fs.existsSync(pnpmDir)) {
      for (const entry of fs.readdirSync(pnpmDir)) {
        if (entry.startsWith('@expo+cli@')) {
          candidateDirs.add(path.join(pnpmDir, entry, 'node_modules', '@expo', 'cli'));
        }
      }
    }

    const directCliDir = path.join(__dirname, 'node_modules', '@expo', 'cli');
    if (fs.existsSync(directCliDir)) {
      candidateDirs.add(directCliDir);
    }

    for (const cliDir of candidateDirs) {
      const expoGoMwPath = path.join(
        cliDir,
        'build/src/start/server/middleware/ExpoGoManifestHandlerMiddleware.js'
      );
      const manifestMwPath = path.join(
        cliDir,
        'build/src/start/server/middleware/ManifestMiddleware.js'
      );

      if (fs.existsSync(expoGoMwPath)) {
        const expoGoMod = require(expoGoMwPath);
        const Proto = expoGoMod?.ExpoGoManifestHandlerMiddleware?.prototype;
        if (Proto && !Proto.__marketEyePatched) {
          const origGetParsedHeaders = Proto.getParsedHeaders;
          Proto.getParsedHeaders = function (req) {
            if (req && req.headers && req.headers['x-forwarded-proto']) {
              req.headers['x-forwarded-proto'] = normalizeHttpProtocol(
                req.headers['x-forwarded-proto']
              );
            }
            const parsed = origGetParsedHeaders.call(this, req);
            if (parsed) {
              parsed.protocol = normalizeHttpProtocol(parsed.protocol);
            }
            return parsed;
          };
          Proto.__marketEyePatched = true;
        }
      }

      if (fs.existsSync(manifestMwPath)) {
        const manifestMod = require(manifestMwPath);
        const MProto = manifestMod?.ManifestMiddleware?.prototype;
        if (MProto && !MProto.__marketEyePatched) {
          const origGetBundleUrl = MProto._getBundleUrl;
          MProto._getBundleUrl = function (opts) {
            const safeOpts = {
              ...opts,
              protocol: normalizeHttpProtocol(opts?.protocol) ?? 'http',
            };
            const url = origGetBundleUrl.call(this, safeOpts);
            if (typeof url === 'string' && !/^https?:\/\//i.test(url)) {
              return url.replace(/^[a-z0-9+.,\s-]+:\/\//i, 'http://');
            }
            return url;
          };
          const origMutateAssets = MProto.mutateManifestWithAssetsAsync;
          if (typeof origMutateAssets === 'function') {
            MProto.mutateManifestWithAssetsAsync = function (manifest, bundleUrl) {
              const safeBundleUrl =
                typeof bundleUrl === 'string' && !/^https?:\/\//i.test(bundleUrl)
                  ? bundleUrl.replace(/^[a-z0-9+.,\s-]+:\/\//i, 'http://')
                  : bundleUrl;
              return origMutateAssets.call(this, manifest, safeBundleUrl);
            };
          }
          MProto.__marketEyePatched = true;
        }
      }
    }
  } catch {
    // Ignore if @expo/cli internal structure differs
  }
}

patchExpoCliManifestMiddleware();

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;


