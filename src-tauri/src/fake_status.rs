//! Fake status: one Rich Presence activity held until the user stops it.
//! Independent of the spoofer run, so it also works for games without an exe.

use crate::i18n::pick;
use crate::rpc::DiscordRpcSession;
use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

/// Discord accepts 2..=128 characters in the activity text fields.
const MIN_TEXT_CHARS: usize = 2;
const MAX_TEXT_CHARS: usize = 128;
const MAX_IMAGE_URL_CHARS: usize = 256;
/// Playing, Listening, Watching, Competing.
const ALLOWED_ACTIVITY_TYPES: [u8; 4] = [0, 2, 3, 5];

#[derive(Debug, Clone, Deserialize)]
pub struct FakeStatusConfig {
    /// Discord application the status is shown for (a game from the database).
    pub game_id: String,
    /// Replaces the game's name in the status.
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub details: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    /// Direct https link to a picture; Discord downloads it itself.
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub activity_type: Option<u8>,
}

fn clean_text(
    value: &Option<String>,
    field_ru: &'static str,
    field_en: &'static str,
) -> Result<Option<String>, String> {
    let Some(text) = value.as_deref().map(str::trim).filter(|t| !t.is_empty()) else {
        return Ok(None);
    };
    let length = text.chars().count();
    if !(MIN_TEXT_CHARS..=MAX_TEXT_CHARS).contains(&length) {
        return Err(format!(
            "{}: {}",
            pick(field_ru, field_en),
            pick("нужно от 2 до 128 символов.", "must be 2 to 128 characters long.")
        ));
    }
    Ok(Some(text.to_string()))
}

fn build_activity(config: &FakeStatusConfig) -> Result<Value, String> {
    let mut activity = Map::new();
    let start_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    activity.insert("timestamps".into(), json!({ "start": start_ms }));
    activity.insert("instance".into(), json!(true));

    let activity_type = config.activity_type.unwrap_or(0);
    if !ALLOWED_ACTIVITY_TYPES.contains(&activity_type) {
        return Err(pick("Неизвестный тип статуса.", "Unknown status type.").to_string());
    }
    activity.insert("type".into(), json!(activity_type));

    if let Some(name) = clean_text(&config.name, "Название", "Name")? {
        activity.insert("name".into(), json!(name));
    }
    if let Some(details) = clean_text(&config.details, "Первая строка", "First line")? {
        activity.insert("details".into(), json!(details));
    }
    if let Some(state) = clean_text(&config.state, "Вторая строка", "Second line")? {
        activity.insert("state".into(), json!(state));
    }
    if let Some(url) = config
        .image_url
        .as_deref()
        .map(str::trim)
        .filter(|u| !u.is_empty())
    {
        if !url.starts_with("https://") || url.chars().count() > MAX_IMAGE_URL_CHARS {
            return Err(pick(
                "Картинка: нужна прямая ссылка, которая начинается с https:// (до 256 символов).",
                "Image: a direct link starting with https:// is required (up to 256 characters).",
            )
            .to_string());
        }
        activity.insert("assets".into(), json!({ "large_image": url }));
    }

    Ok(Value::Object(activity))
}

/// Sets the status and keeps it until the returned sender fires (or is dropped)
/// or Discord closes the pipe.
pub async fn start(
    app: AppHandle,
    config: FakeStatusConfig,
) -> Result<oneshot::Sender<()>, String> {
    let game_id = config.game_id.trim();
    if game_id.is_empty() || !game_id.chars().all(|c| c.is_ascii_digit()) {
        return Err(pick("Сначала выберите игру.", "Pick a game first.").to_string());
    }
    let activity = build_activity(&config)?;

    let mut session = DiscordRpcSession::connect(game_id).await.map_err(|e| {
        format!(
            "{} ({})",
            pick(
                "Не удалось подключиться к Discord. Запустите приложение Discord для ПК.",
                "Could not connect to Discord. Start the Discord desktop app.",
            ),
            e
        )
    })?;

    let pid = std::process::id();
    session.set_custom_activity(activity, pid).await?;

    let (stop_tx, stop_rx) = oneshot::channel::<()>();
    tokio::spawn(async move {
        tokio::select! {
            _ = stop_rx => {
                let _ = session.clear_activity(pid).await;
            }
            _ = session.wait_closed() => {
                // Discord was closed or restarted: tell the UI the status is gone
                let _ = app.emit("fake_status_ended", ());
            }
        }
        session.close().await;
    });

    Ok(stop_tx)
}
