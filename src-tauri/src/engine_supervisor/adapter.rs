//! Compatibility boundary for Phonara's mixed C++/ONNX model registry.
//! Only the C++ variant delegates to a process; ONNX engines remain unchanged.

use super::{CancelMark, EngineError, EngineSupervisor, LoadSpec, LoadedInfo};
use std::sync::{Arc, OnceLock};
use transcribe_cpp::{Capabilities, Feature, RunOptions, Transcript};

static SUPERVISOR: OnceLock<Arc<EngineSupervisor>> = OnceLock::new();

pub fn supervisor() -> Arc<EngineSupervisor> {
    Arc::clone(SUPERVISOR.get_or_init(|| {
        Arc::new(EngineSupervisor::new(
            !crate::utils::is_windows_x64_emulated_on_arm64(),
        ))
    }))
}

pub struct SupervisedSession {
    pub supervisor: Arc<EngineSupervisor>,
    initial_info: LoadedInfo,
}

impl SupervisedSession {
    pub fn load(spec: LoadSpec) -> Result<Self, EngineError> {
        let supervisor = supervisor();
        let initial_info = supervisor.load(spec)?;
        Ok(Self {
            supervisor,
            initial_info,
        })
    }

    pub fn model(&self) -> LoadedInfo {
        self.supervisor
            .loaded()
            .unwrap_or_else(|| self.initial_info.clone())
    }

    pub fn run_since(
        &self,
        mark: CancelMark,
        audio: &[f32],
        options: &RunOptions,
    ) -> Result<Transcript, EngineError> {
        self.supervisor
            .transcribe_since(mark, audio.to_vec(), options.clone())
    }
}

impl LoadedInfo {
    pub fn arch(&self) -> &str {
        &self.arch
    }
    pub fn variant(&self) -> &str {
        &self.variant
    }
    pub fn backend(&self) -> &str {
        &self.backend
    }
    pub fn capabilities(&self) -> Capabilities {
        self.capabilities.clone()
    }
    pub fn supports(&self, feature: Feature) -> bool {
        matches!(feature, Feature::InitialPrompt) && self.supports_initial_prompt
    }
}
