use keyring::Entry;
use serde::Serialize;
use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::System;
use tauri::{Emitter, Manager, State};
use tauri_plugin_updater::UpdaterExt;

struct TelemetryCache {
    sys: System,
    last_refresh: Instant,
    used_ram_mb: u64,
    total_ram_mb: u64,
    cpu_percent: u8,
}

struct AppState {
    telemetry: Mutex<TelemetryCache>,
    _instance_lock: Option<TcpListener>,
}

#[derive(Serialize)]
pub struct DesktopState {
    pub cursor_x: i32,
    pub cursor_y: i32,
    pub active_window: String,
    pub used_ram_mb: u64,
    pub total_ram_mb: u64,
    pub cpu_percent: u8,
    pub win_center_x: i32,
    pub win_y: i32,
    pub screen_w: i32,
}

#[tauri::command]
fn get_desktop_state(window: tauri::WebviewWindow, state: State<'_, AppState>) -> DesktopState {
    let (used_ram_mb, total_ram_mb, cpu_percent) = if let Ok(mut cache) = state.telemetry.lock() {
        if cache.last_refresh.elapsed() >= Duration::from_millis(1200) {
            cache.sys.refresh_memory();
            cache.sys.refresh_cpu_usage();
            cache.used_ram_mb = cache.sys.used_memory() / 1024 / 1024;
            cache.total_ram_mb = cache.sys.total_memory() / 1024 / 1024;
            cache.cpu_percent = cache.sys.global_cpu_usage().round().clamp(0.0, 100.0) as u8;
            cache.last_refresh = Instant::now();
        }
        (cache.used_ram_mb, cache.total_ram_mb, cache.cpu_percent)
    } else {
        (0, 0, 0)
    };

    let (cursor_x, cursor_y, active_window) = get_windows_context();
    let pos = window
        .outer_position()
        .unwrap_or(tauri::PhysicalPosition::new(0, 0));
    let size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(310, 150));
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
        used_ram_mb,
        total_ram_mb,
        cpu_percent,
        win_center_x: pos.x + (size.width as i32) / 2,
        win_y: pos.y,
        screen_w,
    }
}

#[tauri::command]
fn set_window_mode(window: tauri::WebviewWindow, mode: String) -> Result<(), String> {
    let (w, h, align_right) = match mode.as_str() {
        "expanded" => (446.0_f64, 624.0_f64, false),
        "hidden" => (64.0_f64, 64.0_f64, true),
        _ => (310.0_f64, 150.0_f64, false),
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

    if mode == "expanded" {
        let _ = window.set_focus();
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

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(update.version)),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("URL inválida.".to_string());
    }
    open_url_os(&url)
}

#[cfg(windows)]
fn open_url_os(url: &str) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", url])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(windows))]
fn open_url_os(_url: &str) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn media_control(action: String) {
    send_media_key(&action);
}

#[cfg(windows)]
fn send_media_key(action: &str) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        keybd_event, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VK_MEDIA_NEXT_TRACK,
        VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK, VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
    };

    let vk = match action {
        "play_pause" => VK_MEDIA_PLAY_PAUSE.0 as u8,
        "next" => VK_MEDIA_NEXT_TRACK.0 as u8,
        "prev" => VK_MEDIA_PREV_TRACK.0 as u8,
        "vol_up" => VK_VOLUME_UP.0 as u8,
        "vol_down" => VK_VOLUME_DOWN.0 as u8,
        "mute" => VK_VOLUME_MUTE.0 as u8,
        _ => return,
    };

    unsafe {
        keybd_event(vk, 0, KEYBD_EVENT_FLAGS(0), 0);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
    }
}

#[cfg(not(windows))]
fn send_media_key(_action: &str) {}

#[tauri::command]
fn get_clipboard_text() -> Option<String> {
    let mut cb = arboard::Clipboard::new().ok()?;
    let text = cb.get_text().ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed.len() > 2000 {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[tauri::command]
fn set_clipboard_text(text: String) -> Result<(), String> {
    let mut cb = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    cb.set_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_bytes(filename: String, bytes: Vec<u8>) -> Result<String, String> {
    let safe_name: String = filename
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect();

    let base = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let mut dir = PathBuf::from(base);
    dir.push("Desktop");
    dir.push("Lumo_Arquivos");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut target = dir;
    target.push(if safe_name.is_empty() {
        "arquivo_lumo.bin".to_string()
    } else {
        safe_name
    });

    fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}


#[tauri::command]
fn set_keep_awake(enabled: bool) -> Result<bool, String> {
    apply_keep_awake(enabled);
    Ok(enabled)
}

#[cfg(windows)]
fn apply_keep_awake(enabled: bool) {
    use windows::Win32::System::Power::{
        SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
    };
    unsafe {
        if enabled {
            let _ = SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED);
        } else {
            let _ = SetThreadExecutionState(ES_CONTINUOUS);
        }
    }
}

#[cfg(not(windows))]
fn apply_keep_awake(_enabled: bool) {}

#[tauri::command]
fn schedule_shutdown(minutes: u32) -> Result<String, String> {
    run_shutdown_cmd(minutes)
}

#[tauri::command]
fn cancel_shutdown() -> Result<(), String> {
    run_cancel_shutdown_cmd()
}

#[cfg(windows)]
fn run_shutdown_cmd(minutes: u32) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let secs = minutes.max(1).saturating_mul(60);
    let _ = Command::new("shutdown")
        .args(["/a"])
        .creation_flags(0x08000000)
        .output();

    Command::new("shutdown")
        .args(["/s", "/t", &secs.to_string()])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(format!("Desligamento agendado para {} min.", minutes.max(1)))
}

#[cfg(windows)]
fn run_cancel_shutdown_cmd() -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    Command::new("shutdown")
        .args(["/a"])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(windows))]
fn run_shutdown_cmd(minutes: u32) -> Result<String, String> {
    Ok(format!("Simulado: {} min", minutes))
}

#[cfg(not(windows))]
fn run_cancel_shutdown_cmd() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn get_autostart() -> bool {
    check_autostart_win()
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<bool, String> {
    toggle_autostart_win(enabled)
}

#[cfg(windows)]
fn check_autostart_win() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run") {
        return key.get_value::<String, _>("Lumo").is_ok();
    }
    false
}

#[cfg(windows)]
fn toggle_autostart_win(enabled: bool) -> Result<bool, String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
        .map_err(|e| e.to_string())?;

    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let val = format!("\"{}\"", exe.display());
        key.set_value("Lumo", &val).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        let _ = key.delete_value("Lumo");
        Ok(false)
    }
}

#[cfg(not(windows))]
fn check_autostart_win() -> bool {
    false
}

#[cfg(not(windows))]
fn toggle_autostart_win(enabled: bool) -> Result<bool, String> {
    Ok(enabled)
}

#[cfg(windows)]
fn watch_hotkey(app: tauri::AppHandle) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_MENU, VK_SPACE};
    let mut was_down = false;
    loop {
        let is_down = unsafe {
            let alt = (GetAsyncKeyState(VK_MENU.0 as i32) as u16 & 0x8000) != 0;
            let space = (GetAsyncKeyState(VK_SPACE.0 as i32) as u16 & 0x8000) != 0;
            alt && space
        };
        if is_down && !was_down {
            let _ = app.emit("toggle-lumo", ());
        }
        was_down = is_down;
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

#[cfg(not(windows))]
fn watch_hotkey(_app: tauri::AppHandle) {}

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


#[cfg(windows)]
fn get_machine_id() -> String {
    use winreg::enums::*;
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey(r"SOFTWARE\Microsoft\Cryptography") {
        if let Ok(guid) = key.get_value::<String, _>("MachineGuid") {
            if !guid.trim().is_empty() {
                return guid.trim().to_string();
            }
        }
    }
    std::env::var("COMPUTERNAME").unwrap_or_else(|_| "win-device".to_string())
}

#[cfg(not(windows))]
fn get_machine_id() -> String {
    "dev-machine".to_string()
}

#[tauri::command]
async fn activate_license(key: String) -> Result<String, String> {
    let clean_key = key.trim().to_uppercase();
    if clean_key.is_empty() {
        return Err("Digite sua chave de licença.".to_string());
    }
    let machine_id = get_machine_id();
    let client = reqwest::Client::new();
    let res = client
        .post("https://lumo-ai.sivavieiravitor.workers.dev/activate")
        .header("X-Lumo-Client", "lumo-desktop-v1")
        .json(&serde_json::json!({
            "key": clean_key,
            "machineId": machine_id
        }))
        .send()
        .await
        .map_err(|e| format!("Sem conexão para validar a chave: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|_| "Resposta inválida do servidor de licenças.".to_string())?;

    if json["valid"].as_bool() == Some(true) {
        Ok(json["message"]
            .as_str()
            .unwrap_or("Lumo Pro ativado com sucesso!")
            .to_string())
    } else {
        Err(json["error"]
            .as_str()
            .unwrap_or("Chave inválida ou limite de PCs atingido.")
            .to_string())
    }
}

#[tauri::command]
fn save_api_key(provider: String, api_key: String) -> Result<(), String> {
    let entry = Entry::new("lumo-assistant", &provider).map_err(|e| e.to_string())?;
    entry.set_password(&api_key).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_api_key(provider: String) -> Result<(), String> {
    let entry = Entry::new("lumo-assistant", &provider).map_err(|e| e.to_string())?;
    let _ = entry.delete_credential();
    Ok(())
}

#[tauri::command]
async fn ask_gemini(prompt: String, user_name: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();

    let personal_key = Entry::new("lumo-assistant", "gemini")
        .ok()
        .and_then(|entry| entry.get_password().ok())
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty());

    if let Some(api_key) = personal_key {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={}",
            api_key
        );
        let name_ctx = match &user_name {
            Some(n) if !n.trim().is_empty() => format!(" O usuário se chama {}. Use o nome dele apenas quando soar natural.", n.trim()),
            _ => String::new(),
        };
        let body = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": format!("Você é o Lumo, um assistente de desktop curioso, simpático e leve.{} Responda em português de forma clara e curta (máximo 3 frases).", name_ctx) }]
            },
            "contents": [{ "parts": [{ "text": prompt }] }]
        });

        let res = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Erro de conexão: {}", e))?;

        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(reply) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
            return Ok(reply.to_string());
        }
        return Err("Chave API própria inválida ou sem cota no Google AI Studio.".to_string());
    }

    let res = client
        .post("https://lumo-ai.sivavieiravitor.workers.dev/")
        .header("X-Lumo-Client", "lumo-desktop-v1")
        .json(&serde_json::json!({
            "prompt": prompt,
            "userName": user_name
        }))
        .send()
        .await
        .map_err(|e| format!("Sem conexão com o servidor do Lumo: {}", e))?;

    let status = res.status();
    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|_| format!("Resposta inválida do servidor (HTTP {}).", status.as_u16()))?;

    if let Some(reply) = json["reply"].as_str() {
        return Ok(reply.to_string());
    }
    if let Some(err) = json["error"].as_str() {
        return Err(err.to_string());
    }

    Err("Sem resposta da IA no momento. Tente novamente.".to_string())
}

pub fn run() {
    let lock = match TcpListener::bind("127.0.0.1:48291") {
        Ok(listener) => Some(listener),
        Err(_) => std::process::exit(0),
    };

    let mut sys = System::new();
    sys.refresh_memory();
    sys.refresh_cpu_usage();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            telemetry: Mutex::new(TelemetryCache {
                sys,
                last_refresh: Instant::now() - Duration::from_secs(5),
                used_ram_mb: 0,
                total_ram_mb: 0,
                cpu_percent: 0,
            }),
            _instance_lock: lock,
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                let _ = window.emit("window-blur", ());
            }
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let scale = monitor.scale_factor();
                    let screen_w = monitor.size().width as f64 / scale;
                    let x = ((screen_w - 310.0) / 2.0).max(0.0);
                    let _ = window.set_position(tauri::Position::Logical(
                        tauri::LogicalPosition::new(x, 8.0),
                    ));
                }
            }
            let handle = app.handle().clone();
            std::thread::spawn(move || watch_hotkey(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_state,
            set_window_mode,
            start_drag,
            quit_app,
            check_update,
            install_update,
            open_external_url,
            media_control,
            get_clipboard_text,
            set_clipboard_text,
            save_file_bytes,
            schedule_shutdown,
            cancel_shutdown,
            set_keep_awake,
            get_autostart,
            set_autostart,
            save_api_key,
            delete_api_key,
            activate_license,
            ask_gemini
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| eprintln!("Erro ao iniciar o Lumo: {error}"));
}
