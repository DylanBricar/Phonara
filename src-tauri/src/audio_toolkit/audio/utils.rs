use anyhow::Result;
use hound::{WavReader, WavSpec, WavWriter};
use log::debug;
use std::fs::OpenOptions;
use std::io::BufWriter;
use std::path::Path;

/// Read a WAV file and return normalised f32 samples.
pub fn read_wav_samples<P: AsRef<Path>>(file_path: P) -> Result<Vec<f32>> {
    let reader = WavReader::open(file_path.as_ref())?;
    let samples = reader
        .into_samples::<i16>()
        .map(|s| s.map(|v| v as f32 / i16::MAX as f32))
        .collect::<Result<Vec<f32>, _>>()?;
    Ok(samples)
}

/// Verify a WAV file by reading it back and checking the sample count.
pub fn verify_wav_file<P: AsRef<Path>>(file_path: P, expected_samples: usize) -> Result<()> {
    let reader = WavReader::open(file_path.as_ref())?;
    let actual_samples = reader.len() as usize;
    if actual_samples != expected_samples {
        anyhow::bail!(
            "WAV sample count mismatch: expected {}, got {}",
            expected_samples,
            actual_samples
        );
    }
    Ok(())
}

/// Save audio samples as a new WAV file, without replacing an existing recording.
pub fn save_wav_file<P: AsRef<Path>>(file_path: P, samples: &[f32]) -> Result<()> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    // Reserve the path atomically: simultaneous recordings must never truncate
    // another recording, even when they have the same timestamp.
    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(file_path.as_ref())?;
    let mut writer = WavWriter::new(BufWriter::new(file), spec)?;

    // Convert f32 samples to i16 for WAV
    for sample in samples {
        let sample_i16 = (sample * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16)?;
    }

    writer.finalize()?;
    debug!("Saved WAV file: {:?}", file_path.as_ref());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saving_audio_never_replaces_an_existing_recording() {
        let directory = tempfile::tempdir().expect("create recording directory");
        let path = directory.path().join("phonara-123.wav");
        save_wav_file(&path, &[0.25, -0.25]).expect("save first recording");
        let original = std::fs::read(&path).expect("read first recording");

        let error = save_wav_file(&path, &[0.75]).expect_err("reject duplicate path");

        assert_eq!(
            error.downcast_ref::<std::io::Error>().map(|e| e.kind()),
            Some(std::io::ErrorKind::AlreadyExists)
        );
        assert_eq!(std::fs::read(&path).expect("read recording"), original);
        verify_wav_file(&path, 2).expect("first recording remains valid");
    }
}
