use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

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
    let trimmed = raw_name.trim();
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
                clean_buf.push(part);
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

/// Fetches Discord detectable applications database and returns all games categorized
pub async fn fetch_detectable_applications() -> Result<Vec<SpoofableGame>, String> {
    let client = reqwest::Client::builder()
        .user_agent("mimic-discord-agent/2.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get("https://discord.com/api/v9/applications/detectable")
        .send()
        .await
        .map_err(|e| format!("Network error querying Discord API: {}", e))?;

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
