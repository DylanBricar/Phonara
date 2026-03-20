use log::info;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct WakeWordDetector {
    enabled: Arc<AtomicBool>,
    sensitivity: f32,
}

impl WakeWordDetector {
    pub fn new(sensitivity: f32) -> Self {
        WakeWordDetector {
            enabled: Arc::new(AtomicBool::new(false)),
            sensitivity,
        }
    }

    pub fn start(&self) {
        if self.enabled.load(Ordering::Relaxed) {
            return;
        }
        self.enabled.store(true, Ordering::Relaxed);
        info!("Wake word detection started (sensitivity: {})", self.sensitivity);
    }

    pub fn stop(&self) {
        self.enabled.store(false, Ordering::Relaxed);
        info!("Wake word detection stopped");
    }

    pub fn is_running(&self) -> bool {
        self.enabled.load(Ordering::Relaxed)
    }
}
