pub mod commands;
pub mod discord;
pub mod history;
pub mod i18n;
pub mod rpc;
pub mod spoofer;
pub mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::fetch_games,
            commands::get_games_list,
            commands::start_spoofer,
            commands::pause_spoofer,
            commands::resume_spoofer,
            commands::stop_spoofer,
            commands::check_discord_status,
            commands::get_spoofer_state,
            commands::clear_history,
            commands::export_history,
            commands::import_history,
            commands::open_external_url,
            commands::set_language,
        ])
        .run(tauri::generate_context!())
        .expect("error while running mimic desktop application");
}
