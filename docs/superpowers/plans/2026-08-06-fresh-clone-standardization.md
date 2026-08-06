# Fresh Clone Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every frontend clone deterministic with pnpm and independently linkable to each developer's own EAS project.

**Architecture:** pnpm is the sole package manager and is enforced before installation. EAS ownership is supplied only by each developer's gitignored `.env`; that file is included in the EAS build archive so remote config resolution receives the same project UUID as local config.

**Tech Stack:** Expo SDK 54, React Native 0.81, pnpm 11, EAS Build.

## Global Constraints

- Supported Node versions: `^20.19.0 || ^22.13.0 || ^24.0.0`.
- `pnpm-lock.yaml` is the only lockfile.
- No Expo project UUID is committed in `app.config.js` or `eas.json`.
- Every developer owns and configures a separate EAS project.

---

### Task 1: Enforce deterministic package installation

**Files:**
- Modify: `package.json`
- Modify: `.npmrc`
- Modify: `.gitignore`
- Create: `scripts/require-pnpm.js`
- Modify: `scripts/fix-project.js`

- [ ] Add the pnpm package-manager declaration and exact Node engine range.
- [ ] Add a preinstall guard that rejects npm and Yarn with corrective commands.
- [ ] Ignore non-pnpm lockfiles and make the cleanup script install with pnpm.
- [ ] Verify the guard rejects an npm user-agent and accepts pnpm.

### Task 2: Decouple EAS ownership

**Files:**
- Modify: `app.config.js`
- Modify: `eas.json`
- Modify: `.easignore`
- Modify: `.env.example`
- Modify: `scripts/print-eas-project-id.js`

- [ ] Remove every committed owner project UUID.
- [ ] Resolve `extra.eas.projectId` only from `EXPO_PUBLIC_EAS_PROJECT_ID`.
- [ ] Include local `.env` in the EAS upload while continuing to exclude actual credential files.
- [ ] Fail the project-check script clearly when no UUID is configured.
- [ ] Verify owner and collaborator UUID simulations resolve independently.

### Task 3: Restore clone verification and collaborator instructions

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `docs/COLLABORATOR_DEV_BUILD.md`
- Modify: `package.json`

- [ ] Add a `doctor` script and CI checks for frozen install, Expo Doctor, typecheck, and lint.
- [ ] Document one pnpm-only fresh-clone workflow and independent EAS initialization.
- [ ] Run frozen install, Expo Doctor, typecheck, and lint locally.
