import { execSync } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import zlib from "zlib";
import { glob } from "glob";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import { extract } from "tar";
import AdmZip from "adm-zip";

import { log_debug, log_error, log_info, log_success } from "./utils.mjs";

/**
 * Simplified prebuild script for RV Verge
 * Downloads mihomo core binary for the target platform
 */

const cwd = process.cwd();
const TEMP_DIR = path.join(cwd, "node_modules/.rv-verge");
const FORCE = process.argv.includes("--force") || process.argv.includes("-f");
const VERSION_CACHE_FILE = path.join(TEMP_DIR, ".version_cache.json");

const PLATFORM_MAP = {
  "x86_64-pc-windows-msvc": "win32",
  "i686-pc-windows-msvc": "win32",
  "aarch64-pc-windows-msvc": "win32",
  "x86_64-apple-darwin": "darwin",
  "aarch64-apple-darwin": "darwin",
  "x86_64-unknown-linux-gnu": "linux",
  "i686-unknown-linux-gnu": "linux",
  "aarch64-unknown-linux-gnu": "linux",
  "armv7-unknown-linux-gnueabihf": "linux",
  "riscv64gc-unknown-linux-gnu": "linux",
  "loongarch64-unknown-linux-gnu": "linux",
};

const ARCH_MAP = {
  "x86_64-pc-windows-msvc": "x64",
  "i686-pc-windows-msvc": "ia32",
  "aarch64-pc-windows-msvc": "arm64",
  "x86_64-apple-darwin": "x64",
  "aarch64-apple-darwin": "arm64",
  "x86_64-unknown-linux-gnu": "x64",
  "i686-unknown-linux-gnu": "ia32",
  "aarch64-unknown-linux-gnu": "arm64",
  "armv7-unknown-linux-gnueabihf": "arm",
  "riscv64gc-unknown-linux-gnu": "riscv64",
  "loongarch64-unknown-linux-gnu": "loong64",
};

const arg1 = process.argv.slice(2)[0];
const arg2 = process.argv.slice(2)[1];
const target = arg1 === "--force" || arg1 === "-f" ? arg2 : arg1;

// Get platform and arch
let platform, arch;
if (target) {
  platform = PLATFORM_MAP[target];
  arch = ARCH_MAP[target];
} else {
  try {
    const rustcOutput = execSync("rustc -vV").toString();
    const hostMatch = rustcOutput.match(/(?<=host: ).+(?=\s*)/g);
    if (hostMatch && hostMatch[0]) {
      const host = hostMatch[0];
      platform = PLATFORM_MAP[host];
      arch = ARCH_MAP[host];
    }
  } catch (err) {
    log_error("Failed to detect platform:", err.message);
    process.exit(1);
  }
}

if (!platform || !arch) {
  log_error(`Unsupported platform: ${target || "unknown"}`);
  process.exit(1);
}

const SIDECAR_HOST = target || execSync("rustc -vV").toString().match(/(?<=host: ).+(?=\s*)/g)[0];

// Version cache
async function loadVersionCache() {
  try {
    if (fs.existsSync(VERSION_CACHE_FILE)) {
      const data = await fsp.readFile(VERSION_CACHE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    log_debug("Failed to load version cache:", err.message);
  }
  return {};
}

async function saveVersionCache(cache) {
  try {
    await fsp.mkdir(TEMP_DIR, { recursive: true });
    await fsp.writeFile(VERSION_CACHE_FILE, JSON.stringify(cache, null, 2));
    log_debug("Version cache saved");
  } catch (err) {
    log_debug("Failed to save version cache:", err.message);
  }
}

async function getCachedVersion(key) {
  const cache = await loadVersionCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < 3600000) {
    log_info(`Using cached version for ${key}: ${cached.version}`);
    return cached.version;
  }
  return null;
}

async function setCachedVersion(key, version) {
  const cache = await loadVersionCache();
  cache[key] = { version, timestamp: Date.now() };
  await saveVersionCache(cache);
}

// META version URLs
const META_VERSION_URL =
  "https://github.com/MetaCubeX/mihomo/releases/latest/download/version.txt";
const META_URL_PREFIX = `https://github.com/MetaCubeX/mihomo/releases/download`;
let META_VERSION;

const META_MAP = {
  "win32-x64": "mihomo-windows-amd64-v2",
  "win32-ia32": "mihomo-windows-386",
  "win32-arm64": "mihomo-windows-arm64",
  "darwin-x64": "mihomo-darwin-amd64-v2-go122",
  "darwin-arm64": "mihomo-darwin-arm64-go122",
  "linux-x64": "mihomo-linux-amd64-v2",
  "linux-ia32": "mihomo-linux-386",
  "linux-arm64": "mihomo-linux-arm64",
  "linux-arm": "mihomo-linux-armv7",
  "linux-riscv64": "mihomo-linux-riscv64",
  "linux-loong64": "mihomo-linux-loong64",
};

// Validate platform support
if (!META_MAP[`${platform}-${arch}`]) {
  log_error(`clash meta unsupported platform "${platform}-${arch}"`);
  process.exit(1);
}

// Fetch latest version
async function getLatestReleaseVersion() {
  if (!FORCE) {
    const cached = await getCachedVersion("META_VERSION");
    if (cached) {
      META_VERSION = cached;
      return;
    }
  }

  const options = {};
  const httpProxy =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;
  if (httpProxy) options.agent = new HttpsProxyAgent(httpProxy);

  try {
    const response = await fetch(META_VERSION_URL, {
      ...options,
      method: "GET",
    });
    if (!response.ok)
      throw new Error(
        `Failed to fetch ${META_VERSION_URL}: ${response.status}`,
      );
    META_VERSION = (await response.text()).trim();
    log_info(`Latest mihomo version: ${META_VERSION}`);
    await setCachedVersion("META_VERSION", META_VERSION);
  } catch (err) {
    log_error("Error fetching latest mihomo version:", err.message);
    process.exit(1);
  }
}

// Build meta object
function clashMeta() {
  const name = META_MAP[`${platform}-${arch}`];
  const isWin = platform === "win32";
  const urlExt = isWin ? "zip" : "gz";
  return {
    name: "verge-mihomo",
    targetFile: `verge-mihomo-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile: `${name}${isWin ? ".exe" : ""}`,
    zipFile: `${name}-${META_VERSION}.${urlExt}`,
    downloadURL: `${META_URL_PREFIX}/${META_VERSION}/${name}-${META_VERSION}.${urlExt}`,
  };
}

// Download file
async function downloadFile(url, outPath) {
  const options = {};
  const httpProxy =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;
  if (httpProxy) options.agent = new HttpsProxyAgent(httpProxy);

  const response = await fetch(url, {
    ...options,
    method: "GET",
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: status ${response.status}`);
  }

  const buf = Buffer.from(await response.arrayBuffer());
  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  await fsp.writeFile(outPath, buf);
  log_success(`Download finished: ${url}`);
}

// Resolve sidecar
async function resolveSidecar(binInfo) {
  const { name, targetFile, zipFile, exeFile, downloadURL } = binInfo;
  const sidecarDir = path.join(cwd, "src-tauri", "sidecar");
  const sidecarPath = path.join(sidecarDir, targetFile);
  await fsp.mkdir(sidecarDir, { recursive: true });

  if (!FORCE && fs.existsSync(sidecarPath)) {
    log_success(`"${name}" already exists, skipping download`);
    return;
  }

  const tempDir = path.join(TEMP_DIR, name);
  const tempZip = path.join(tempDir, zipFile);
  const tempExe = path.join(tempDir, exeFile);
  await fsp.mkdir(tempDir, { recursive: true });

  try {
    if (!fs.existsSync(tempZip)) {
      await downloadFile(downloadURL, tempZip);
    }

    if (zipFile.endsWith(".zip")) {
      const zip = new AdmZip(tempZip);
      zip.extractAllTo(tempDir, true);
      if (fs.existsSync(tempExe)) {
        await fsp.rename(tempExe, sidecarPath);
      } else {
        const files = await fsp.readdir(tempDir);
        const candidate = files.find(
          (f) =>
            f === path.basename(exeFile) ||
            f.endsWith(".exe") ||
            !f.includes("."),
        );
        if (!candidate)
          throw new Error(`Expected binary not found in ${tempDir}`);
        await fsp.rename(path.join(tempDir, candidate), sidecarPath);
      }
      if (platform !== "win32") execSync(`chmod 755 ${sidecarPath}`);
      log_success(`Unzip finished: "${name}"`);
    } else {
      // .gz
      const readStream = fs.createReadStream(tempZip);
      const writeStream = fs.createWriteStream(sidecarPath);
      await new Promise((resolve, reject) => {
        readStream
          .pipe(zlib.createGunzip())
          .on("error", (e) => {
            log_error(`gunzip error for ${name}:`, e.message);
            reject(e);
          })
          .pipe(writeStream)
          .on("finish", () => {
            if (platform !== "win32") execSync(`chmod 755 ${sidecarPath}`);
            resolve();
          })
          .on("error", (e) => {
            log_error(`write stream error for ${name}:`, e.message);
            reject(e);
          });
      });
      log_success(`Gzip binary processed: "${name}"`);
    }
  } catch (err) {
    await fsp.rm(sidecarPath, { recursive: true, force: true });
    throw err;
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

// Resolve resources
async function resolveResource(binInfo) {
  const { file, downloadURL, localPath } = binInfo;
  const resDir = path.join(cwd, "src-tauri", "resources");
  const targetPath = path.join(resDir, file);

  if (!FORCE && fs.existsSync(targetPath) && !downloadURL && !localPath) {
    log_success(`"${file}" already exists, skipping`);
    return;
  }

  if (downloadURL) {
    if (!FORCE && fs.existsSync(targetPath)) {
      log_success(`"${file}" already exists, skipping download`);
      return;
    }
    await fsp.mkdir(resDir, { recursive: true });
    await downloadFile(downloadURL, targetPath);
  }

  if (localPath) {
    await fsp.mkdir(resDir, { recursive: true });
    await fsp.copyFile(localPath, targetPath);
    log_success(`Copied file: ${file}`);
  }
}

// Resolve mmdb, geosite, geoip
const resolveMmdb = () =>
  resolveResource({
    file: "Country.mmdb",
    downloadURL: `https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country.mmdb`,
  });

const resolveGeosite = () =>
  resolveResource({
    file: "geosite.dat",
    downloadURL: `https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat`,
  });

const resolveGeoIP = () =>
  resolveResource({
    file: "geoip.dat",
    downloadURL: `https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat`,
  });

// Main tasks
async function runTasks() {
  log_info("Starting prebuild tasks...");
  log_info(`Platform: ${platform}, Arch: ${arch}`);

  try {
    // Get latest version
    await getLatestReleaseVersion();

    // Download mihomo core
    await resolveSidecar(clashMeta());

    // Download resources
    await resolveMmdb();
    await resolveGeosite();
    await resolveGeoIP();

    log_success("All prebuild tasks completed!");
  } catch (err) {
    log_error("Prebuild failed:", err.message);
    process.exit(1);
  }
}

// Run tasks
runTasks();

