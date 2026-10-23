use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SpoofHistory {
    pub played_ids: HashSet<String>,
}

pub fn get_history_path() -> PathBuf {
    #[cfg(windows)]
    let base_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir());

    #[cfg(target_os = "macos")]
    let base_dir = std::env::var("HOME")
        .map(|h| PathBuf::from(h).join("Library").join("Application Support"))
        .unwrap_or_else(|_| std::env::temp_dir());

    #[cfg(all(not(windows), not(target_os = "macos")))]
    let base_dir = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join(".config")))
        .unwrap_or_else(|_| std::env::temp_dir());

    let app_dir = base_dir.join("mimic");
    let _ = fs::create_dir_all(&app_dir);
    app_dir.join("history.json")
}

pub fn load_history() -> HashSet<String> {
    let path = get_history_path();
    if !path.exists() {
        return HashSet::new();
    }

    match fs::read_to_string(&path) {
        Ok(data) => match serde_json::from_str::<SpoofHistory>(&data) {
            Ok(hist) => hist.played_ids,
            Err(_) => HashSet::new(),
        },
        Err(_) => HashSet::new(),
    }
}

pub fn save_history(played_ids: &HashSet<String>) -> Result<(), String> {
    let path = get_history_path();
    let hist = SpoofHistory {
        played_ids: played_ids.clone(),
    };
    let json = serde_json::to_string_pretty(&hist).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn record_played_batch(new_ids: &[String]) {
    let mut current = load_history();
    for id in new_ids {
        current.insert(id.clone());
    }
    let _ = save_history(&current);
}

pub fn clear_history() -> Result<(), String> {
    let path = get_history_path();
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
