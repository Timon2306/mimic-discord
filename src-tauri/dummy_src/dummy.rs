#![cfg_attr(windows, windows_subsystem = "windows")]
#![allow(non_snake_case)]

#[cfg(windows)]
#[link(name = "user32")]
extern "system" {
    fn RegisterClassW(lpWndClass: *const WndClassW) -> u16;
    fn CreateWindowExW(
        dwExStyle: u32,
        lpClassName: *const u16,
        lpWindowName: *const u16,
        dwStyle: u32,
        X: i32,
        Y: i32,
        nWidth: i32,
        nHeight: i32,
        hWndParent: *mut std::ffi::c_void,
        hMenu: *mut std::ffi::c_void,
        hInstance: *mut std::ffi::c_void,
        lpParam: *mut std::ffi::c_void,
    ) -> *mut std::ffi::c_void;
    fn ShowWindow(hWnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
    fn SetForegroundWindow(hWnd: *mut std::ffi::c_void) -> i32;
    fn SetActiveWindow(hWnd: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    fn SetLayeredWindowAttributes(hWnd: *mut std::ffi::c_void, crKey: u32, bAlpha: u8, dwFlags: u32) -> i32;
    fn DefWindowProcW(
        hWnd: *mut std::ffi::c_void,
        Msg: u32,
        wParam: usize,
        lParam: isize,
    ) -> isize;
    fn GetMessageW(
        lpMsg: *mut Msg,
        hWnd: *mut std::ffi::c_void,
        wMsgFilterMin: u32,
        wMsgFilterMax: u32,
    ) -> i32;
    fn TranslateMessage(lpMsg: *const Msg) -> i32;
    fn DispatchMessageW(lpMsg: *const Msg) -> isize;
}

#[cfg(windows)]
#[repr(C)]
struct WndClassW {
    style: u32,
    lpfnWndProc: unsafe extern "system" fn(*mut std::ffi::c_void, u32, usize, isize) -> isize,
    cbClsExtra: i32,
    cbWndExtra: i32,
    hInstance: *mut std::ffi::c_void,
    hIcon: *mut std::ffi::c_void,
    hCursor: *mut std::ffi::c_void,
    hbrBackground: *mut std::ffi::c_void,
    lpszMenuName: *const u16,
    lpszClassName: *const u16,
}

#[cfg(windows)]
#[repr(C)]
struct Msg {
    hwnd: *mut std::ffi::c_void,
    message: u32,
    wParam: usize,
    lParam: isize,
    time: u32,
    pt: [i32; 2],
}

#[cfg(windows)]
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let window_title_str = if args.len() > 1 && !args[1].trim().is_empty() {
        args[1].clone()
    } else {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.file_stem().map(|s| s.to_string_lossy().to_string()))
            .unwrap_or_else(|| "Game".to_string())
    };

    unsafe {
        let class_name: Vec<u16> = "DiscordGameWindow\0".encode_utf16().collect();
        let window_title: Vec<u16> = format!("{}\0", window_title_str).encode_utf16().collect();

        let wc = WndClassW {
            style: 0,
            lpfnWndProc: DefWindowProcW,
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: std::ptr::null_mut(),
            hIcon: std::ptr::null_mut(),
            hCursor: std::ptr::null_mut(),
            hbrBackground: std::ptr::null_mut(),
            lpszMenuName: std::ptr::null(),
            lpszClassName: class_name.as_ptr(),
        };
        RegisterClassW(&wc);

        // WS_EX_TOOLWINDOW (0x00000080) - ensures the window NEVER appears on the taskbar or in Alt+Tab.
        // WS_EX_NOACTIVATE (0x08000000) - ensures the window NEVER activates or steals focus from active apps.
        // WS_POPUP (0x80000000) - window without border or caption.
        // Note: Do NOT use WS_VISIBLE in CreateWindowEx, as WS_VISIBLE causes Windows to activate the window immediately!
        let hwnd = CreateWindowExW(
            0x00000080 | 0x08000000, // WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE
            class_name.as_ptr(),
            window_title.as_ptr(),
            0x80000000, // WS_POPUP (without WS_VISIBLE)
            -10000,
            -10000,
            0,
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );

        if !hwnd.is_null() {
            // SW_SHOWNA (8): Displays the window in its current size and position without activating it.
            ShowWindow(hwnd, 8);
        }

        let mut msg = std::mem::zeroed();
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

#[cfg(not(windows))]
extern "C" {
    fn prctl(option: i32, arg2: usize, arg3: usize, arg4: usize, arg5: usize) -> i32;
}

#[cfg(not(windows))]
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 && !args[1].trim().is_empty() {
        let mut bytes = args[1].as_bytes().to_vec();
        bytes.push(0);
        unsafe {
            // PR_SET_NAME = 15: sets the process name in /proc/self/comm for Linux process scanners
            let _ = prctl(15, bytes.as_ptr() as usize, 0, 0, 0);
        }
    }
    loop {
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}
