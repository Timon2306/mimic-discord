//! Tiny runtime localization layer for backend-generated log messages.
//!
//! The UI language is pushed from the frontend with the `set_language` command;
//! Rust code then picks the matching variant of every user-visible message.

use std::sync::atomic::{AtomicU8, Ordering};

const EN: u8 = 0;
const RU: u8 = 1;

static LANGUAGE: AtomicU8 = AtomicU8::new(EN);

/// Updates the language used for log messages. Unknown values fall back to English.
pub fn set_language(code: &str) {
    let normalized = code.trim().to_ascii_lowercase();
    let value = if normalized.starts_with("ru") { RU } else { EN };
    LANGUAGE.store(value, Ordering::SeqCst);
}

pub fn is_russian() -> bool {
    LANGUAGE.load(Ordering::SeqCst) == RU
}

/// Picks the Russian or English variant of a message depending on the active language.
pub fn pick<'a>(russian: &'a str, english: &'a str) -> &'a str {
    if is_russian() {
        russian
    } else {
        english
    }
}
