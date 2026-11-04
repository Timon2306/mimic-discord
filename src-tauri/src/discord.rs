use crate::history::get_app_dir;
use crate::i18n::is_russian;
use crate::spoofer::log_event;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

const DETECTABLE_URL: &str = "https://discord.com/api/v9/applications/detectable";
/// A fresh cached copy is used on startup instead of hitting the Discord API again.
const CACHE_TTL_SECS: u64 = 12 * 60 * 60;
const MAX_FETCH_ATTEMPTS: u32 = 3;
/// Longer rate limits are not waited out: the cached copy (if any) is used instead.
const MAX_RETRY_WAIT_SECS: u64 = 30;
/// Bump when the processed game format changes so stale caches are refetched.
const CACHE_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SpoofMethod {
    Process,
    Rpc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawExecutableEntry {
    pub name: String,
    pub os: String,
    #[serde(default)]
    pub arguments: Option<String>,
    #[serde(default)]
    pub is_launcher: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawDetectableApp {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub icon_hash: Option<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub executables: Vec<RawExecutableEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpoofableGame {
    pub id: String,
    pub name: String,
    pub rel_path: Option<String>,
    pub arguments: Option<String>,
    pub icon_hash: Option<String>,
    pub method: SpoofMethod,
}

/// Normalizes executable name to a safe relative path for the host OS
fn sanitize_relative_path(raw_name: &str) -> Option<PathBuf> {
    // Discord marks some entries with '>' ("match the file name only"); it is not part of the path
    let trimmed = raw_name.trim().trim_start_matches('>').trim();
    if trimmed.is_empty() {
        return None;
    }

    // Replace both slashes to native separator
    let normalized = if cfg!(windows) {
        trimmed.replace('/', "\\")
    } else {
        trimmed.replace('\\', "/")
    };

    let path = Path::new(&normalized);

    // Ensure path is relative and does not escape via ".."
    let mut clean_buf = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(part) => {
                // Drop characters Windows rejects in file names (os error 123)
                let part: String = part
                    .to_string_lossy()
                    .chars()
                    .filter(|c| !matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') && !c.is_control())
                    .collect();
                let part = part.trim_end_matches(|c| c == '.' || c == ' ');
                if !part.is_empty() {
                    clean_buf.push(part);
                }
            }
            _ => {
                // Ignore root, prefix, or parent dir components for safety
            }
        }
    }

    if clean_buf.as_os_str().is_empty() {
        return None;
    }

    // On Windows, ensure executable has .exe extension if none exists
    #[cfg(windows)]
    {
        if clean_buf.extension().is_none() {
            clean_buf.set_extension("exe");
        }
    }

    Some(clean_buf)
}

#[derive(Serialize, Deserialize)]
struct GamesCache {
    #[serde(default)]
    version: u32,
    fetched_at: u64,
    games: Vec<SpoofableGame>,
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn cache_path() -> PathBuf {
    get_app_dir().join("games_cache.json")
}

fn load_cache() -> Option<GamesCache> {
    let data = fs::read_to_string(cache_path()).ok()?;
    let cache: GamesCache = serde_json::from_str(&data).ok()?;
    if cache.version != CACHE_VERSION || cache.games.is_empty() {
        return None;
    }
    Some(cache)
}

fn save_cache(games: &[SpoofableGame]) {
    let cache = GamesCache {
        version: CACHE_VERSION,
        fetched_at: unix_now(),
        games: games.to_vec(),
    };
    if let Ok(json) = serde_json::to_string(&cache) {
        let _ = fs::write(cache_path(), json);
    }
}

/// Loads the games database. Uses the cached copy while it is fresh (unless
/// `force_refresh`), and falls back to it when Discord refuses the request.
/// Returns the games and whether they came from the cache.
pub async fn load_games(
    app: &AppHandle,
    force_refresh: bool,
) -> Result<(Vec<SpoofableGame>, bool), String> {
    let cache = load_cache();

    if !force_refresh {
        if let Some(cache) = &cache {
            if unix_now().saturating_sub(cache.fetched_at) < CACHE_TTL_SECS {
                return Ok((cache.games.clone(), true));
            }
        }
    }

    match fetch_detectable_applications(app).await {
        Ok(games) => {
            save_cache(&games);
            Ok((games, false))
        }
        Err(err) => {
            let Some(cache) = cache else {
                return Err(err);
            };
            let hours = unix_now().saturating_sub(cache.fetched_at) / 3600;
            let message = if is_russian() {
                format!(
                    "{} Используется сохранённая база ({} ч назад).",
                    err, hours
                )
            } else {
                format!("{} Using the saved database ({} h old).", err, hours)
            };
            log_event(app, "warn", &message);
            Ok((cache.games, true))
        }
    }
}

fn retry_after_secs(response: &reqwest::Response) -> Option<u64> {
    let raw = response.headers().get("retry-after")?.to_str().ok()?;
    let secs: f64 = raw.trim().parse().ok()?;
    Some(secs.ceil().max(1.0) as u64)
}

/// Fetches Discord detectable applications database and returns all games categorized
pub async fn fetch_detectable_applications(app: &AppHandle) -> Result<Vec<SpoofableGame>, String> {
    let client = reqwest::Client::builder()
        .user_agent("mimic-discord-agent/2.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let response = client
            .get(DETECTABLE_URL)
            .send()
            .await
            .map_err(|e| format!("Network error querying Discord API: {}", e))?;

        if response.status() != StatusCode::TOO_MANY_REQUESTS {
            break response;
        }

        let wait_secs = retry_after_secs(&response).unwrap_or(5);
        if attempt >= MAX_FETCH_ATTEMPTS || wait_secs > MAX_RETRY_WAIT_SECS {
            return Err(if is_russian() {
                format!(
                    "Discord временно ограничил запросы (429). Попробуйте обновить базу через {} сек.",
                    wait_secs
                )
            } else {
                format!(
                    "Discord is rate limiting requests (429). Try refreshing the database in {} sec.",
                    wait_secs
                )
            });
        }

        let message = if is_russian() {
            format!(
                "Discord ограничил запросы (429), повтор через {} сек ({}/{})...",
                wait_secs, attempt, MAX_FETCH_ATTEMPTS
            )
        } else {
            format!(
                "Discord rate limited the request (429), retrying in {} sec ({}/{})...",
                wait_secs, attempt, MAX_FETCH_ATTEMPTS
            )
        };
        log_event(app, "warn", &message);
        tokio::time::sleep(Duration::from_secs(wait_secs)).await;
    };

    if !response.status().is_success() {
        return Err(format!(
            "Discord API returned unsuccessful status: {}",
            response.status()
        ));
    }

    let raw_apps: Vec<RawDetectableApp> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Discord API JSON response: {}", e))?;

    let mut result = Vec::with_capacity(raw_apps.len());

    let target_os = if cfg!(target_os = "windows") {
        "win32"
    } else if cfg!(target_os = "macos") {
        "darwin"
    } else {
        "linux"
    };

    for app in raw_apps {
        // Find best candidate executable for the current target OS ONLY
        let candidates: Vec<&RawExecutableEntry> = app
            .executables
            .iter()
            .filter(|e| e.os.eq_ignore_ascii_case(target_os))
            .collect();

        if !candidates.is_empty() {
            // Priority 1: non-launcher executable
            // Priority 2: any executable for this OS
            let best_exe = candidates
                .iter()
                .find(|e| e.is_launcher != Some(true))
                .unwrap_or(&candidates[0]);

            if let Some(clean_path) = sanitize_relative_path(&best_exe.name) {
                result.push(SpoofableGame {
                    id: app.id,
                    name: app.name,
                    rel_path: Some(clean_path.to_string_lossy().to_string()),
                    arguments: best_exe.arguments.clone(),
                    icon_hash: app.icon_hash,
                    method: SpoofMethod::Process,
                });
                continue;
            }
        }

        // Fallback for games without native binaries: categorize as RPC
        result.push(SpoofableGame {
            id: app.id,
            name: app.name,
            rel_path: None,
            arguments: None,
            icon_hash: app.icon_hash,
            method: SpoofMethod::Rpc,
        });
    }

    Ok(result)
}

/// Checks if desktop Discord client is currently running on Windows, macOS, or Linux
#[cfg(windows)]
pub fn is_discord_running() -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return false;
        }

        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let null_pos = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let exe_name = String::from_utf16_lossy(&entry.szExeFile[..null_pos]).to_lowercase();

                if exe_name == "discord.exe"
                    || exe_name == "discordcanary.exe"
                    || exe_name == "discordptb.exe"
                    || exe_name == "discorddevelopment.exe"
                {
                    CloseHandle(snapshot);
                    return true;
                }

                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
    }

    false
}

#[cfg(unix)]
pub fn is_discord_running() -> bool {
    // Universal Unix check (macOS & Linux / ALT Linux / Flatpak)
    std::process::Command::new("pgrep")
        .arg("-i")
        .arg("discord")
        .output()
        .map(|out| out.status.success() && !out.stdout.is_empty())
        .unwrap_or(false)
}

#[cfg(not(any(windows, unix)))]
pub fn is_discord_running() -> bool {
    false
}
