use crate::discord::SpoofableGame;
use serde::{Deserialize, Serialize};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tokio::sync::{Mutex, Notify, RwLock};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SpooferStatus {
    Idle,
    Running,
    Paused,
    Finished,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveGameInfo {
    pub id: String,
    pub name: String,
    pub executable: String,
    pub pid: Option<u32>,
    pub icon_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpooferTickEvent {
    pub current_index: usize,
    pub total_games: usize,
    pub active_batch: Vec<ActiveGameInfo>,
    pub elapsed_secs: u64,
    pub estimated_remaining_secs: u64,
    pub games_per_minute: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpooferLogEvent {
    pub timestamp: String,
    pub level: String, // "info" | "success" | "warn" | "error"
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpooferStatusEvent {
    pub status: SpooferStatus,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchProgressEvent {
    pub total_fetched: usize,
    pub win32_count: usize,
    pub is_loading: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpooferConfig {
    pub limit: Option<usize>,
    pub batch_size: usize,
    pub hold_duration_secs: u64,
    pub start_offset: Option<usize>,
    #[serde(default)]
    pub skip_previously_spoofed: bool,
}

pub struct AppState {
    pub games_db: Arc<RwLock<Vec<SpoofableGame>>>,
    pub status: Arc<RwLock<SpooferStatus>>,
    pub cancel_flag: Arc<AtomicBool>,
    pub pause_flag: Arc<AtomicBool>,
    pub resume_notify: Arc<Notify>,
    pub active_pids: Arc<Mutex<Vec<u32>>>,
    pub current_task: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            games_db: Arc::new(RwLock::new(Vec::new())),
            status: Arc::new(RwLock::new(SpooferStatus::Idle)),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            pause_flag: Arc::new(AtomicBool::new(false)),
            resume_notify: Arc::new(Notify::new()),
            active_pids: Arc::new(Mutex::new(Vec::new())),
            current_task: Arc::new(Mutex::new(None)),
        }
    }
}
