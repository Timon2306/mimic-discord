use crate::discord::SpoofableGame;
use crate::history::{load_history, record_played_batch};
use crate::state::{
    ActiveGameInfo, SpooferConfig, SpooferLogEvent, SpooferStatus, SpooferStatusEvent,
    SpooferTickEvent,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex, Notify, RwLock};

#[cfg(windows)]
static DUMMY_EXE_BYTES: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/dummy.exe"));
#[cfg(not(windows))]
static DUMMY_EXE_BYTES: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/dummy"));

fn log_event(app: &AppHandle, level: &str, message: &str) {
    let now = chrono_now_string();
    let _ = app.emit(
        "spoofer_log",
        SpooferLogEvent {
            timestamp: now,
            level: level.to_string(),
            message: message.to_string(),
        },
    );
}

fn chrono_now_string() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let sec_in_day = secs % 86400;
    let hours = sec_in_day / 3600;
    let mins = (sec_in_day % 3600) / 60;
    let s = sec_in_day % 60;
    format!("{:02}:{:02}:{:02}", hours, mins, s)
}

fn cleanup_temp_dir(temp_dir: &Path) {
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(temp_dir);
    }
}

pub fn force_kill_pid(pid: u32) {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
        let h = OpenProcess(PROCESS_TERMINATE, 0, pid);
        if !h.is_null() {
            TerminateProcess(h, 1);
            CloseHandle(h);
        }
    }
    #[cfg(unix)]
    unsafe {
        libc::kill(pid as i32, libc::SIGKILL);
    }
}

pub async fn run_spoofer(
    app: AppHandle,
    games: Vec<SpoofableGame>,
    config: SpooferConfig,
    status_lock: Arc<RwLock<SpooferStatus>>,
    cancel_flag: Arc<AtomicBool>,
    pause_flag: Arc<AtomicBool>,
    resume_notify: Arc<Notify>,
    active_pids: Arc<Mutex<Vec<u32>>>,
) {
    let history = load_history();
    let filtered_games: Vec<SpoofableGame> = if config.skip_previously_spoofed {
        let before_count = games.len();
        let filtered: Vec<SpoofableGame> = games
            .into_iter()
            .filter(|g| !history.contains(&g.id))
            .collect();
        let skipped = before_count - filtered.len();
        if skipped > 0 {
            log_event(
                &app,
                "info",
                &format!("Пропуск {} ранее эмулированных игр из истории.", skipped),
            );
        }
        filtered
    } else {
        games
    };

    let total_available = filtered_games.len();
    if total_available == 0 {
        *status_lock.write().await = SpooferStatus::Finished;
        let _ = app.emit(
            "spoofer_status",
            SpooferStatusEvent {
                status: SpooferStatus::Finished,
                message: Some("Все игры из базы уже были эмулированы!".to_string()),
            },
        );
        log_event(&app, "success", "Все доступные игры уже эмулированы согласно истории.");
        return;
    }

    let target_count = config
        .limit
        .map(|lim| lim.min(total_available))
        .unwrap_or(total_available);

    let batch_size = config.batch_size.clamp(1, 20);
    let hold_duration = Duration::from_secs(config.hold_duration_secs.clamp(3, 3600));

    log_event(
        &app,
        "info",
        &format!(
            "Режим: {} параллельных процессов, удержание {} сек. Множитель времени: {}x.",
            batch_size, config.hold_duration_secs, batch_size
        ),
    );

    // Prepare temp directory
    let temp_root = std::env::temp_dir().join("mimic_spoofer");
    cleanup_temp_dir(&temp_root);

    if let Err(e) = fs::create_dir_all(&temp_root) {
        *status_lock.write().await = SpooferStatus::Error;
        let err_msg = format!("Ошибка создания временной папки: {}", e);
        let _ = app.emit(
            "spoofer_status",
            SpooferStatusEvent {
                status: SpooferStatus::Error,
                message: Some(err_msg.clone()),
            },
        );
        log_event(&app, "error", &err_msg);
        return;
    }

    // Write base dummy executable
    #[cfg(windows)]
    let base_dummy_path = temp_root.join("base_dummy.exe");
    #[cfg(not(windows))]
    let base_dummy_path = temp_root.join("base_dummy");

    if let Err(e) = fs::write(&base_dummy_path, DUMMY_EXE_BYTES) {
        *status_lock.write().await = SpooferStatus::Error;
        let err_msg = format!("Не удалось создать исполняемый файл: {}", e);
        let _ = app.emit(
            "spoofer_status",
            SpooferStatusEvent {
                status: SpooferStatus::Error,
                message: Some(err_msg.clone()),
            },
        );
        log_event(&app, "error", &err_msg);
        cleanup_temp_dir(&temp_root);
        return;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&base_dummy_path, fs::Permissions::from_mode(0o755));
    }

    // Set status to Running
    *status_lock.write().await = SpooferStatus::Running;
    let _ = app.emit(
        "spoofer_status",
        SpooferStatusEvent {
            status: SpooferStatus::Running,
            message: None,
        },
    );

    log_event(
        &app,
        "info",
        &format!(
            "Запуск mimic: цель {} игр, батч {}, удержание {} сек",
            target_count,
            batch_size,
            config.hold_duration_secs
        ),
    );

    let start_time = Instant::now();
    let mut current_index = 0usize;

    while current_index < target_count {
        // Check cancellation
        if cancel_flag.load(Ordering::SeqCst) {
            log_event(&app, "warn", "Процесс остановлен пользователем.");
            break;
        }

        // Check pause
        if pause_flag.load(Ordering::SeqCst) {
            *status_lock.write().await = SpooferStatus::Paused;
            let _ = app.emit(
                "spoofer_status",
                SpooferStatusEvent {
                    status: SpooferStatus::Paused,
                    message: None,
                },
            );
            log_event(&app, "warn", "Пауза. Ожидание возобновления...");
            resume_notify.notified().await;
            if cancel_flag.load(Ordering::SeqCst) {
                break;
            }
            *status_lock.write().await = SpooferStatus::Running;
            let _ = app.emit(
                "spoofer_status",
                SpooferStatusEvent {
                    status: SpooferStatus::Running,
                    message: None,
                },
            );
            log_event(&app, "info", "Продолжение работы.");
        }

        let batch_end = (current_index + batch_size).min(target_count);
        let current_batch_games = &filtered_games[current_index..batch_end];

        let mut spawned_processes: Vec<(Child, SpoofableGame, PathBuf)> = Vec::new();
        let mut active_batch_info: Vec<ActiveGameInfo> = Vec::new();

        // Clear active pids tracker for this new batch
        {
            let mut pids_guard = active_pids.lock().await;
            pids_guard.clear();
        }

        // Prepare and spawn processes in this batch
        for game in current_batch_games {
            let target_exe_path = temp_root.join(&game.rel_path);

            if let Some(parent) = target_exe_path.parent() {
                let _ = fs::create_dir_all(parent);
            }

            // Create executable via hard link or copy
            if !target_exe_path.exists() {
                if fs::hard_link(&base_dummy_path, &target_exe_path).is_err() {
                    let _ = fs::copy(&base_dummy_path, &target_exe_path);
                }
            }

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&target_exe_path, fs::Permissions::from_mode(0o755));
            }

            let mut cmd = Command::new(&target_exe_path);
            // Pass the game name as first argument so dummy creates a window with this title
            cmd.arg(&game.name);

            match cmd.spawn() {
                Ok(child) => {
                    let pid = child.id();
                    {
                        let mut pids_guard = active_pids.lock().await;
                        pids_guard.push(pid);
                    }
                    active_batch_info.push(ActiveGameInfo {
                        id: game.id.clone(),
                        name: game.name.clone(),
                        executable: game.rel_path.clone(),
                        pid: Some(pid),
                        icon_hash: game.icon_hash.clone(),
                    });
                    spawned_processes.push((child, game.clone(), target_exe_path));
                }
                Err(e) => {
                    log_event(
                        &app,
                        "warn",
                        &format!("Не удалось запустить '{}': {}", game.name, e),
                    );
                }
            }
        }

        // Emit initial tick for this batch
        let elapsed_secs = start_time.elapsed().as_secs();
        let games_done = current_index;
        let games_per_sec = if elapsed_secs > 0 {
            games_done as f64 / elapsed_secs as f64
        } else {
            0.0
        };
        let remaining_games = target_count.saturating_sub(games_done);
        let estimated_remaining_secs = if games_per_sec > 0.0 {
            (remaining_games as f64 / games_per_sec) as u64
        } else {
            (remaining_games as u64 / batch_size as u64) * config.hold_duration_secs
        };

        let _ = app.emit(
            "spoofer_tick",
            SpooferTickEvent {
                current_index,
                total_games: target_count,
                active_batch: active_batch_info.clone(),
                elapsed_secs,
                estimated_remaining_secs,
                games_per_minute: games_per_sec * 60.0,
            },
        );

        let batch_names: Vec<&str> = current_batch_games.iter().map(|g| g.name.as_str()).collect();
        log_event(
            &app,
            "info",
            &format!(
                "Активный батч ({}/{}): {}",
                current_index + current_batch_games.len(),
                target_count,
                batch_names.join(", ")
            ),
        );

        // Hold processes for the configured duration, monitoring cancel and pause signals
        let mut hold_start = Instant::now();
        while hold_start.elapsed() < hold_duration {
            if cancel_flag.load(Ordering::SeqCst) {
                break;
            }

            if pause_flag.load(Ordering::SeqCst) {
                *status_lock.write().await = SpooferStatus::Paused;
                let _ = app.emit(
                    "spoofer_status",
                    SpooferStatusEvent {
                        status: SpooferStatus::Paused,
                        message: None,
                    },
                );
                log_event(&app, "warn", "Пауза в текущем батче.");
                let pause_start = Instant::now();
                resume_notify.notified().await;
                if cancel_flag.load(Ordering::SeqCst) {
                    break;
                }
                hold_start += pause_start.elapsed();
                *status_lock.write().await = SpooferStatus::Running;
                let _ = app.emit(
                    "spoofer_status",
                    SpooferStatusEvent {
                        status: SpooferStatus::Running,
                        message: None,
                    },
                );
                log_event(&app, "info", "Продолжение работы.");
            }

            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        // Safely kill all spawned processes for this batch and immediately delete temporary files
        for (mut child, _game, exe_path) in spawned_processes {
            let pid = child.id();
            force_kill_pid(pid);
            let _ = child.kill();
            let _ = child.wait();

            // Delete temporary executable and its subfolder to avoid cluttering Discord's process cache
            let _ = fs::remove_file(&exe_path);
            if let Some(parent) = exe_path.parent() {
                if parent != temp_root {
                    let _ = fs::remove_dir(parent);
                }
            }
        }

        {
            let mut pids_guard = active_pids.lock().await;
            pids_guard.clear();
        }

        // Record completed batch in persistent history
        if !cancel_flag.load(Ordering::SeqCst) {
            let batch_ids: Vec<String> = current_batch_games.iter().map(|g| g.id.clone()).collect();
            record_played_batch(&batch_ids);
        }

        current_index = batch_end;

        // Emit updated tick after batch completed
        let elapsed_secs = start_time.elapsed().as_secs();
        let games_done = current_index;
        let games_per_sec = if elapsed_secs > 0 {
            games_done as f64 / elapsed_secs as f64
        } else {
            0.0
        };
        let remaining_games = target_count.saturating_sub(games_done);
        let estimated_remaining_secs = if games_per_sec > 0.0 {
            (remaining_games as f64 / games_per_sec) as u64
        } else {
            0
        };

        let _ = app.emit(
            "spoofer_tick",
            SpooferTickEvent {
                current_index,
                total_games: target_count,
                active_batch: Vec::new(),
                elapsed_secs,
                estimated_remaining_secs,
                games_per_minute: games_per_sec * 60.0,
            },
        );

        if cancel_flag.load(Ordering::SeqCst) {
            break;
        }
    }

    // Clean up temporary files
    cleanup_temp_dir(&temp_root);

    let final_status = if cancel_flag.load(Ordering::SeqCst) {
        SpooferStatus::Idle
    } else {
        SpooferStatus::Finished
    };

    *status_lock.write().await = final_status;
    let _ = app.emit(
        "spoofer_status",
        SpooferStatusEvent {
            status: final_status,
            message: None,
        },
    );

    let total_elapsed = start_time.elapsed().as_secs();
    if final_status == SpooferStatus::Finished {
        log_event(
            &app,
            "success",
            &format!(
                "Эмуляция {} игр завершена за {} сек! Discord зарегистрировал игры в профиле.",
                current_index, total_elapsed
            ),
        );
    } else {
        log_event(
            &app,
            "info",
            &format!(
                "Работа остановлена. Обработано {} игр за {} сек.",
                current_index, total_elapsed
            ),
        );
    }
}
