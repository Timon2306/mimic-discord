use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

const OP_HANDSHAKE: u32 = 0;
const OP_FRAME: u32 = 1;
const OP_CLOSE: u32 = 2;

#[cfg(windows)]
use tokio::net::windows::named_pipe::ClientOptions;

pub struct DiscordRpcSession {
    #[cfg(windows)]
    stream: tokio::net::windows::named_pipe::NamedPipeClient,
    #[cfg(unix)]
    stream: tokio::net::UnixStream,
    pub client_id: String,
}

impl DiscordRpcSession {
    /// Attempts to connect to an active local Discord IPC instance
    pub async fn connect(client_id: &str) -> Result<Self, String> {
        #[cfg(windows)]
        {
            let mut last_err = String::new();
            for i in 0..10 {
                let pipe_path = format!(r"\\.\pipe\discord-ipc-{}", i);
                match ClientOptions::new().open(&pipe_path) {
                    Ok(client) => {
                        let mut session = Self {
                            stream: client,
                            client_id: client_id.to_string(),
                        };
                        session.handshake(client_id).await?;
                        return Ok(session);
                    }
                    Err(e) => {
                        last_err = e.to_string();
                    }
                }
            }
            Err(format!(
                "Failed to connect to Windows Discord named pipe (discord-ipc-0..9): {}",
                last_err
            ))
        }

        #[cfg(unix)]
        {
            let mut search_dirs: Vec<std::path::PathBuf> = Vec::new();

            if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
                search_dirs.push(std::path::PathBuf::from(&runtime_dir));
                search_dirs.push(std::path::PathBuf::from(&runtime_dir).join("app/com.discordapp.Discord"));
                search_dirs.push(std::path::PathBuf::from(&runtime_dir).join("discord-ipc"));
            }

            search_dirs.push(std::path::PathBuf::from("/tmp"));

            let mut last_err = String::from("No Discord UNIX socket found");
            for dir in search_dirs {
                for i in 0..10 {
                    let socket_path = dir.join(format!("discord-ipc-{}", i));
                    if socket_path.exists() {
                        match tokio::net::UnixStream::connect(&socket_path).await {
                            Ok(client) => {
                                let mut session = Self {
                                    stream: client,
                                    client_id: client_id.to_string(),
                                };
                                session.handshake(client_id).await?;
                                return Ok(session);
                            }
                            Err(e) => {
                                last_err = e.to_string();
                            }
                        }
                    }
                }
            }
            Err(format!("Failed to connect to Linux Discord IPC: {}", last_err))
        }

        #[cfg(not(any(windows, unix)))]
        {
            Err("Discord IPC is only supported on Windows and Unix platforms".to_string())
        }
    }

    /// Performs the Opcode 0 handshake
    async fn handshake(&mut self, client_id: &str) -> Result<(), String> {
        let payload = json!({
            "v": 1,
            "client_id": client_id
        })
        .to_string();

        self.write_packet(OP_HANDSHAKE, &payload).await?;

        // Read DISPATCH / READY response
        let (op, response) = self.read_packet().await?;
        if op != OP_FRAME {
            return Err(format!("Expected OP_FRAME (1) after handshake, got {}", op));
        }

        let parsed: Value = serde_json::from_str(&response)
            .map_err(|e| format!("Failed to parse handshake response JSON: {}", e))?;

        if parsed.get("evt").and_then(|v| v.as_str()) != Some("READY")
            && parsed.get("cmd").and_then(|v| v.as_str()) != Some("DISPATCH")
        {
            // Even if evt is not READY, Discord sometimes accepts frames
        }

        Ok(())
    }

    /// Sets the active game via Opcode 1 SET_ACTIVITY
    pub async fn set_activity(
        &mut self,
        _game_name: &str,
        start_timestamp_ms: u64,
        pid: u32,
    ) -> Result<(), String> {
        let nonce = format!(
            "{}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            pid
        );

        let payload = json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": {
                    "timestamps": {
                        "start": start_timestamp_ms
                    },
                    "instance": true
                }
            },
            "nonce": nonce
        })
        .to_string();

        self.write_packet(OP_FRAME, &payload).await?;

        // Read response (timeout or ignore errors gracefully)
        let _ = tokio::time::timeout(std::time::Duration::from_millis(500), self.read_packet()).await;

        Ok(())
    }

    /// Clears the activity
    pub async fn clear_activity(&mut self, pid: u32) -> Result<(), String> {
        let nonce = format!(
            "clear-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );

        let payload = json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": null
            },
            "nonce": nonce
        })
        .to_string();

        let _ = self.write_packet(OP_FRAME, &payload).await;
        Ok(())
    }

    /// Writes raw opcode + payload to the IPC socket
    async fn write_packet(&mut self, opcode: u32, payload: &str) -> Result<(), String> {
        let bytes = payload.as_bytes();
        let len = bytes.len() as u32;

        let mut header = [0u8; 8];
        header[0..4].copy_from_slice(&opcode.to_le_bytes());
        header[4..8].copy_from_slice(&len.to_le_bytes());

        self.stream
            .write_all(&header)
            .await
            .map_err(|e| format!("Failed to write IPC packet header: {}", e))?;

        self.stream
            .write_all(bytes)
            .await
            .map_err(|e| format!("Failed to write IPC payload: {}", e))?;

        self.stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush IPC stream: {}", e))?;

        Ok(())
    }

    /// Reads raw opcode + payload from the IPC socket
    async fn read_packet(&mut self) -> Result<(u32, String), String> {
        let mut header = [0u8; 8];
        self.stream
            .read_exact(&mut header)
            .await
            .map_err(|e| format!("Failed to read IPC packet header: {}", e))?;

        let opcode = u32::from_le_bytes(header[0..4].try_into().unwrap());
        let length = u32::from_le_bytes(header[4..8].try_into().unwrap());

        if length > 65536 {
            return Err(format!("IPC packet length too large: {} bytes", length));
        }

        let mut body = vec![0u8; length as usize];
        self.stream
            .read_exact(&mut body)
            .await
            .map_err(|e| format!("Failed to read IPC packet payload: {}", e))?;

        let text = String::from_utf8(body)
            .map_err(|e| format!("Failed to decode IPC packet payload as UTF-8: {}", e))?;

        Ok((opcode, text))
    }

    /// Gracefully closes the session
    pub async fn close(mut self) {
        let _ = self.write_packet(OP_CLOSE, "{}").await;
    }
}
