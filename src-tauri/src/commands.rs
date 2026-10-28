use crate::discord::{fetch_detectable_applications, is_discord_running, SpoofMethod};
use crate::history::{clear_history as clear_history_fs, load_history, save_history};
use crate::spoofer::{force_kill_pid, run_spoofer};
use crate::state::{AppState, FetchProgressEvent, SpooferConfig, SpooferStatus};
use serde::Serialize;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize)]
pub struct FetchGamesResponse {
    pub total: usize,
    pub process_count: usize,
    pub rpc_count: usize,
    pub history_process_count: usize,
    pub history_rpc_count: usize,
}

#[derive(Serialize)]
pub struct SpooferStateResponse {
    pub status: SpooferStatus,
    pub total_count: usize,
    pub process_count: usize,
    pub rpc_count: usize,
    pub history_count: usize,
    pub history_process_count: usize,
    pub history_rpc_count: usize,
}

#[tauri::command]
pub async fn fetch_games(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<FetchGamesResponse, String> {
    let _ = app.emit(
        "fetch_progress",
        FetchProgressEvent {
            total_fetched: 0,
            process_count: 0,
            rpc_count: 0,
            history_process_count: 0,
            history_rpc_count: 0,
            is_loading: true,
        },
    );

    let games = fetch_detectable_applications().await?;
    let history = load_history();
    let total = games.len();
    let process_count = games.iter().filter(|g| g.method == SpoofMethod::Process).count();
    let rpc_count = games.iter().filter(|g| g.method == SpoofMethod::Rpc).count();
    let history_process_count = games
        .iter()
        .filter(|g| g.method == SpoofMethod::Process && history.contains(&g.id))
        .count();
    let history_rpc_count = games
        .iter()
        .filter(|g| g.method == SpoofMethod::Rpc && history.contains(&g.id))
        .count();

    {
        let mut db = state.games_db.write().await;
        *db = games;
    }

    let _ = app.emit(
        "fetch_progress",
        FetchProgressEvent {
            total_fetched: total,
            process_count,
            rpc_count,
            history_process_count,
            history_rpc_count,
            is_loading: false,
        },
    );

    Ok(FetchGamesResponse {
        total,
        process_count,
        rpc_count,
        history_process_count,
        history_rpc_count,
    })
}

#[tauri::command]
pub async fn start_spoofer(
    config: SpooferConfig,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let current_status = *state.status.read().await;
    if current_status == SpooferStatus::Running {
        return Err("Spoofer is already running".to_string());
    }

    // Clone games list from in-memory database
    let games = {
        let db = state.games_db.read().await;
        db.clone()
    };

    if games.is_empty() {
        return Err("No games loaded in database. Please click 'Load DB' first.".to_string());
    }

    // Reset cancellation and pause flags
    state.cancel_flag.store(false, Ordering::SeqCst);
    state.pause_flag.store(false, Ordering::SeqCst);

    let status_lock = state.status.clone();
    let cancel_flag = state.cancel_flag.clone();
    let pause_flag = state.pause_flag.clone();
    let resume_notify = state.resume_notify.clone();
    let active_pids = state.active_pids.clone();

    let task = tokio::spawn(async move {
        run_spoofer(
            app,
            games,
            config,
            status_lock,
            cancel_flag,
            pause_flag,
            resume_notify,
            active_pids,
        )
        .await;
    });

    let mut current_task = state.current_task.lock().await;
    *current_task = Some(task);

    Ok(())
}

#[tauri::command]
pub async fn pause_spoofer(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    state.pause_flag.store(true, Ordering::SeqCst);
    *state.status.write().await = SpooferStatus::Paused;
    let _ = app.emit(
        "spoofer_status",
        crate::state::SpooferStatusEvent {
            status: SpooferStatus::Paused,
            message: None,
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn resume_spoofer(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    state.pause_flag.store(false, Ordering::SeqCst);
    state.resume_notify.notify_waiters();
    *state.status.write().await = SpooferStatus::Running;
    let _ = app.emit(
        "spoofer_status",
        crate::state::SpooferStatusEvent {
            status: SpooferStatus::Running,
            message: None,
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn stop_spoofer(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::SeqCst);
    state.pause_flag.store(false, Ordering::SeqCst);
    state.resume_notify.notify_waiters();

    // Immediately kill all spawned child processes
    let pids = {
        let mut pids_guard = state.active_pids.lock().await;
        let list = pids_guard.clone();
        pids_guard.clear();
        list
    };
    for pid in pids {
        force_kill_pid(pid);
    }

    // Stop background task
    let task_opt = {
        let mut task_guard = state.current_task.lock().await;
        task_guard.take()
    };

    if let Some(mut task) = task_opt {
        tokio::select! {
            _ = &mut task => {},
            _ = tokio::time::sleep(std::time::Duration::from_millis(300)) => {
                task.abort();
            }
        }
    }

    *state.status.write().await = SpooferStatus::Idle;
    let _ = app.emit(
        "spoofer_status",
        crate::state::SpooferStatusEvent {
            status: SpooferStatus::Idle,
            message: None,
        },
    );

    let _ = app.emit(
        "spoofer_tick",
        crate::state::SpooferTickEvent {
            current_index: 0,
            total_games: 0,
            active_batch: Vec::new(),
            elapsed_secs: 0,
            estimated_remaining_secs: 0,
            games_per_minute: 0.0,
        },
    );

    Ok(())
}

#[tauri::command]
pub fn check_discord_status() -> Result<bool, String> {
    Ok(is_discord_running())
}

#[tauri::command]
pub async fn get_spoofer_state(state: State<'_, AppState>) -> Result<SpooferStateResponse, String> {
    let status = *state.status.read().await;
    let games = state.games_db.read().await;
    let history = load_history();
    let total_count = games.len();
    let process_count = games.iter().filter(|g| g.method == SpoofMethod::Process).count();
    let rpc_count = games.iter().filter(|g| g.method == SpoofMethod::Rpc).count();
    let history_count = history.len();
    let history_process_count = games
        .iter()
        .filter(|g| g.method == SpoofMethod::Process && history.contains(&g.id))
        .count();
    let history_rpc_count = games
        .iter()
        .filter(|g| g.method == SpoofMethod::Rpc && history.contains(&g.id))
        .count();
    Ok(SpooferStateResponse {
        status,
        total_count,
        process_count,
        rpc_count,
        history_count,
        history_process_count,
        history_rpc_count,
    })
}

#[tauri::command]
pub async fn get_games_list(state: State<'_, AppState>) -> Result<Vec<crate::discord::SpoofableGame>, String> {
    let db = state.games_db.read().await;
    Ok(db.clone())
}

/// Switches the language used by backend-generated log messages.
#[tauri::command]
pub fn set_language(language: String) {
    crate::i18n::set_language(&language);
}

/// Opens a link in the system default browser. Only GitHub https links are allowed.
#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/") || url.chars().any(char::is_whitespace) {
        return Err("Blocked external URL".to_string());
    }
    open_in_browser(&url)
}

#[cfg(target_os = "windows")]
fn open_in_browser(url: &str) -> Result<(), String> {
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let operation: Vec<u16> = "open\0".encode_utf16().collect();
    let wide_url: Vec<u16> = url.encode_utf16().chain(std::iter::once(0)).collect();

    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            wide_url.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };

    let code = result as isize;
    if code <= 32 {
        return Err(format!("Failed to open browser (ShellExecute code {})", code));
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn open_in_browser(url: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(all(not(windows), not(target_os = "macos")))]
fn open_in_browser(url: &str) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_history() -> Result<(), String> {
    clear_history_fs()
}

#[tauri::command]
pub fn export_history() -> Result<String, String> {
    let history = load_history();
    let list: Vec<String> = history.into_iter().collect();
    serde_json::to_string_pretty(&list).map_err(|e| format!("Failed to export history: {}", e))
}

#[tauri::command]
pub fn import_history(json_data: String) -> Result<usize, String> {
    let imported_list: Vec<String> = serde_json::from_str(&json_data)
        .map_err(|e| format!("Invalid history JSON format: {}", e))?;
    let mut current = load_history();
    let before_len = current.len();
    for id in imported_list {
        current.insert(id);
    }
    let added = current.len() - before_len;
    save_history(&current)?;
    Ok(added)
}
