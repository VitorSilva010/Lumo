use keyring::Entry;
use serde::Serialize;
use sysinfo::System;

#[derive(Serialize)]
pub struct DesktopState {
    pub cursor_x: i32,
    pub cursor_y: i32,
    pub active_window: String,
    pub used_ram_mb: u64,
    pub total_ram_mb: u64,
}

#[tauri::command]
fn get_desktop_state() -> DesktopState {
    let mut sys = System::new();
    sys.refresh_memory();

    let (cursor_x, cursor_y, active_window) = get_windows_context();

    DesktopState {
        cursor_x,
        cursor_y,
        active_window,
        used_ram_mb: sys.used_memory() / 1024 / 1024,
        total_ram_mb: sys.total_memory() / 1024 / 1024,
    }
}

#[cfg(windows)]
fn get_windows_context() -> (i32, i32, String) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetCursorPos, GetForegroundWindow, GetWindowTextW,
    };

    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        let _ = GetCursorPos(&mut point);

        let hwnd = GetForegroundWindow();
        let mut buffer = [0u16; 256];
        let len = GetWindowTextW(hwnd, &mut buffer);
        let title = if len > 0 {
            String::from_utf16_lossy(&buffer[..len as usize])
        } else {
            String::new()
        };

        (point.x, point.y, title)
    }
}

#[cfg(not(windows))]
fn get_windows_context() -> (i32, i32, String) {
    (0, 0, String::from("Desktop"))
}

#[tauri::command]
fn save_api_key(provider: String, api_key: String) -> Result<(), String> {
    let entry = Entry::new("lumo-assistant", &provider).map_err(|e| e.to_string())?;
    entry.set_password(&api_key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn ask_gemini(prompt: String) -> Result<String, String> {
    let entry = Entry::new("lumo-assistant", "gemini").map_err(|e| e.to_string())?;
    let api_key = entry
        .get_password()
        .map_err(|_| "Configure sua chave Gemini na aba Config.".to_string())?;

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        api_key
    );

    let body = serde_json::json!({
        "systemInstruction": {
            "parts": [{ "text": "Você é o Lumo, um assistente de desktop curioso, leve e direto. Responda em português de forma curta (máximo 3 frases)." }]
        },
        "contents": [{
            "parts": [{ "text": prompt }]
        }]
    });

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let reply = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("Não consegui processar essa resposta agora.")
        .to_string();

    Ok(reply)
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_desktop_state,
            save_api_key,
            ask_gemini
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o Lumo");
}
