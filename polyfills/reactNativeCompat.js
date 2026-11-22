/**
 * React Native 0.88+ (Expo SDK 58) compatibility polyfills for third-party
 * libraries (@react-navigation/stack, react-native-paper, etc.) that still
 * reference removed React Native core APIs:
 *   1. `InteractionManager` (removed in RN 0.88; getter in react-native/index.js throws in __DEV__)
 *   2. `StyleSheet.absoluteFillObject` (consolidated into `StyleSheet.absoluteFill` in RN 0.88)
 */
const ReactNative = require('react-native');

let nextInteractionHandle = 1;
const activeHandles = new Set();

const scheduleIdle =
  typeof globalThis.requestIdleCallback === 'function'
    ? (cb) => globalThis.requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 1);

const cancelIdle =
  typeof globalThis.cancelIdleCallback === 'function'
    ? (id) => globalThis.cancelIdleCallback(id)
    : (id) => clearTimeout(id);

const InteractionManagerShim = {
  Events: {
    interactionStart: 'interactionStart',
    interactionComplete: 'interactionComplete',
  },

  runAfterInteractions(task) {
    let cancelled = false;
    let timerId = null;

    const promise = new Promise((resolve) => {
      timerId = scheduleIdle(() => {
        if (cancelled) {
          resolve();
          return;
        }
        try {
          if (typeof task === 'function') {
            resolve(task());
          } else if (task && typeof task.gen === 'function') {
            resolve(task.gen());
          } else {
            resolve();
          }
        } catch {
          resolve();
        }
      });
    });

    return {
      then: promise.then.bind(promise),
      done: promise.then.bind(promise),
      cancel() {
        cancelled = true;
        if (timerId !== null) {
          cancelIdle(timerId);
          timerId = null;
        }
      },
    };
  },

  createInteractionHandle() {
    const handle = nextInteractionHandle++;
    activeHandles.add(handle);
    return handle;
  },

  clearInteractionHandle(handle) {
    if (handle != null) {
      activeHandles.delete(handle);
    }
  },

  setDeadline(_deadline) {
    // No-op compatibility method
  },

  addListener(_eventType, _listener, _context) {
    return {
      remove() {},
    };
  },
};

try {
  Object.defineProperty(ReactNative, 'InteractionManager', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: InteractionManagerShim,
  });
} catch {
  // Ignore if property descriptor cannot be redefined
}

try {
  const StyleSheet = ReactNative.StyleSheet;
  if (StyleSheet && !StyleSheet.absoluteFillObject) {
    const fillObj = StyleSheet.absoluteFill || {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    Object.defineProperty(StyleSheet, 'absoluteFillObject', {
      configurable: true,
      enumerable: true,
      writable: false,
      value: fillObj,
    });
  }
} catch {
  // Ignore if StyleSheet is frozen
}
