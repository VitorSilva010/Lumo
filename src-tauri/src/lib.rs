use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
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
    screen_w: i32,
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
    pub is_game: bool,
    pub game_name: String,
    pub active_exe: String,
}

#[tauri::command]
fn get_desktop_state(window: tauri::WebviewWindow, state: State<'_, AppState>) -> DesktopState {
    let (used_ram_mb, total_ram_mb, cpu_percent, screen_w) =
        if let Ok(mut cache) = state.telemetry.lock() {
            if cache.last_refresh.elapsed() >= Duration::from_millis(1200) || cache.screen_w == 0 {
                cache.sys.refresh_memory();
                cache.sys.refresh_cpu_usage();
                cache.used_ram_mb = cache.sys.used_memory() / 1024 / 1024;
                cache.total_ram_mb = cache.sys.total_memory() / 1024 / 1024;
                cache.cpu_percent = cache.sys.global_cpu_usage().round().clamp(0.0, 100.0) as u8;
                cache.screen_w = window
                    .primary_monitor()
                    .ok()
                    .flatten()
                    .map(|m| m.size().width as i32)
                    .unwrap_or(1920);
                cache.last_refresh = Instant::now();
            }
            (cache.used_ram_mb, cache.total_ram_mb, cache.cpu_percent, cache.screen_w)
        } else {
            (0, 0, 0, 1920)
        };

    let (cursor_x, cursor_y, active_window, is_game, game_name, active_exe) = get_windows_context();
    let pos = window
        .outer_position()
        .unwrap_or(tauri::PhysicalPosition::new(0, 0));
    let size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(310, 150));

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
        is_game,
        game_name,
        active_exe,
    }
}

#[tauri::command]
fn set_window_mode(
    window: tauri::WebviewWindow,
    mode: String,
    anchor: Option<String>,
) -> Result<(), String> {
    if mode == "tray_hidden" {
        let _ = window.hide();
        return Ok(());
    }
    let _ = window.show();

    let monitor_dims = window.primary_monitor().ok().flatten().map(|m| {
        let scale = m.scale_factor();
        (m.size().width as f64 / scale, m.size().height as f64 / scale)
    });

    let (w, h, force_top_right) = match mode.as_str() {
        "expanded" => {
            let max_h = monitor_dims
                .map(|(_, sh)| (sh - 64.0).min(650.0).max(460.0))
                .unwrap_or(650.0);
            (452.0_f64, max_h, false)
        }
        "cinema" => (480.0_f64, 340.0_f64, false),
        "hidden" => (64.0_f64, 64.0_f64, true),
        _ => (310.0_f64, 150.0_f64, false),
    };

    let prev_rect = match (window.outer_position(), window.outer_size(), window.scale_factor()) {
        (Ok(p), Ok(s), Ok(sc)) if sc > 0.0 => Some((
            p.x as f64 / sc,
            p.y as f64 / sc,
            s.width as f64 / sc,
            s.height as f64 / sc,
        )),
        _ => None,
    };

    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)))
        .map_err(|e| e.to_string())?;

    if let Some((screen_w, screen_h)) = monitor_dims {
        let pos_key = if force_top_right {
            "top-right"
        } else if mode == "cinema" {
            "top-center"
        } else {
            anchor.as_deref().unwrap_or("top-center")
        };

        let (x, y) = match pos_key {
            "top-left" => (12.0, 8.0),
            "top-right" => ((screen_w - w - 12.0).max(0.0), 8.0),
            "bottom-left" => (12.0, (screen_h - h - 56.0).max(8.0)),
            "bottom-center" => (
                ((screen_w - w) / 2.0).max(0.0),
                (screen_h - h - 56.0).max(8.0),
            ),
            "bottom-right" => (
                (screen_w - w - 12.0).max(0.0),
                (screen_h - h - 56.0).max(8.0),
            ),
            "free" => {
                if let Some((px, py, pw, ph)) = prev_rect {
                    let cx = px + pw / 2.0;
                    let cy = py + ph / 2.0;
                    let is_lower = cy > screen_h / 2.0;
                    let nx = (cx - w / 2.0).clamp(8.0, (screen_w - w - 8.0).max(8.0));
                    let ny = if is_lower {
                        (py + ph - h).clamp(8.0, (screen_h - h - 52.0).max(8.0))
                    } else {
                        py.clamp(8.0, (screen_h - h - 52.0).max(8.0))
                    };
                    (nx, ny)
                } else {
                    (((screen_w - w) / 2.0).max(0.0), 8.0)
                }
            }
            _ => (((screen_w - w) / 2.0).max(0.0), 8.0),
        };

        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
            x, y,
        )));
    }

    if mode == "expanded" || mode == "cinema" {
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

#[derive(serde::Serialize)]
struct UpdateInfo {
    version: String,
    notes: String,
    mandatory: bool,
}

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => {
            let notes = update.body.unwrap_or_default();
            let upper = notes.to_uppercase();
            let mandatory = upper.contains("[OBRIGATORIA]") || upper.contains("[OBRIGATÓRIA]");
            Ok(Some(UpdateInfo {
                version: update.version,
                notes,
                mandatory,
            }))
        }
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


#[derive(serde::Serialize)]
struct MediaInfo {
    title: String,
    artist: String,
    app_name: String,
    is_playing: bool,
}

#[cfg(windows)]
fn read_windows_media_info() -> Option<MediaInfo> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .ok()?
        .get()
        .ok()?;
    let session = manager.GetCurrentSession().ok()?;
    let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
    let title = props.Title().ok().map(|s| s.to_string()).unwrap_or_default();
    if title.trim().is_empty() {
        return None;
    }
    let artist = props.Artist().ok().map(|s| s.to_string()).unwrap_or_default();
    let app_name = session
        .SourceAppUserModelId()
        .ok()
        .map(|s| s.to_string())
        .unwrap_or_default();
    let is_playing = session
        .GetPlaybackInfo()
        .and_then(|i| i.PlaybackStatus())
        .map(|s| s == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
        .unwrap_or(false);

    Some(MediaInfo {
        title,
        artist,
        app_name,
        is_playing,
    })
}

#[cfg(not(windows))]
fn read_windows_media_info() -> Option<MediaInfo> {
    None
}

#[tauri::command]
async fn get_media_info() -> Option<MediaInfo> {
    tauri::async_runtime::spawn_blocking(read_windows_media_info)
        .await
        .ok()
        .flatten()
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

struct GameDetectCache {
    pid: u32,
    checked_at: Instant,
    is_game: bool,
    game_name: String,
    exe_name: String,
}

static GAME_CACHE: std::sync::OnceLock<Mutex<GameDetectCache>> = std::sync::OnceLock::new();

#[cfg(windows)]
fn clean_game_title(title: &str, exe_path: &str, exe_name: &str) -> String {
    let t = title.trim();
    let tl = t.to_lowercase();
    if !t.is_empty() && t.len() <= 48 && !tl.contains("google chrome") && !tl.contains("microsoft edge") && !tl.contains("mozilla firefox") {
        return t.chars().take(36).collect();
    }
    let lower_path = exe_path.to_lowercase();
    for marker in ["\\steamapps\\common\\", "\\epic games\\", "\\gog games\\", "\\xboxgames\\", "\\riot games\\"] {
        if let Some(idx) = lower_path.find(marker) {
            let after = &exe_path[idx + marker.len()..];
            if let Some(folder) = after.split('\\').next() {
                if !folder.is_empty() {
                    return folder.chars().take(36).collect();
                }
            }
        }
    }
    let stem = exe_name
        .trim_end_matches(".exe")
        .replace("-win64-shipping", "")
        .replace("-win32-shipping", "")
        .replace("-gdk-shipping", "")
        .replace('_', " ")
        .replace('-', " ");
    let clean = stem.trim();
    if clean.is_empty() { "Jogo".to_string() } else { clean.chars().take(36).collect() }
}

#[cfg(windows)]
fn detect_universal_game(exe_path: &str, title: &str, is_d3d_fs: bool, is_fs: bool) -> (bool, String, String) {
    let path_obj = std::path::Path::new(exe_path);
    let exe_name = path_obj
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    if exe_name.is_empty() {
        return (false, String::new(), String::new());
    }

    let tl = title.to_lowercase();

    // 1. Nunca marcar apps do sistema, IDEs, players de vídeo ou comunicação
    const NON_GAMES: &[&str] = &[
        "lumo.exe", "explorer.exe", "dwm.exe", "shellexperiencehost.exe", "searchhost.exe",
        "startmenuexperiencehost.exe", "applicationframehost.exe", "lockapp.exe", "taskmgr.exe",
        "cmd.exe", "powershell.exe", "pwsh.exe", "windowsterminal.exe", "code.exe", "devenv.exe",
        "discord.exe", "spotify.exe", "obs64.exe", "obs32.exe", "vlc.exe", "mpv.exe",
        "potplayermini64.exe", "whatsapp.exe", "telegram.exe", "slack.exe", "teams.exe",
        "ms-teams.exe", "zoom.exe", "winword.exe", "excel.exe", "powerpnt.exe", "acrobat.exe",
        "snippingtool.exe", "screenclippinghost.exe", "notepad.exe", "notepad++.exe",
        "steam.exe", "steamwebhelper.exe", "epicgameslauncher.exe", "battle.net.exe",
        "riotclientservices.exe", "riotclientux.exe", "eadesktop.exe", "ubisoftconnect.exe",
        "upc.exe", "galaxyclient.exe", "curseforge.exe", "modrinth app.exe", "prismlauncher.exe",
        "xboxpcapp.exe", "playnite.desktopapp.exe", "nvidia app.exe", "radeonsoftware.exe"
    ];
    if NON_GAMES.contains(&exe_name.as_str()) {
        return (false, String::new(), exe_name);
    }

    // 2. Navegadores: apenas Cloud Gaming confirmado (nunca YouTube/Netflix/Twitch)
    const BROWSERS: &[&str] = &[
        "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe", "opera_gx.exe", "vivaldi.exe", "arc.exe"
    ];
    if BROWSERS.contains(&exe_name.as_str()) {
        for (kw, label) in [
            ("boosteroid", "Boosteroid Cloud"),
            ("geforce now", "GeForce NOW"),
            ("xbox cloud gaming", "Xbox Cloud Gaming"),
            ("xbox.com/play", "Xbox Cloud Gaming"),
            ("amazon luna", "Amazon Luna"),
        ] {
            if tl.contains(kw) {
                return (true, label.to_string(), exe_name);
            }
        }
        return (false, String::new(), exe_name);
    }

    // 3. Executáveis diretos de jogos, engines, Minecraft/Java e emuladores
    let is_direct_exe = exe_name.ends_with("-win64-shipping.exe")
        || exe_name.ends_with("-win32-shipping.exe")
        || exe_name.ends_with("-gdk-shipping.exe")
        || matches!(
            exe_name.as_str(),
            "robloxplayerbeta.exe" | "minecraft.windows.exe" | "boosteroid.exe" | "geforcenow.exe"
            | "retroarch.exe" | "dolphin.exe" | "pcsx2.exe" | "pcsx2-qt.exe" | "rpcs3.exe"
            | "yuzu.exe" | "ryujinx.exe" | "cemu.exe" | "ppssppwindows64.exe"
            | "hd-player.exe" | "dnplayer.exe"
        )
        || ((exe_name == "javaw.exe" || exe_name == "java.exe")
            && (tl.contains("minecraft") || tl.contains("neoforge") || tl.contains("forge") || tl.contains("fabric") || tl.contains("lunar") || tl.contains("badlion")));

    if is_direct_exe {
        return (true, clean_game_title(title, exe_path, &exe_name), exe_name);
    }

    // 4. Pastas padrão de bibliotecas de jogos
    let pl = exe_path.to_lowercase();
    const GAME_DIRS: &[&str] = &[
        "\\steamapps\\common\\", "\\epic games\\", "\\riot games\\", "\\xboxgames\\",
        "\\ubisoft\\ubisoft game launcher\\games\\", "\\ea games\\", "\\gog games\\",
        "\\gog galaxy\\games\\", "\\battle.net\\", "\\roblox\\versions\\",
        "\\.minecraft\\", "\\curseforge\\minecraft\\", "\\prismlauncher\\",
        "\\modrinthapp\\", "\\rockstar games\\", "\\hoyoverse\\", "\\genshin impact\\",
        "\\wuthering waves\\", "\\itch\\apps\\"
    ];
    if GAME_DIRS.iter().any(|d| pl.contains(d)) {
        return (true, clean_game_title(title, exe_path, &exe_name), exe_name);
    }

    // 5. Assinaturas de Engine/SDK (Unity, Steamworks, EOS, Unreal, FMOD, Bink, Anti-Cheat, DLSS/FSR)
    const ENGINE_MARKERS: &[&str] = &[
        "UnityPlayer.dll", "GameAssembly.dll", "steam_api64.dll", "steam_api.dll",
        "EOSSDK-Win64-Shipping.dll", "bink2w64.dll", "fmod.dll", "fmodstudio.dll",
        "nvngx_dlss.dll", "amd_fidelityfx_dx12.dll", "PhysX3_x64.dll", "PhysX_64.dll",
        "EasyAntiCheat_EOS.dll", "tier0.dll", "CrySystem.dll"
    ];
    if let Some(dir) = path_obj.parent() {
        let mut check_dirs = vec![dir];
        if let Some(p1) = dir.parent() {
            check_dirs.push(p1);
            if let Some(p2) = p1.parent() {
                check_dirs.push(p2);
            }
        }
        for d in check_dirs {
            if ENGINE_MARKERS.iter().any(|m| d.join(m).exists()) {
                return (true, clean_game_title(title, exe_path, &exe_name), exe_name);
            }
        }
        // Jogos Godot (.pck ao lado do .exe)
        if let Some(stem) = path_obj.file_stem().and_then(|s| s.to_str()) {
            if dir.join(format!("{}.pck", stem)).exists() {
                return (true, clean_game_title(title, exe_path, &exe_name), exe_name);
            }
        }
    }

    // 6. Direct3D Fullscreen confirmado pelo próprio Windows (ou SDL2 em tela cheia)
    if is_d3d_fs {
        return (true, clean_game_title(title, exe_path, &exe_name), exe_name);
    }
    if is_fs {
        if let Some(dir) = path_obj.parent() {
            if dir.join("SDL2.dll").exists() || dir.join("SDL3.dll").exists() {
                return (true, clean_game_title(title, exe_path, &exe_name), exe_name);
            }
        }
    }

    (false, String::new(), exe_name)
}

#[cfg(windows)]
fn get_windows_context() -> (i32, i32, String, bool, String, String) {
    use windows::core::PWSTR;
    use windows::Win32::Foundation::{CloseHandle, POINT, RECT};
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::Shell::{SHQueryUserNotificationState, QUNS_RUNNING_D3D_FULL_SCREEN};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId,
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

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let cache_mutex = GAME_CACHE.get_or_init(|| {
            Mutex::new(GameDetectCache {
                pid: 0,
                checked_at: Instant::now() - Duration::from_secs(10),
                is_game: false,
                game_name: String::new(),
                exe_name: String::new(),
            })
        });

        let mut is_game = false;
        let mut game_name = String::new();
        let mut exe_name = String::new();

        if let Ok(mut cache) = cache_mutex.lock() {
            if pid != 0 && (cache.pid != pid || cache.checked_at.elapsed() >= Duration::from_millis(1200)) {
                let mut exe_path = String::new();
                if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                    let mut pbuf = [0u16; 1024];
                    let mut plen = pbuf.len() as u32;
                    if QueryFullProcessImageNameW(
                        handle,
                        PROCESS_NAME_WIN32,
                        PWSTR(pbuf.as_mut_ptr()),
                        &mut plen,
                    )
                    .is_ok()
                        && plen > 0
                    {
                        exe_path = String::from_utf16_lossy(&pbuf[..plen as usize]);
                    }
                    let _ = CloseHandle(handle);
                }

                let is_d3d_fs = SHQueryUserNotificationState()
                    .map(|s| s == QUNS_RUNNING_D3D_FULL_SCREEN)
                    .unwrap_or(false);

                let mut is_fs = false;
                let mut wr = RECT::default();
                if GetWindowRect(hwnd, &mut wr).is_ok() {
                    let hmon = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
                    let mut mi = MONITORINFO {
                        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                        ..Default::default()
                    };
                    if GetMonitorInfoW(hmon, &mut mi).as_bool() {
                        let mr = mi.rcMonitor;
                        is_fs = wr.left <= mr.left
                            && wr.top <= mr.top
                            && wr.right >= mr.right
                            && wr.bottom >= mr.bottom;
                    }
                }

                let (g, gn, en) = detect_universal_game(&exe_path, &title, is_d3d_fs, is_fs);
                cache.pid = pid;
                cache.checked_at = Instant::now();
                cache.is_game = g;
                cache.game_name = gn;
                cache.exe_name = en;
            }
            is_game = cache.is_game;
            game_name = cache.game_name.clone();
            exe_name = cache.exe_name.clone();
        }

        (point.x, point.y, title, is_game, game_name, exe_name)
    }
}

#[cfg(not(windows))]
fn get_windows_context() -> (i32, i32, String, bool, String, String) {
    (0, 0, String::from("Desktop"), false, String::new(), String::new())
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


#[derive(Serialize, Clone)]
pub struct ActiveDownload {
    pub name: String,
    pub bytes: u64,
    pub speed_bps: u64,
    pub ext: String,
}

#[derive(Serialize)]
pub struct DownloadStatus {
    pub active: Vec<ActiveDownload>,
    pub completed: Vec<String>,
}

struct TrackedDownload {
    bytes: u64,
    last_growth: Instant,
    last_seen: Instant,
    speed_bps: u64,
    clean_name: String,
}

static DOWNLOAD_TRACKER: std::sync::OnceLock<Mutex<std::collections::HashMap<String, TrackedDownload>>> =
    std::sync::OnceLock::new();

#[cfg(windows)]
fn get_downloads_dir() -> PathBuf {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders") {
        if let Ok(raw) = key.get_value::<String, _>("{374DE290-123F-4565-9164-39C4925E467B}") {
            let expanded = if raw.contains("%USERPROFILE%") {
                let up = std::env::var("USERPROFILE").unwrap_or_default();
                raw.replace("%USERPROFILE%", &up)
            } else {
                raw
            };
            let p = PathBuf::from(expanded.trim());
            if p.is_dir() {
                return p;
            }
        }
    }
    if let Ok(up) = std::env::var("USERPROFILE") {
        let p = PathBuf::from(up).join("Downloads");
        if p.is_dir() {
            return p;
        }
    }
    PathBuf::from(".")
}

#[cfg(not(windows))]
fn get_downloads_dir() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home).join("Downloads");
        if p.is_dir() {
            return p;
        }
    }
    PathBuf::from(".")
}

fn match_temp_download_ext(lower_name: &str) -> Option<&'static str> {
    const EXTS: &[&str] = &[".crdownload", ".part", ".opdownload", ".download", ".!qb", ".!ut"];
    EXTS.iter().copied().find(|e| lower_name.ends_with(e))
}

fn clean_download_name(file_name: &str, ext: &str) -> String {
    let cut = file_name.len().saturating_sub(ext.len());
    let base = if file_name.is_char_boundary(cut) {
        &file_name[..cut]
    } else {
        file_name
    };
    let trimmed = base.trim();
    if trimmed.is_empty() || trimmed.to_lowercase().starts_with("unconfirmed ") {
        "Download em andamento".to_string()
    } else {
        trimmed.chars().take(72).collect()
    }
}

#[tauri::command]
fn get_active_downloads() -> DownloadStatus {
    let dir = get_downloads_dir();
    let now = Instant::now();
    let tracker_mutex = DOWNLOAD_TRACKER.get_or_init(|| Mutex::new(std::collections::HashMap::new()));

    let mut active: Vec<ActiveDownload> = Vec::new();
    let mut completed: Vec<String> = Vec::new();
    let mut seen_keys: Vec<String> = Vec::new();
    let mut recent_final_file: Option<(Duration, String)> = None;

    if let Ok(entries) = fs::read_dir(&dir) {
        if let Ok(mut map) = tracker_mutex.lock() {
            for entry in entries.flatten() {
                let path = entry.path();
                let Ok(meta) = entry.metadata() else { continue };
                if !meta.is_file() {
                    continue;
                }
                let Some(fname) = path.file_name().and_then(|s| s.to_str()) else { continue };
                let lower = fname.to_lowercase();
                let age = meta
                    .modified()
                    .ok()
                    .and_then(|m| m.elapsed().ok())
                    .unwrap_or(Duration::ZERO);

                if let Some(ext) = match_temp_download_ext(&lower) {
                    // Ignora arquivos temporários abandonados há mais de 90 segundos
                    if age > Duration::from_secs(90) {
                        continue;
                    }
                    let key = path.to_string_lossy().to_string();
                    let bytes = meta.len();
                    let clean_name = clean_download_name(fname, ext);
                    seen_keys.push(key.clone());

                    let speed_bps = if let Some(prev) = map.get_mut(&key) {
                        prev.last_seen = now;
                        prev.clean_name = clean_name.clone();
                        if bytes > prev.bytes {
                            let dt_ms = prev.last_growth.elapsed().as_millis().max(150) as u64;
                            let inst = (bytes - prev.bytes).saturating_mul(1000) / dt_ms;
                            prev.speed_bps = if prev.speed_bps == 0 {
                                inst
                            } else {
                                (prev.speed_bps.saturating_mul(2).saturating_add(inst)) / 3
                            };
                            prev.bytes = bytes;
                            prev.last_growth = now;
                        } else if prev.last_growth.elapsed() > Duration::from_secs(4) {
                            prev.speed_bps = 0;
                        }
                        prev.speed_bps
                    } else {
                        map.insert(
                            key,
                            TrackedDownload {
                                bytes,
                                last_growth: now,
                                last_seen: now,
                                speed_bps: 0,
                                clean_name: clean_name.clone(),
                            },
                        );
                        0
                    };

                    active.push(ActiveDownload {
                        name: clean_name,
                        bytes,
                        speed_bps,
                        ext: ext.to_string(),
                    });
                } else if age <= Duration::from_secs(12) && meta.len() > 0 && !lower.ends_with(".tmp") && !lower.ends_with(".ini") {
                    match &recent_final_file {
                        Some((best_age, _)) if age >= *best_age => {}
                        _ => recent_final_file = Some((age, fname.to_string())),
                    }
                }
            }

            // Detecta downloads que terminaram desde a última checagem
            let vanished: Vec<String> = map
                .keys()
                .filter(|k| !seen_keys.contains(k))
                .cloned()
                .collect();

            for k in vanished {
                if let Some(prev) = map.remove(&k) {
                    if prev.last_seen.elapsed() <= Duration::from_secs(20) {
                        if prev.clean_name != "Download em andamento" && dir.join(&prev.clean_name).is_file() {
                            completed.push(prev.clean_name);
                        } else if let Some((_, ref newest_name)) = recent_final_file {
                            completed.push(newest_name.clone());
                        }
                    }
                }
            }
        }
    }

    active.sort_by(|a, b| b.speed_bps.cmp(&a.speed_bps).then(b.bytes.cmp(&a.bytes)));
    DownloadStatus { active, completed }
}

#[tauri::command]
fn open_downloads_folder(file_name: Option<String>) -> Result<(), String> {
    let dir = get_downloads_dir();
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        if let Some(fname) = file_name {
            let clean = fname.trim();
            if !clean.is_empty() && !clean.contains('\\') && !clean.contains('/') && !clean.contains("..") {
                let target = dir.join(clean);
                if target.exists() {
                    std::process::Command::new("explorer")
                        .raw_arg(format!("/select,\"{}\"", target.display()))
                        .spawn()
                        .map_err(|e| e.to_string())?;
                    return Ok(());
                }
            }
        }
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        let _ = (dir, file_name);
    }
    Ok(())
}

pub fn run() {
    let lock = match TcpListener::bind("127.0.0.1:48291") {
        Ok(listener) => Some(listener),
        Err(_) => std::process::exit(0),
    };

    let mut sys = System::new_all();
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
                screen_w: 0,
            }),
            _instance_lock: lock,
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                let _ = window.emit("window-blur", ());
            }
        })
        .setup(|app| {
            let show_i = MenuItem::with_id(app, "show", "Abrir Lumo", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("Lumo")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => { let _ = app.emit("tray-toggle", ()); }
                    "quit" => { app.exit(0); }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = tray.app_handle().emit("tray-toggle", ());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _ = tray_builder.build(app)?;
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
            get_active_downloads,
            open_downloads_folder,
            get_desktop_state,
            set_window_mode,
            start_drag,
            quit_app,
            check_update,
            install_update,
            open_external_url,
            media_control,
            get_media_info,
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
