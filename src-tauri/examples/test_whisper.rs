#[cfg(windows)]
#[link(name = "advapi32")]
extern "C" {}

use std::path::PathBuf;
use std::time::Instant;
use transcribe_rs::{
    engines::whisper::{WhisperEngine, WhisperInferenceParams, WhisperModelParams},
    TranscriptionEngine,
};

fn load_wav(path: &std::path::Path) -> Result<(Vec<f32>, f64), Box<dyn std::error::Error>> {
    let reader = hound::WavReader::open(path)?;
    let spec = reader.spec();
    let dur = reader.duration() as f64 / spec.sample_rate as f64;
    let samples: Vec<f32> = hound::WavReader::open(path)?
        .into_samples::<i16>()
        .map(|s| s.map(|v| v as f32 / i16::MAX as f32))
        .collect::<Result<Vec<f32>, _>>()?;
    Ok((samples, dur))
}

fn normalize_audio(samples: &[f32], target_rms: f32) -> Vec<f32> {
    let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    if rms >= 0.02 || rms < 1e-6 { return samples.to_vec(); }
    let gain = target_rms / rms;
    samples.iter().map(|s| (s * gain).clamp(-1.0, 1.0)).collect()
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let model_dir = PathBuf::from("C:/Users/YourTech/AppData/Roaming/com.dylanbricar.phonara/models");
    let rec_dir = PathBuf::from("C:/Users/YourTech/AppData/Roaming/com.dylanbricar.phonara/recordings");

    let all_files: Vec<String> = std::fs::read_dir(&rec_dir)?
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if name.ends_with(".wav") { Some(name) } else { None }
        })
        .collect();

    println!("Found {} WAV files\n", all_files.len());

    println!("=== Whisper distil-fr CPU + normalization (ALL files) ===");
    let model_path = model_dir.join("whisper-distil-fr-q5_0.bin");
    let mut engine = WhisperEngine::new();
    let model_params = WhisperModelParams { use_gpu: false, ..Default::default() };
    engine.load_model_with_params(&model_path, model_params)?;
    println!("Loaded (CPU mode)\n");

    let mut ok_count = 0;
    let mut fail_count = 0;

    for test_file in &all_files {
        let wav_path = rec_dir.join(test_file);
        let (samples, dur) = load_wav(&wav_path)?;
        let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
        let to_transcribe = normalize_audio(&samples, 0.05);

        let params = WhisperInferenceParams {
            language: Some("fr".to_string()),
            ..Default::default()
        };
        let t = Instant::now();
        let result = engine.transcribe_samples(to_transcribe, Some(params))?;
        let ms = t.elapsed().as_millis();
        let text: String = result.text.trim().chars().take(120).collect();
        let is_fail = text.is_empty() || text.chars().all(|c| c == '!' || c == ' ');
        let status = if is_fail { "FAIL" } else { "OK" };
        if is_fail { fail_count += 1; } else { ok_count += 1; }
        println!("  [{}] [{}] ({:.1}s rms={:.4}) {:>6}ms: \"{}\"", status, test_file, dur, rms, ms, text);
    }

    engine.unload_model();
    println!("\nResults: {}/{} OK, {} FAIL", ok_count, all_files.len(), fail_count);

    Ok(())
}
