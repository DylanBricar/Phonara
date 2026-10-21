// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

use std::path::{Path, PathBuf};

/// Reveal a path in the system's default explorer.
///
/// ## Platform-specific:
///
/// - **Android / iOS:** Unsupported.
pub fn reveal_item_in_dir<P: AsRef<Path>>(path: P) -> crate::Result<()> {
    let path = canonicalize(path.as_ref())?;

    #[cfg(any(
        windows,
        target_os = "macos",
        target_os = "linux",
        target_os = "dragonfly",
        target_os = "freebsd",
        target_os = "netbsd",
        target_os = "openbsd"
    ))]
    return imp::reveal_items_in_dir(&[path]);

    #[cfg(not(any(
        windows,
        target_os = "macos",
        target_os = "linux",
        target_os = "dragonfly",
        target_os = "freebsd",
        target_os = "netbsd",
        target_os = "openbsd"
    )))]
    Err(crate::Error::UnsupportedPlatform)
}

/// Reveal multiple paths in the system's default explorer.
///
/// ## Platform-specific:
///
/// - **Android / iOS:** Unsupported.
pub fn reveal_items_in_dir<I, P>(paths: I) -> crate::Result<()>
where
    I: IntoIterator<Item = P>,
    P: AsRef<Path>,
{
    let mut canonicalized = vec![];

    for path in paths {
        let path = canonicalize(path.as_ref())?;
        canonicalized.push(path);
    }

    #[cfg(any(
        windows,
        target_os = "macos",
        target_os = "linux",
        target_os = "dragonfly",
        target_os = "freebsd",
        target_os = "netbsd",
        target_os = "openbsd"
    ))]
    return imp::reveal_items_in_dir(&canonicalized);

    #[cfg(not(any(
        windows,
        target_os = "macos",
        target_os = "linux",
        target_os = "dragonfly",
        target_os = "freebsd",
        target_os = "netbsd",
        target_os = "openbsd"
    )))]
    Err(crate::Error::UnsupportedPlatform)
}

fn canonicalize(path: &Path) -> crate::Result<PathBuf> {
    #[cfg(windows)]
    let path = crate::windows_shell_path::absolute_and_check_exists(dunce::simplified(path))?;
    #[cfg(not(windows))]
    let path = std::fs::canonicalize(path)?;
    Ok(path)
}

#[cfg(windows)]
mod imp {
    use std::{
        borrow::Cow,
        collections::HashMap,
        path::{Path, PathBuf},
    };

    use windows::Win32::UI::Shell::Common::ITEMIDLIST;
    use windows::{
        core::{w, HSTRING, PCWSTR},
        Win32::{
            Foundation::ERROR_FILE_NOT_FOUND,
            System::Com::CoInitialize,
            UI::{
                Shell::{
                    ILCreateFromPathW, ILFree, SHOpenFolderAndSelectItems, ShellExecuteExW,
                    SHELLEXECUTEINFOW,
                },
                WindowsAndMessaging::SW_SHOWNORMAL,
            },
        },
    };

    pub fn reveal_items_in_dir(paths: &[PathBuf]) -> crate::Result<()> {
        if paths.is_empty() {
            return Ok(());
        }

        let mut grouped_paths: HashMap<Cow<Path>, Vec<&Path>> = HashMap::new();
        for path in paths {
            let parent = crate::windows_shell_path::shell_parent_path(path)
                .ok_or_else(|| crate::Error::NoParent(path.to_path_buf()))?;
            grouped_paths.entry(parent).or_default().push(path);
        }

        let _ = unsafe { CoInitialize(None) };

        for (parent, to_reveals) in grouped_paths {
            let parent_item_id_list = OwnedItemIdList::new(&parent)?;
            let to_reveals_item_id_list = to_reveals
                .iter()
                .map(|to_reveal| OwnedItemIdList::new(to_reveal))
                .collect::<crate::Result<Vec<_>>>()?;
            if let Err(e) = unsafe {
                SHOpenFolderAndSelectItems(
                    parent_item_id_list.item,
                    Some(
                        &to_reveals_item_id_list
                            .iter()
                            .map(|item| item.item)
                            .collect::<Vec<_>>(),
                    ),
                    0,
                )
            } {
                // from https://github.com/electron/electron/blob/10d967028af2e72382d16b7e2025d243b9e204ae/shell/common/platform_util_win.cc#L302
                // On some systems, the above call mysteriously fails with "file not
                // found" even though the file is there.  In these cases, ShellExecute()
                // seems to work as a fallback (although it won't select the file).
                //
                // Note: we only handle the first file here if multiple of are present
                if e.code().0 == ERROR_FILE_NOT_FOUND.0 as i32 {
                    let first_path = to_reveals[0];
                    let is_dir = first_path.is_dir();
                    let mut info = SHELLEXECUTEINFOW {
                        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as _,
                        nShow: SW_SHOWNORMAL.0,
                        lpFile: PCWSTR(parent_item_id_list.hstring.as_ptr()),
                        lpClass: if is_dir { w!("folder") } else { PCWSTR::null() },
                        lpVerb: if is_dir {
                            w!("explore")
                        } else {
                            PCWSTR::null()
                        },
                        ..Default::default()
                    };

                    unsafe { ShellExecuteExW(&mut info) }?;
                }
            }
        }

        Ok(())
    }

    struct OwnedItemIdList {
        hstring: HSTRING,
        item: *const ITEMIDLIST,
    }

    impl OwnedItemIdList {
        fn new(path: &Path) -> crate::Result<Self> {
            let path_hstring = HSTRING::from(path);
            let item_id_list = unsafe { ILCreateFromPathW(&path_hstring) };
            if item_id_list.is_null() {
                Err(crate::Error::FailedToConvertPathToItemIdList(
                    path.to_owned(),
                ))
            } else {
                Ok(Self {
                    hstring: path_hstring,
                    item: item_id_list,
                })
            }
        }
    }

    impl Drop for OwnedItemIdList {
        fn drop(&mut self) {
            if !self.item.is_null() {
                unsafe { ILFree(Some(self.item)) };
            }
        }
    }
}

#[cfg(any(
    target_os = "linux",
    target_os = "dragonfly",
    target_os = "freebsd",
    target_os = "netbsd",
    target_os = "openbsd"
))]
mod imp {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;

    pub fn reveal_items_in_dir(paths: &[PathBuf]) -> crate::Result<()> {
        zbus::block_on(async {
            let connection = zbus::Connection::session().await?;

            match reveal_with_filemanager1(paths, &connection).await {
                Ok(()) => Ok(()),
                Err(error) => {
                    // Keep the existing fallback to the first item's directory.
                    if let Some(first_path) = paths.first() {
                        reveal_with_open_uri_portal(first_path, &connection).await
                    } else {
                        Err(error)
                    }
                }
            }
        })
    }

    async fn reveal_with_filemanager1(
        paths: &[PathBuf],
        connection: &zbus::Connection,
    ) -> crate::Result<()> {
        let uris: Result<Vec<_>, _> = paths
            .iter()
            .map(|path| {
                url::Url::from_file_path(path)
                    .map_err(|_| crate::Error::FailedToConvertPathToFileUrl)
            })
            .collect();
        let uris = uris?;
        let uri_strs: Vec<&str> = uris.iter().map(|uri| uri.as_str()).collect();

        #[zbus::proxy(
            interface = "org.freedesktop.FileManager1",
            default_service = "org.freedesktop.FileManager1",
            default_path = "/org/freedesktop/FileManager1"
        )]
        trait FileManager1 {
            async fn ShowItems(&self, name: Vec<&str>, arg2: &str) -> crate::Result<()>;
        }

        let proxy = FileManager1Proxy::new(connection).await?;

        proxy.ShowItems(uri_strs, "").await
    }

    async fn reveal_with_open_uri_portal(
        path: &Path,
        connection: &zbus::Connection,
    ) -> crate::Result<()> {
        let file = std::fs::File::open(path)?;

        #[zbus::proxy(
            interface = "org.freedesktop.portal.OpenURI",
            default_service = "org.freedesktop.portal.Desktop",
            default_path = "/org/freedesktop/portal/desktop"
        )]
        trait PortalDesktop {
            async fn OpenDirectory(
                &self,
                arg1: &str,
                fd: zbus::Fd<'_>,
                options: HashMap<&str, zbus::Variant<'_>>,
            ) -> crate::Result<zbus::OwnedObjectPath>;
        }

        let proxy = PortalDesktopProxy::new(connection).await?;

        proxy
            .OpenDirectory("", zbus::Fd::from(&file), HashMap::new())
            .await
            .map(|_| ())
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::sync::{Arc, Mutex};

        #[derive(Default)]
        struct Calls {
            items: Vec<Vec<String>>,
            portal_contents: Vec<String>,
        }

        struct FileManager {
            calls: Arc<Mutex<Calls>>,
            fail: bool,
        }

        #[zbus::interface(name = "org.freedesktop.FileManager1")]
        impl FileManager {
            fn show_items(&self, uris: Vec<String>, startup_id: String) -> zbus::fdo::Result<()> {
                assert!(startup_id.is_empty());
                self.calls.lock().unwrap().items.push(uris);
                if self.fail {
                    Err(zbus::fdo::Error::Failed("exercise portal fallback".into()))
                } else {
                    Ok(())
                }
            }
        }

        struct Portal(Arc<Mutex<Calls>>);

        #[zbus::interface(name = "org.freedesktop.portal.OpenURI")]
        impl Portal {
            fn open_directory(
                &self,
                parent: String,
                fd: zbus::OwnedFd,
                options: HashMap<String, zbus::OwnedVariant>,
            ) -> zbus::OwnedObjectPath {
                use std::io::Read;

                assert!(parent.is_empty());
                assert!(options.is_empty());
                let mut file = std::fs::File::from(std::os::fd::OwnedFd::from(fd));
                let mut contents = String::new();
                file.read_to_string(&mut contents).unwrap();
                self.0.lock().unwrap().portal_contents.push(contents);
                zbus::OwnedObjectPath::try_from("/org/freedesktop/portal/desktop/request/test")
                    .unwrap()
            }
        }

        fn service(calls: Arc<Mutex<Calls>>, fail: bool) -> zbus::Connection {
            zbus::block_on(async {
                zbus::connection::Builder::session()
                    .name("org.freedesktop.FileManager1")
                    .name("org.freedesktop.portal.Desktop")
                    .serve_at(
                        "/org/freedesktop/FileManager1",
                        FileManager {
                            calls: Arc::clone(&calls),
                            fail,
                        },
                    )
                    .serve_at("/org/freedesktop/portal/desktop", Portal(calls))
                    .build()
                    .await
                    .expect("private D-Bus mock services")
            })
        }

        #[test]
        #[ignore = "run inside dbus-run-session with --test-threads=1"]
        fn dbus_reveal_passes_all_file_uris() {
            let calls = Arc::new(Mutex::new(Calls::default()));
            let _service = service(Arc::clone(&calls), false);
            let paths = [
                PathBuf::from("/tmp/first item.wav"),
                PathBuf::from("/tmp/été.wav"),
            ];

            reveal_items_in_dir(&paths).expect("FileManager1 reveal");

            let calls = calls.lock().unwrap();
            assert_eq!(calls.items.len(), 1);
            assert_eq!(
                calls.items[0],
                paths
                    .iter()
                    .map(|path| url::Url::from_file_path(path).unwrap().to_string())
                    .collect::<Vec<_>>()
            );
            assert!(calls.portal_contents.is_empty());
        }

        #[test]
        #[ignore = "run inside dbus-run-session with --test-threads=1"]
        fn dbus_reveal_falls_back_to_first_item_portal() {
            let calls = Arc::new(Mutex::new(Calls::default()));
            let _service = service(Arc::clone(&calls), true);
            let first = TestFile::new("first item");
            let second = TestFile::new("second item");
            let paths = [first.0.clone(), second.0.clone()];

            reveal_items_in_dir(&paths).expect("OpenURI fallback");

            let calls = calls.lock().unwrap();
            assert_eq!(calls.items.len(), 1);
            assert_eq!(calls.portal_contents, ["first item"]);
        }

        #[test]
        #[ignore = "run inside dbus-run-session with --test-threads=1"]
        fn dbus_reveal_preserves_empty_request_error() {
            let calls = Arc::new(Mutex::new(Calls::default()));
            let _service = service(Arc::clone(&calls), true);

            assert!(reveal_items_in_dir(&[]).is_err());
            let calls = calls.lock().unwrap();
            assert_eq!(calls.items, [Vec::<String>::new()]);
            assert!(calls.portal_contents.is_empty());
        }

        struct TestFile(PathBuf);

        impl TestFile {
            fn new(contents: &str) -> Self {
                use std::io::Write;

                let unique = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos();
                let path = std::env::temp_dir().join(format!(
                    "phonara-opener-{}-{unique}.wav",
                    std::process::id()
                ));
                let mut file = std::fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&path)
                    .unwrap();
                file.write_all(contents.as_bytes()).unwrap();
                Self(path)
            }
        }

        impl Drop for TestFile {
            fn drop(&mut self) {
                let _ = std::fs::remove_file(&self.0);
            }
        }
    }
}

#[cfg(target_os = "macos")]
mod imp {
    use objc2_app_kit::NSWorkspace;
    use objc2_foundation::{NSArray, NSString, NSURL};
    use std::path::PathBuf;

    pub fn reveal_items_in_dir(paths: &[PathBuf]) -> crate::Result<()> {
        unsafe {
            let mut urls = Vec::new();

            for path in paths {
                let path = path.to_string_lossy();
                let path = NSString::from_str(&path);
                let url = NSURL::fileURLWithPath(&path);

                urls.push(url);
            }

            let urls = NSArray::from_retained_slice(&urls);

            let workspace = NSWorkspace::new();
            workspace.activateFileViewerSelectingURLs(&urls);
        }

        Ok(())
    }
}
