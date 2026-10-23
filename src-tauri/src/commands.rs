use crate::discord::{fetch_detectable_applications, is_discord_running};
use crate::history::{clear_history as clear_history_fs, load_history};
use crate::spoofer::{force_kill_pid, run_spoofer};
use crate::state::{AppState, FetchProgressEvent, SpooferConfig, SpooferStatus};
use serde::Serialize;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize)]
pub struct FetchGamesResponse {
    pub total: usize,
    pub win32: usize,
}

#[derive(Serialize)]
pub struct SpooferStateResponse {
    pub status: SpooferStatus,
    pub win32_count: usize,
    pub history_count: usize,
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
            win32_count: 0,
            is_loading: true,
        },
    );

    let games = fetch_detectable_applications().await?;
    let win32_count = games.len();

    {
        let mut db = state.games_db.write().await;
        *db = games;
    }

    let _ = app.emit(
        "fetch_progress",
        FetchProgressEvent {
            total_fetched: win32_count,
            win32_count,
            is_loading: false,
        },
    );

    Ok(FetchGamesResponse {
        total: win32_count,
        win32: win32_count,
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
    let win32_count = state.games_db.read().await.len();
    let history_count = load_history().len();
    Ok(SpooferStateResponse {
        status,
        win32_count,
        history_count,
    })
}

#[tauri::command]
pub async fn get_games_list(state: State<'_, AppState>) -> Result<Vec<crate::discord::SpoofableGame>, String> {
    let db = state.games_db.read().await;
    Ok(db.clone())
}

#[tauri::command]
pub fn clear_history() -> Result<(), String> {
    clear_history_fs()
}
