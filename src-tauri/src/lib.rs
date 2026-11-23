use keyring::Entry;
use serde::Serialize;
use sysinfo::System;
use tauri::Manager;

#[derive(Serialize)]
pub struct DesktopState {
    pub cursor_x: i32,
    pub cursor_y: i32,
    pub active_window: String,
    pub used_ram_mb: u64,
    pub total_ram_mb: u64,
    pub win_center_x: i32,
    pub win_y: i32,
    pub screen_w: i32,
}

#[tauri::command]
fn get_desktop_state(window: tauri::WebviewWindow) -> DesktopState {
    let mut sys = System::new();
    sys.refresh_memory();

    let (cursor_x, cursor_y, active_window) = get_windows_context();
    let pos = window
        .outer_position()
        .unwrap_or(tauri::PhysicalPosition::new(0, 0));
    let size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(290, 140));
    let screen_w = window
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.size().width as i32)
        .unwrap_or(1920);

    DesktopState {
        cursor_x,
        cursor_y,
        active_window,
        used_ram_mb: sys.used_memory() / 1024 / 1024,
        total_ram_mb: sys.total_memory() / 1024 / 1024,
        win_center_x: pos.x + (size.width as i32) / 2,
        win_y: pos.y,
        screen_w,
    }
}

#[tauri::command]
fn set_window_mode(window: tauri::WebviewWindow, mode: String) -> Result<(), String> {
    let (w, h, align_right) = match mode.as_str() {
        "expanded" => (420.0_f64, 570.0_f64, false),
        "hidden" => (64.0_f64, 64.0_f64, true),
        _ => (290.0_f64, 140.0_f64, false),
    };

    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)))
        .map_err(|e| e.to_string())?;

    if let Ok(Some(monitor)) = window.primary_monitor() {
        let scale = monitor.scale_factor();
        let screen_w = monitor.size().width as f64 / scale;
        let x = if align_right {
            (screen_w - w - 8.0).max(0.0)
        } else {
            ((screen_w - w) / 2.0).max(0.0)
        };
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
            x, 8.0,
        )));
    }

    Ok(())
}

#[tauri::command]
fn start_drag(window: tauri::WebviewWindow) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
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
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let scale = monitor.scale_factor();
                    let screen_w = monitor.size().width as f64 / scale;
                    let x = ((screen_w - 290.0) / 2.0).max(0.0);
                    let _ = window.set_position(tauri::Position::Logical(
                        tauri::LogicalPosition::new(x, 8.0),
                    ));
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_state,
            set_window_mode,
            start_drag,
            quit_app,
            save_api_key,
            ask_gemini
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o Lumo");
}
