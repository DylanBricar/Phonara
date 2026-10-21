//! The bundled, offline model catalog.
//!
//! `catalog.json` is generated at build time by `scripts/gen_catalog.py` from the
//! `handy-computer` Hugging Face org (card `transcribe_cpp` capabilities +
//! benchmarks, a GGUF header probe for name/params, and local curation for the
//! recommended set). The 2026-10-21 review appends the four ASR packages added
//! by Handy 93c9ee05, adapting their metadata to the existing descriptor schema
//! without changing earlier ids, revisions, or cache aliases. It is compiled
//! into the binary so Phonara ships a model list with zero network access.
//!
//! Each entry is normalised into a [`ModelDescriptor`] — the same source-agnostic
//! shape every other producer (HF discovery, on-disk scans, the legacy table)
//! yields — so the catalog is "just another producer". Its explicit `capabilities`
//! map becomes a [`CapabilityProbe`] with confident `Some(..)` values; the runtime
//! `GgufHeaderProber` is the same shape with `None` where a header omits a key,
//! which is why the two are interchangeable (the catalog is a baked probe).

use std::collections::{HashMap, HashSet};

use once_cell::sync::Lazy;
use serde::Deserialize;

use crate::managers::model::{
    default_quant_file, EngineType, ModelDescriptor, ModelSource, QuantFile,
};
use crate::managers::model_capabilities::{CapabilityProbe, Compatibility};

#[derive(Deserialize)]
struct CatalogRoot {
    /// Base URLs tried in order when the Hugging Face download fails. The full
    /// file URL is `{mirror}/{repo_id}/{revision}/{filename}` — the same three
    /// values that form the HF resolve URL, so a mirror is a plain static host.
    #[serde(default)]
    mirrors: Vec<String>,
    models: Vec<CatalogModel>,
}

/// One model as written in `catalog.json`. Only the fields the descriptor needs
/// are declared; serde ignores the rest (slug, family, license, …).
#[derive(Deserialize)]
struct CatalogModel {
    /// HF repo id, e.g. `handy-computer/whisper-small-gguf`.
    id: String,
    /// Commit sha the catalog's sizes/hashes were generated from. Both HF
    /// acquisition and mirror keys use it, so downloaded bytes provably match
    /// the hashes regardless of source. Cache *lookup* additionally falls back
    /// to `main` (see `hf_cached_path`) so downloads that predate pinning keep
    /// resolving.
    revision: Option<String>,
    name: String,
    description: String,
    architecture: Option<String>,
    languages: Vec<String>,
    capabilities: CatalogCaps,
    speed_score: Option<f32>,
    accuracy_score: Option<f32>,
    files: Vec<QuantFile>,
    default_quant: Option<String>,
    recommended_rank: Option<u32>,
    /// Part of the small curated onboarding set (badged "Recommended"). Distinct
    /// from `recommended_rank`, which only orders the full list.
    #[serde(default)]
    recommended: bool,
}

#[derive(Deserialize)]
struct CatalogCaps {
    streaming: bool,
    translate: bool,
    lang_detect: bool,
    // `timestamps` (a string enum) is present in the catalog but has no
    // `CapabilityProbe` field yet — wire it through when the probe gains one.
}

impl From<&CatalogModel> for ModelDescriptor {
    fn from(m: &CatalogModel) -> Self {
        // The default download file. Its name is folded into the id so a catalog
        // entry collides (dedups) with the very same file later discovered in
        // the HF cache — both compute `"{repo_id}/{filename}"`.
        let default_filename = default_quant_file(&m.files, m.default_quant.as_deref())
            .map(|f| f.filename.clone())
            .unwrap_or_default();

        ModelDescriptor {
            id: format!("{}/{}", m.id, default_filename),
            source: ModelSource::HuggingFace {
                repo_id: m.id.clone(),
                // Acquire at the pin: `resolve/<sha>` is immutable (CDN-friendly)
                // and guarantees the bytes match the catalog's hashes. `main`
                // only remains as a lookup fallback for pre-pinning caches.
                revision: m.revision.clone().unwrap_or_else(|| "main".to_string()),
            },
            name: m.name.clone(),
            description: m.description.clone(),
            engine_type: EngineType::TranscribeCpp,
            caps: CapabilityProbe {
                verdict: Compatibility::Compatible, // curated org models we ship support for
                display_name: None,
                architecture: m.architecture.clone(),
                variant: None,
                languages: Some(m.languages.clone()),
                supports_streaming: Some(m.capabilities.streaming),
                supports_translation: Some(m.capabilities.translate),
                supports_language_detect: Some(m.capabilities.lang_detect),
            },
            files: m.files.clone(),
            default_quant: m.default_quant.clone(),
            // catalog scores are 0–100; ModelInfo / the UI bars use 0.0–1.0.
            speed_score: m.speed_score.unwrap_or(0.0) / 100.0,
            accuracy_score: m.accuracy_score.unwrap_or(0.0) / 100.0,
            recommended_rank: m.recommended_rank,
            recommended: m.recommended,
        }
    }
}

/// The raw parsed catalog. Kept alive (not consumed) so mirror metadata that
/// deliberately stays out of [`ModelDescriptor`] can be looked up separately.
static ROOT: Lazy<CatalogRoot> = Lazy::new(|| {
    serde_json::from_str(include_str!("catalog.json"))
        .expect("bundled catalog.json is valid JSON matching the catalog schema")
});

/// The bundled catalog, parsed once and normalised into descriptors.
pub static CATALOG: Lazy<Vec<ModelDescriptor>> =
    Lazy::new(|| ROOT.models.iter().map(ModelDescriptor::from).collect());

static CATALOG_IDS: Lazy<HashSet<String>> = Lazy::new(|| {
    CATALOG
        .iter()
        .map(|descriptor| descriptor.id.clone())
        .collect()
});

/// Whether a registry id belongs to the bundled catalog.
pub fn is_catalog_model(model_id: &str) -> bool {
    CATALOG_IDS.contains(model_id)
}

/// Exact byte length declared for a catalog artifact.
pub fn expected_file_size(model_id: &str, filename: &str) -> Option<u64> {
    CATALOG
        .iter()
        .find(|descriptor| descriptor.id == model_id)
        .and_then(|descriptor| {
            descriptor
                .files
                .iter()
                .find(|file| file.filename == filename)
        })
        .map(|file| file.size_bytes)
}

/// A mirror copy of a catalog model's default file, with the expected content
/// hash for end-to-end verification. Mirrors are untrusted bit-pipes: the
/// sha256 here (from the catalog compiled into the binary) is the trust anchor,
/// which is why it is mandatory — a file without one is never offered from a
/// mirror at all.
pub struct MirrorFile {
    pub url: String,
    pub sha256: String,
    /// Catalog size — drives progress totals and resume sanity checks.
    pub size_bytes: u64,
}

/// Ordered mirror URLs for a catalog model's file — any listed quant, not just
/// the default — or empty when the model isn't from the catalog / no mirrors
/// are configured. `model_id` is the registry id (`"{repo_id}/{filename}"`).
/// (The mirror may only host default quants; a miss there just 404s and the
/// caller reports it, so listing every quant here costs nothing.)
pub fn mirror_fallbacks(model_id: &str) -> Vec<MirrorFile> {
    let Some((m, file)) = ROOT.models.iter().find_map(|m| {
        m.files
            .iter()
            .find(|f| format!("{}/{}", m.id, f.filename) == model_id)
            .map(|f| (m, f))
    }) else {
        return Vec::new();
    };
    let Some(revision) = m.revision.as_deref() else {
        return Vec::new();
    };
    // No hash means no verification means no mirror: never fetch from an
    // untrusted host without the catalog trust anchor.
    let Some(sha256) = file.sha256.as_deref() else {
        return Vec::new();
    };
    ROOT.mirrors
        .iter()
        .map(|base| MirrorFile {
            url: format!(
                "{}/{}/{}/{}",
                base.trim_end_matches('/'),
                m.id,
                revision,
                file.filename
            ),
            sha256: sha256.to_string(),
            size_bytes: file.size_bytes,
        })
        .collect()
}

/// The catalog descriptor + specific `files[]` entry owning `filename`,
/// matched across every listed quant (not just the default). `repo_id`, when
/// given, must also match — the HF-cache scan uses it to keep a foreign repo
/// that happens to reuse a catalog filename from masquerading as ours.
pub fn file_in_catalog(
    filename: &str,
    repo_id: Option<&str>,
) -> Option<(&'static ModelDescriptor, &'static QuantFile)> {
    let catalog: &'static Vec<ModelDescriptor> = Lazy::force(&CATALOG);
    catalog.iter().find_map(|d| {
        if let Some(repo) = repo_id {
            match &d.source {
                ModelSource::HuggingFace { repo_id: r, .. } if r == repo => {}
                _ => return None,
            }
        }
        d.files
            .iter()
            .find(|f| f.filename == filename)
            .map(|f| (d, f))
    })
}

/// Editorial recommended rank keyed by descriptor id (the same id the model
/// registry uses). Built once from the catalog.
static RANK_BY_ID: Lazy<HashMap<String, u32>> = Lazy::new(|| {
    CATALOG
        .iter()
        .filter_map(|d| d.recommended_rank.map(|r| (d.id.clone(), r)))
        .collect()
});

/// Recommended rank for a model id (lower = higher priority). Returns
/// `u32::MAX` for unranked/unknown ids so they sort last in an ascending sort.
pub fn rank_of(model_id: &str) -> u32 {
    RANK_BY_ID.get(model_id).copied().unwrap_or(u32::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::managers::model_capabilities::KNOWN_ARCHES;
    use std::collections::BTreeSet;

    #[test]
    fn catalog_parses_and_is_nonempty() {
        assert!(!CATALOG.is_empty(), "bundled catalog should contain models");
    }

    #[test]
    fn ids_are_unique() {
        let mut ids: Vec<&str> = CATALOG.iter().map(|d| d.id.as_str()).collect();
        ids.sort_unstable();
        let before = ids.len();
        ids.dedup();
        assert_eq!(before, ids.len(), "catalog descriptor ids must be unique");
    }

    #[test]
    fn catalog_id_lookup_is_scoped_to_catalog_entries() {
        for descriptor in CATALOG.iter() {
            assert!(is_catalog_model(&descriptor.id));
        }
        assert!(!is_catalog_model("someorg/some-repo/some-file.gguf"));
        assert!(!is_catalog_model("small"));
    }

    #[test]
    fn catalog_default_filenames_are_unique_and_have_sizes() {
        let mut owners = HashMap::<&str, &str>::new();
        for descriptor in CATALOG.iter() {
            let filename = descriptor
                .id
                .rsplit_once('/')
                .map(|(_, filename)| filename)
                .expect("catalog ids include their default filename");
            assert!(
                expected_file_size(&descriptor.id, filename).is_some(),
                "{} must declare the byte size for {}",
                descriptor.id,
                filename
            );
            assert!(
                owners.insert(filename, &descriptor.id).is_none(),
                "catalog default filename {filename} has multiple owners"
            );
        }
    }

    #[test]
    fn pure_diarization_models_are_not_downloadable() {
        assert!(
            CATALOG
                .iter()
                .all(|model| model.caps.architecture.as_deref() != Some("sortformer")),
            "Sortformer produces speaker segments, not transcription text"
        );
    }

    #[test]
    fn scores_are_normalised_0_to_1() {
        for d in CATALOG.iter() {
            assert!((0.0..=1.0).contains(&d.speed_score), "{} speed", d.id);
            assert!((0.0..=1.0).contains(&d.accuracy_score), "{} acc", d.id);
        }
    }

    #[test]
    fn every_catalog_model_has_mirror_fallbacks_with_hashes() {
        // The mirror fallback is the safety net for HF outages and blocked
        // networks; a catalog entry without one (missing revision, missing
        // sha256, empty mirrors) silently loses that net.
        for d in CATALOG.iter() {
            let mirrors = mirror_fallbacks(&d.id);
            assert!(!mirrors.is_empty(), "{}: no mirror fallbacks", d.id);
            for m in &mirrors {
                assert!(
                    m.sha256.len() == 64,
                    "{}: mirror entry lacks a sha256",
                    d.id
                );
                assert!(m.size_bytes > 0, "{}: mirror entry lacks a size", d.id);
                assert!(m.url.starts_with("https://"), "{}: bad url {}", d.id, m.url);
            }
        }
    }

    #[test]
    fn catalog_architectures_are_known_to_capability_probe() {
        let missing: BTreeSet<&str> = CATALOG
            .iter()
            .filter_map(|d| d.caps.architecture.as_deref())
            .filter(|arch| !KNOWN_ARCHES.contains(arch))
            .collect();

        assert!(
            missing.is_empty(),
            "catalog architecture(s) missing from KNOWN_ARCHES: {:?}",
            missing
        );
    }

    #[test]
    fn reviewed_asr_additions_keep_pinned_registry_ids_and_artifacts() {
        for (slug, revision, sha256, size_bytes) in [
            (
                "parakeet-ultra",
                "39eeb55181f0d354fd934f06e92fd8d5037fed8e",
                "007a59761e9258779f189df396b50d12b83bb5b79e66df4b955c230d2f2a0a59",
                740_363_168,
            ),
            (
                "granite-speech-5.0-470m-turboctc",
                "2b0b44d0d6c8b94a2e4f04a2cf3ec6a5c054463b",
                "0408fe0b33be19af5be423d8ba6b43768608b6f065e1ac97b78c84b55c140738",
                505_606_496,
            ),
            (
                "granite-speech-5.0-470m-turboctc-nc",
                "fb8091e2c1e50ef67d3e795ee9f84d703343d7c5",
                "383ab69dc940f441fb7064e8aa41f71ac2d24d5bc4c64b6d17167a044c68c03d",
                505_885_856,
            ),
            (
                "orukeet",
                "ab8536716c3aa03d49c4c36c0dae6a3da71210b8",
                "68cd64b2a6c3c747f0a9f109884ed75b277c266c0fb8e5888c5a9f4d824fb9f7",
                739_508_704,
            ),
        ] {
            let repo_id = format!("handy-computer/{slug}-gguf");
            let filename = format!("{slug}-Q8_0.gguf");
            let registry_id = format!("{repo_id}/{filename}");
            let (descriptor, artifact) =
                file_in_catalog(&filename, Some(&repo_id)).expect("reviewed ASR package exists");
            assert_eq!(descriptor.id, registry_id);
            assert!(matches!(
                &descriptor.source,
                ModelSource::HuggingFace { revision: pin, .. } if pin == revision
            ));
            assert_eq!(artifact.sha256.as_deref(), Some(sha256));
            assert_eq!(artifact.size_bytes, size_bytes);
            assert!(file_in_catalog(&filename, Some("another/repository")).is_none());
        }
    }

    #[test]
    fn multitalker_legacy_bundle_paths_remain_discoverable() {
        let repo_id = "handy-computer/multitalker-parakeet-streaming-0.6b-v1-gguf";
        for quant in ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0", "F16", "F32"] {
            let filename = format!("multitalker-parakeet-streaming-0.6b-v1-{quant}.gguf");
            let (current, _) =
                file_in_catalog(&filename, Some(repo_id)).expect("current path remains available");
            let legacy_filename = format!("bundle/{filename}");
            let (legacy, legacy_artifact) = file_in_catalog(&legacy_filename, Some(repo_id))
                .expect("existing bundle caches remain discoverable");
            assert_eq!(current.id, legacy.id);
            assert!(matches!(
                &legacy.source,
                ModelSource::HuggingFace { revision, .. }
                    if revision == "31042fb4b5018be38240018492bdbde1923789dc"
            ));
            // Bundle artifacts have their own bytes, not aliases for the
            // root files. Discovery must keep their original trust anchors.
            let mirrors = mirror_fallbacks(&format!("{repo_id}/{legacy_filename}"));
            assert!(!mirrors.is_empty());
            assert_eq!(mirrors[0].sha256, legacy_artifact.sha256.clone().unwrap());
            assert_eq!(mirrors[0].size_bytes, legacy_artifact.size_bytes);
            assert!(mirrors[0].url.ends_with(&format!(
                "/31042fb4b5018be38240018492bdbde1923789dc/{legacy_filename}"
            )));
        }
    }
}
