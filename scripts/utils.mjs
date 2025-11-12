export function log_info(...args) {
  console.log("[INFO]", ...args);
}

export function log_error(...args) {
  console.error("[ERROR]", ...args);
}

export function log_success(...args) {
  console.log("[SUCCESS]", ...args);
}

export function log_debug(...args) {
  if (process.env.DEBUG) {
    console.log("[DEBUG]", ...args);
  }
}

