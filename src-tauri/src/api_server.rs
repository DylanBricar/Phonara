use axum::{
    extract::{DefaultBodyLimit, Multipart, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::post,
    Router,
};
use log::{error, info};
use serde::Serialize;
use std::sync::Arc;

use crate::managers::transcription::TranscriptionManager;

const MAX_UPLOAD_SIZE: usize = 100 * 1024 * 1024; // 100 MB

#[derive(Serialize)]
struct TranscriptionResponse {
    text: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    message: String,
    r#type: String,
}

struct ApiState {
    transcription_manager: Arc<TranscriptionManager>,
    api_token: String,
}

fn make_error(status: StatusCode, message: &str) -> (StatusCode, Json<ErrorResponse>) {
    (
        status,
        Json(ErrorResponse {
            error: ErrorDetail {
                message: message.to_string(),
                r#type: "invalid_request_error".to_string(),
            },
        }),
    )
}

async fn transcribe_audio(
    State(state): State<Arc<ApiState>>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<TranscriptionResponse>, (StatusCode, Json<ErrorResponse>)> {
    if !state.api_token.is_empty() {
        let auth = headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        let expected = format!("Bearer {}", state.api_token);
        if auth != expected {
            return Err(make_error(StatusCode::UNAUTHORIZED, "Invalid or missing API token"));
        }
    }

    let mut audio_data: Option<Vec<u8>> = None;
    let mut language: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                audio_data = field.bytes().await.ok().map(|b| b.to_vec());
            }
            "language" => {
                language = field.text().await.ok();
            }
            _ => {}
        }
    }

    let audio_bytes = audio_data.ok_or_else(|| {
        make_error(StatusCode::BAD_REQUEST, "No audio file provided")
    })?;

    let samples = match load_audio_from_bytes(&audio_bytes) {
        Ok(s) => s,
        Err(e) => return Err(make_error(StatusCode::BAD_REQUEST, &format!("Failed to decode audio: {}", e))),
    };

    match state.transcription_manager.transcribe(samples, language) {
        Ok(text) => Ok(Json(TranscriptionResponse { text })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: ErrorDetail {
                    message: format!("Transcription failed: {}", e),
                    r#type: "server_error".to_string(),
                },
            }),
        )),
    }
}

fn load_audio_from_bytes(bytes: &[u8]) -> Result<Vec<f32>, String> {
    use std::io::Cursor;
    let reader = hound::WavReader::new(Cursor::new(bytes))
        .map_err(|e| format!("Invalid WAV format: {}", e))?;

    let spec = reader.spec();
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => reader
            .into_samples::<f32>()
            .filter_map(|s| s.ok())
            .collect(),
        hound::SampleFormat::Int => {
            let bits = spec.bits_per_sample;
            let max_val = (1 << (bits - 1)) as f32;
            reader
                .into_samples::<i32>()
                .filter_map(|s| s.ok())
                .map(|s| s as f32 / max_val)
                .collect()
        }
    };

    let mono = if spec.channels > 1 {
        samples
            .chunks(spec.channels as usize)
            .map(|frame| frame.iter().sum::<f32>() / spec.channels as f32)
            .collect()
    } else {
        samples
    };

    Ok(mono)
}

pub fn start_api_server(
    transcription_manager: Arc<TranscriptionManager>,
    port: u16,
    api_token: String,
) {
    let state = Arc::new(ApiState {
        transcription_manager,
        api_token: api_token.clone(),
    });

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to create API server runtime");

        rt.block_on(async {
            let app = Router::new()
                .route("/v1/audio/transcriptions", post(transcribe_audio))
                .layer(DefaultBodyLimit::max(MAX_UPLOAD_SIZE))
                .with_state(state);

            let addr = format!("127.0.0.1:{}", port);
            info!("Starting local API server on {}", addr);

            let listener = tokio::net::TcpListener::bind(&addr).await;
            match listener {
                Ok(listener) => {
                    if let Err(e) = axum::serve(listener, app).await {
                        error!("API server error: {}", e);
                    }
                }
                Err(e) => {
                    error!("Failed to bind API server to {}: {}", addr, e);
                }
            }
        });
    });
}
