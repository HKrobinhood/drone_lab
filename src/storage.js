import { TUTORIAL_LEVELS, CHALLENGE_LEVELS } from './levels.js';

export const STORAGE_KEY = 'drone_lab_pid_progress_v1';

/**
 * Create a clean default progress state.
 * The first tutorial and first challenge level start unlocked so players can explore either mode.
 */
export function createDefaultProgress() {
  return {
    version: 1,
    stars: {},
    unlocked: {
      'tutorial-1': true,
      'level-1': true
    },
    completed: {},
    bestPid: {},
    bestMetrics: {}
  };
}

function getStorageBackend(customStorage) {
  if (customStorage) return customStorage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

/**
 * Load persisted progress from localStorage (or fallback cleanly to defaults).
 */
export function loadProgress(customStorage) {
  const backend = getStorageBackend(customStorage);
  const defaults = createDefaultProgress();
  if (!backend) return defaults;

  try {
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;

    return {
      version: 1,
      stars: typeof parsed.stars === 'object' && parsed.stars ? { ...parsed.stars } : {},
      unlocked: {
        ...defaults.unlocked,
        ...(typeof parsed.unlocked === 'object' && parsed.unlocked ? parsed.unlocked : {})
      },
      completed: typeof parsed.completed === 'object' && parsed.completed ? { ...parsed.completed } : {},
      bestPid: typeof parsed.bestPid === 'object' && parsed.bestPid ? { ...parsed.bestPid } : {},
      bestMetrics: typeof parsed.bestMetrics === 'object' && parsed.bestMetrics ? { ...parsed.bestMetrics } : {}
    };
  } catch {
    return defaults;
  }
}

export function saveProgress(progress, customStorage) {
  const backend = getStorageBackend(customStorage);
  if (!backend) return false;
  try {
    backend.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function isLevelUnlocked(progress, levelId) {
  return Boolean(progress?.unlocked?.[levelId]);
}

export function getBestStars(progress, levelId) {
  const value = Number(progress?.stars?.[levelId] ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.floor(value)));
}

export function isLevelCompleted(progress, levelId) {
  return Boolean(progress?.completed?.[levelId]) || getBestStars(progress, levelId) > 0;
}

/**
 * Mark a level completed and unlock the next sequential level if provided.
 * Note: Full 1-3 star performance scoring is introduced in M4; M2 records completion
 * and unlocks progression cleanly without inflating star counts prematurely.
 */
export function recordLevelCompletion(progress, levelId, nextLevelId = null, customStorage) {
  return recordLevelResult(progress, levelId, { stars: 0, completed: true }, nextLevelId, customStorage);
}

/**
 * Record flight result, preserving the player's highest historical star count
 * and unlocking the next sequential level when completed.
 */
export function recordLevelResult(progress, levelId, result = {}, nextLevelId = null, customStorage) {
  const updated = {
    version: 1,
    stars: { ...(progress?.stars || {}) },
    unlocked: { ...(progress?.unlocked || {}) },
    completed: { ...(progress?.completed || {}) },
    bestPid: { ...(progress?.bestPid || {}) },
    bestMetrics: { ...(progress?.bestMetrics || {}) }
  };

  updated.unlocked[levelId] = true;
  if (result.completed) {
    updated.completed[levelId] = true;
    if (nextLevelId) {
      updated.unlocked[nextLevelId] = true;
    }

    const prevStars = getBestStars(progress, levelId);
    const earnedStars = Math.max(0, Math.min(3, Math.floor(Number(result.stars ?? 0))));
    if (earnedStars >= prevStars) {
      updated.stars[levelId] = Math.max(prevStars, earnedStars);
      if (result.pidParameters) {
        updated.bestPid[levelId] = { ...result.pidParameters };
      }
      if (result.metrics) {
        updated.bestMetrics[levelId] = {
          completionTime: result.metrics.completionTime,
          pathFitScore: result.metrics.pathFitScore,
          maxOvershoot: result.metrics.maxOvershoot
        };
      }
    }
  }

  saveProgress(updated, customStorage);
  return updated;
}

export function getBestPidReference(progress, levelId) {
  return progress?.bestPid?.[levelId] || null;
}

export function isFirstPlaythrough(progress) {
  return TUTORIAL_LEVELS.every((lvl) => getBestStars(progress, lvl.id) === 0) &&
    CHALLENGE_LEVELS.every((lvl) => getBestStars(progress, lvl.id) === 0);
}

export function getModeSummary(progress, mode) {
  const levels = mode === 'tutorial' ? TUTORIAL_LEVELS : CHALLENGE_LEVELS;
  const maxStars = levels.length * 3;
  let earnedStars = 0;
  let unlockedCount = 0;

  for (const level of levels) {
    earnedStars += getBestStars(progress, level.id);
    if (isLevelUnlocked(progress, level.id)) {
      unlockedCount += 1;
    }
  }

  return {
    totalLevels: levels.length,
    unlockedCount,
    earnedStars,
    maxStars
  };
}
