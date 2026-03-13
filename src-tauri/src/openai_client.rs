use anyhow::Result;
use hound::{WavSpec, WavWriter};
use reqwest::multipart;
use std::io::Cursor;

const OPENAI_API_BASE: &str = "https://api.openai.com/v1/audio/transcriptions";

fn encode_samples_to_wav(samples: &[f32]) -> Result<Vec<u8>> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut buffer = Vec::new();
    {
        let cursor = Cursor::new(&mut buffer);
        let mut writer = WavWriter::new(cursor, spec)?;
        for sample in samples {
            let sample_i16 = (sample * i16::MAX as f32) as i16;
            writer.write_sample(sample_i16)?;
        }
        writer.finalize()?;
    }

    Ok(buffer)
}

pub async fn transcribe_audio(
    api_key: &str,
    model: &str,
    audio_samples: &[f32],
    language: Option<&str>,
) -> Result<String> {
    let wav_bytes = encode_samples_to_wav(audio_samples)?;

    let file_part = multipart::Part::bytes(wav_bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")?;

    let mut form = multipart::Form::new()
        .text("model", model.to_string())
        .text("response_format", "text".to_string())
        .part("file", file_part);

    if let Some(lang) = language {
        if lang != "auto" {
            form = form.text("language", lang.to_string());
        }
    }

    let response = crate::http_client::client()
        .post(OPENAI_API_BASE)
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("OpenAI API request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read error response".to_string());
        return Err(anyhow::anyhow!(
            "OpenAI API error ({}): {}",
            status,
            error_text
        ));
    }

    let text = response
        .text()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to read OpenAI response: {}", e))?;

    Ok(text.trim().to_string())
}
