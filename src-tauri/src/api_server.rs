use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use log::{error, info};
use serde::Serialize;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

use crate::managers::transcription::TranscriptionManager;

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
}

async fn transcribe_audio(
    State(state): State<Arc<ApiState>>,
    mut multipart: Multipart,
) -> Result<Json<TranscriptionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mut audio_data: Option<Vec<u8>> = None;
    let mut _language: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                audio_data = field.bytes().await.ok().map(|b| b.to_vec());
            }
            "language" => {
                _language = field.text().await.ok();
            }
            _ => {}
        }
    }

    let audio_bytes = audio_data.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: ErrorDetail {
                    message: "No audio file provided".to_string(),
                    r#type: "invalid_request_error".to_string(),
                },
            }),
        )
    })?;

    let samples = match load_audio_from_bytes(&audio_bytes) {
        Ok(s) => s,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: ErrorDetail {
                        message: format!("Failed to decode audio: {}", e),
                        r#type: "invalid_request_error".to_string(),
                    },
                }),
            ));
        }
    };

    match state.transcription_manager.transcribe(samples, None) {
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
) {
    let state = Arc::new(ApiState {
        transcription_manager,
    });

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to create API server runtime");

        rt.block_on(async {
            let app = Router::new()
                .route("/v1/audio/transcriptions", post(transcribe_audio))
                .layer(CorsLayer::permissive())
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
