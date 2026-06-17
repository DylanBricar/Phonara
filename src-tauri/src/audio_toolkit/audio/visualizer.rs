use rustfft::{num_complex::Complex32, Fft, FftPlanner};
use std::sync::Arc;

const DB_MIN: f32 = -55.0;
const DB_MAX: f32 = 0.0;
const GAIN: f32 = 0.8;
const CURVE_POWER: f32 = 0.55;

pub struct AudioVisualiser {
    fft: Arc<dyn Fft<f32>>,
    window: Vec<f32>,
    bucket_ranges: Vec<(usize, usize)>,
    fft_input: Vec<Complex32>,
    noise_floor: Vec<f32>,
    buffer: Vec<f32>,
    buckets_scratch: Vec<f32>,
    window_size: usize,
}

impl AudioVisualiser {
    pub fn new(
        sample_rate: u32,
        window_size: usize,
        buckets: usize,
        freq_min: f32,
        freq_max: f32,
    ) -> Self {
        let mut planner = FftPlanner::<f32>::new();
        let fft = planner.plan_fft_forward(window_size);

        let window: Vec<f32> = (0..window_size)
            .map(|i| {
                0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / window_size as f32).cos())
            })
            .collect();

        let nyquist = sample_rate as f32 / 2.0;
        let freq_min = freq_min.min(nyquist);
        let freq_max = freq_max.min(nyquist);

        let mut bucket_ranges = Vec::with_capacity(buckets);

        for b in 0..buckets {
            let log_start = (b as f32 / buckets as f32).powi(2);
            let log_end = ((b + 1) as f32 / buckets as f32).powi(2);

            let start_hz = freq_min + (freq_max - freq_min) * log_start;
            let end_hz = freq_min + (freq_max - freq_min) * log_end;

            let start_bin = ((start_hz * window_size as f32) / sample_rate as f32) as usize;
            let mut end_bin = ((end_hz * window_size as f32) / sample_rate as f32) as usize;

            if end_bin <= start_bin {
                end_bin = start_bin + 1;
            }

            let start_bin = start_bin.min(window_size / 2);
            let end_bin = end_bin.min(window_size / 2);

            bucket_ranges.push((start_bin, end_bin));
        }

        Self {
            fft,
            window,
            bucket_ranges,
            fft_input: vec![Complex32::new(0.0, 0.0); window_size],
            noise_floor: vec![-40.0; buckets],
            buffer: Vec::with_capacity(window_size * 2),
            buckets_scratch: vec![0.0; buckets],
            window_size,
        }
    }

    pub fn feed(&mut self, samples: &[f32]) -> Option<Vec<f32>> {
        self.buffer.extend_from_slice(samples);

        if self.buffer.len() < self.window_size {
            return None;
        }

        let mut result = None;

        // Process every complete window so callbacks larger than one window
        // (the common case at 44.1/48 kHz) aren't temporally undersampled.
        // The trailing remainder (< window_size) is kept for the next call.
        while self.buffer.len() >= self.window_size {
            let mean =
                self.buffer[..self.window_size].iter().sum::<f32>() / self.window_size as f32;

            for i in 0..self.window_size {
                let windowed_sample = (self.buffer[i] - mean) * self.window[i];
                self.fft_input[i] = Complex32::new(windowed_sample, 0.0);
            }

            self.fft.process(&mut self.fft_input);

            // Reuse the pre-allocated scratch buffer instead of allocating each call
            self.buckets_scratch.fill(0.0);

            for (bucket_idx, &(start_bin, end_bin)) in self.bucket_ranges.iter().enumerate() {
                if start_bin >= end_bin || end_bin > self.fft_input.len() / 2 {
                    continue;
                }

                let mut power_sum = 0.0;
                for bin_idx in start_bin..end_bin {
                    let magnitude = self.fft_input[bin_idx].norm();
                    power_sum += magnitude * magnitude;
                }

                let avg_power = power_sum / (end_bin - start_bin) as f32;

                let db = if avg_power > 1e-12 {
                    20.0 * (avg_power.sqrt() / self.window_size as f32).log10()
                } else {
                    -80.0
                };

                if db < self.noise_floor[bucket_idx] + 10.0 {
                    const NOISE_ALPHA: f32 = 0.001;
                    self.noise_floor[bucket_idx] =
                        NOISE_ALPHA * db + (1.0 - NOISE_ALPHA) * self.noise_floor[bucket_idx];
                }

                let normalized = ((db - DB_MIN) / (DB_MAX - DB_MIN)).clamp(0.0, 1.0);
                self.buckets_scratch[bucket_idx] =
                    (normalized * GAIN).powf(CURVE_POWER).clamp(0.0, 1.0);
            }

            // Symmetric smoothing: read from a snapshot to avoid left-bias
            let len = self.buckets_scratch.len();
            if len >= 3 {
                let snapshot = self.buckets_scratch.clone();
                for i in 1..len - 1 {
                    self.buckets_scratch[i] =
                        snapshot[i] * 0.7 + snapshot[i - 1] * 0.15 + snapshot[i + 1] * 0.15;
                }
            }

            self.buffer.drain(..self.window_size);
            result = Some(self.buckets_scratch.clone());
        }

        result
    }

    pub fn reset(&mut self) {
        self.buffer.clear();
        self.noise_floor.fill(-40.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make() -> AudioVisualiser {
        AudioVisualiser::new(16_000, 512, 16, 400.0, 4000.0)
    }

    #[test]
    fn feed_returns_none_until_a_full_window() {
        let mut v = make();
        assert!(v.feed(&vec![0.0; 256]).is_none());
        // crossing window_size yields a result
        assert!(v.feed(&vec![0.0; 256]).is_some());
    }

    #[test]
    fn silence_yields_near_zero_buckets() {
        let mut v = make();
        let out = v.feed(&vec![0.0; 512]).expect("a full window returns Some");
        assert_eq!(out.len(), 16);
        assert!(
            out.iter().all(|&b| b <= 0.01),
            "silence must map to ~0 buckets, got {:?}",
            out
        );
    }

    #[test]
    fn drains_processed_window() {
        let mut v = make();
        // First call processes and drains one full window.
        assert!(v.feed(&vec![0.0; 512]).is_some());
        // The buffer is now empty; fewer than a window must return None, which
        // proves the processed window was drained (not left in the buffer).
        assert!(v.feed(&vec![0.0; 511]).is_none());
    }

    #[test]
    fn retains_remainder_below_window() {
        let mut v = make();
        // 600 = one full window (512) + 88 leftover.
        assert!(v.feed(&vec![0.0; 600]).is_some());
        // 424 + the retained 88 == 512 -> another full window, proving the
        // remainder was kept rather than discarded.
        assert!(v.feed(&vec![0.0; 424]).is_some());
    }
}
