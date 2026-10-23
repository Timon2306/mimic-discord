use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=dummy_src/dummy.rs");

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR not set"));
    let is_windows = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default() == "windows";
    let dummy_name = if is_windows { "dummy.exe" } else { "dummy" };
    let dummy_out = out_dir.join(dummy_name);

    // Compile minimal dummy helper binary using host/target rustc
    let rustc = env::var("RUSTC").unwrap_or_else(|_| "rustc".to_string());
    let mut cmd = Command::new(rustc);
    cmd.arg("dummy_src/dummy.rs")
        .arg("-O")
        .arg("-C")
        .arg("panic=abort")
        .arg("-o")
        .arg(&dummy_out);

    if let Ok(target) = env::var("TARGET") {
        cmd.arg("--target").arg(target);
    }

    let status = cmd.status().expect("Failed to execute rustc to compile dummy.rs");
    if !status.success() {
        panic!("Failed to compile dummy binary helper: status {:?}", status);
    }

    tauri_build::build();
}
