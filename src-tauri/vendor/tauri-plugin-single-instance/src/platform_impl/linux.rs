// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

#[cfg(feature = "semver")]
use crate::semver_compat::semver_compat_string;

use crate::SingleInstanceCallback;
use tauri::{
    plugin::{self, TauriPlugin},
    AppHandle, Manager, RunEvent, Runtime,
};
use zbus::{interface, names::WellKnownName, Connection};

struct ConnectionHandle(Connection);

struct SingleInstanceDBus<R: Runtime> {
    callback: Box<SingleInstanceCallback<R>>,
    app_handle: AppHandle<R>,
}

#[interface(name = "org.SingleInstance.DBus")]
impl<R: Runtime> SingleInstanceDBus<R> {
    fn execute_callback(&mut self, argv: Vec<String>, cwd: String) {
        (self.callback)(&self.app_handle, argv, cwd);
    }
}

struct DBusName(String);

async fn serve_instance<I: zbus::object_server::Interface>(
    dbus_name: &str,
    dbus_path: &str,
    interface: I,
) -> zbus::Result<Connection> {
    zbus::connection::Builder::session()
        .name(dbus_name)
        .replace_existing_names(false)
        .allow_name_replacements(false)
        .serve_at(dbus_path, interface)
        .build()
        .await
}

async fn forward_callback(
    connection: &Connection,
    dbus_name: &str,
    dbus_path: &str,
    argv: Vec<String>,
    cwd: &str,
) -> zbus::Result<()> {
    connection
        .call_method(
            Some(dbus_name),
            dbus_path,
            Some("org.SingleInstance.DBus"),
            "ExecuteCallback",
            &(argv, cwd),
        )
        .await
        .map(|_| ())
}

pub fn init<R: Runtime>(
    callback: Box<SingleInstanceCallback<R>>,
    dbus_id: Option<String>,
) -> TauriPlugin<R> {
    plugin::Builder::new("single-instance")
        .setup(move |app, _api| {
            let mut dbus_name = dbus_id.unwrap_or_else(|| app.config().identifier.clone());
            dbus_name.push_str(".SingleInstance");

            #[cfg(feature = "semver")]
            {
                dbus_name.push('_');
                dbus_name.push_str(semver_compat_string(&app.package_info().version).as_str());
            }

            let mut dbus_path = dbus_name.replace('.', "/").replace('-', "_");
            if !dbus_path.starts_with('/') {
                dbus_path = format!("/{dbus_path}");
            }

            let single_instance_dbus = SingleInstanceDBus {
                callback,
                app_handle: app.clone(),
            };

            match zbus::block_on(serve_instance(&dbus_name, &dbus_path, single_instance_dbus)) {
                Ok(connection) => {
                    app.manage(ConnectionHandle(connection));
                }
                Err(zbus::Error::NameTaken) => {
                    zbus::block_on(async {
                        if let Ok(connection) = Connection::session().await {
                            let _ = forward_callback(
                                &connection,
                                &dbus_name,
                                &dbus_path,
                                std::env::args().collect(),
                                std::env::current_dir()
                                    .unwrap_or_default()
                                    .to_str()
                                    .unwrap_or_default(),
                            )
                            .await;
                        }
                    });
                    app.cleanup_before_exit();
                    std::process::exit(0);
                }
                _ => {}
            }

            app.manage(DBusName(dbus_name));

            Ok(())
        })
        .on_event(move |app, event| {
            if let RunEvent::Exit = event {
                destroy(app);
            }
        })
        .build()
}

pub fn destroy<R: Runtime, M: Manager<R>>(manager: &M) {
    if let Some(connection) = manager.try_state::<ConnectionHandle>() {
        if let Some(dbus_name) = manager
            .try_state::<DBusName>()
            .and_then(|name| WellKnownName::try_from(name.0.clone()).ok())
        {
            let _ = zbus::block_on(connection.0.release_name(dbus_name));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    struct CallbackArguments {
        argv: Vec<String>,
        cwd: String,
        calls: usize,
    }

    struct TestInstance(Arc<Mutex<CallbackArguments>>);

    #[interface(name = "org.SingleInstance.DBus")]
    impl TestInstance {
        fn execute_callback(&self, argv: Vec<String>, cwd: String) {
            let mut arguments = self.0.lock().unwrap();
            arguments.argv = argv;
            arguments.cwd = cwd;
            arguments.calls += 1;
        }
    }

    #[test]
    #[ignore = "run inside dbus-run-session with --test-threads=1"]
    fn dbus_instance_claim_forward_release_and_reclaim() {
        let name = "org.Phonara.VendoredSingleInstanceTest";
        let path = "/org/Phonara/VendoredSingleInstanceTest";
        let arguments = Arc::new(Mutex::new(CallbackArguments::default()));
        let first = zbus::block_on(serve_instance(
            name,
            path,
            TestInstance(Arc::clone(&arguments)),
        ))
        .expect("first instance claims its name");

        let duplicate = zbus::block_on(serve_instance(
            name,
            path,
            TestInstance(Arc::new(Mutex::new(CallbackArguments::default()))),
        ));
        assert!(matches!(duplicate, Err(zbus::Error::NameTaken)));

        let expected_argv = vec![
            "phonara".into(),
            "--toggle-transcription".into(),
            "été".into(),
        ];
        zbus::block_on(async {
            let second = Connection::session().await.expect("second connection");
            forward_callback(
                &second,
                name,
                path,
                expected_argv.clone(),
                "/tmp/dossier avec espaces",
            )
            .await
            .expect("forward to first instance");
        });
        let received = arguments.lock().unwrap();
        assert_eq!(received.calls, 1);
        assert_eq!(received.argv, expected_argv);
        assert_eq!(received.cwd, "/tmp/dossier avec espaces");
        drop(received);

        assert!(zbus::block_on(first.release_name(name)).expect("release instance name"));
        let _replacement = zbus::block_on(serve_instance(
            name,
            path,
            TestInstance(Arc::new(Mutex::new(CallbackArguments::default()))),
        ))
        .expect("a new instance claims the released name");
    }
}
