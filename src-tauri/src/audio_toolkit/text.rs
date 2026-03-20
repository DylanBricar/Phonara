use crate::settings::TextReplacement;
use natural::phonetics::soundex;
use once_cell::sync::Lazy;
use regex::Regex;
use strsim::levenshtein;

fn build_ngram(words: &[&str]) -> String {
    words
        .iter()
        .map(|w| {
            w.trim_matches(|c: char| !c.is_alphanumeric())
                .to_lowercase()
        })
        .collect::<Vec<_>>()
        .concat()
}

fn find_best_match<'a>(
    candidate: &str,
    custom_words: &'a [String],
    custom_words_nospace: &[String],
    threshold: f64,
) -> Option<(&'a String, f64)> {
    if candidate.is_empty() || candidate.len() > 50 {
        return None;
    }

    let mut best_match: Option<&String> = None;
    let mut best_score = f64::MAX;

    for (i, custom_word_nospace) in custom_words_nospace.iter().enumerate() {
        let len_diff = (candidate.len() as i32 - custom_word_nospace.len() as i32).abs() as f64;
        let max_len = candidate.len().max(custom_word_nospace.len()) as f64;
        let max_allowed_diff = (max_len * 0.25).max(2.0);
        if len_diff > max_allowed_diff {
            continue;
        }

        let levenshtein_dist = levenshtein(candidate, custom_word_nospace);
        let max_len = candidate.len().max(custom_word_nospace.len()) as f64;
        let levenshtein_score = if max_len > 0.0 {
            levenshtein_dist as f64 / max_len
        } else {
            1.0
        };

        let phonetic_match = soundex(candidate, custom_word_nospace);

        let combined_score = if phonetic_match {
            levenshtein_score * 0.3
        } else {
            levenshtein_score
        };

        if combined_score < threshold && combined_score < best_score {
            best_match = Some(&custom_words[i]);
            best_score = combined_score;
        }
    }

    best_match.map(|m| (m, best_score))
}

pub fn apply_custom_words(text: &str, custom_words: &[String], threshold: f64) -> String {
    if custom_words.is_empty() {
        return text.to_string();
    }

    let custom_words_lower: Vec<String> = custom_words.iter().map(|w| w.to_lowercase()).collect();

    let custom_words_nospace: Vec<String> = custom_words_lower
        .iter()
        .map(|w| w.replace(' ', ""))
        .collect();

    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let mut matched = false;

        for n in (1..=3).rev() {
            if i + n > words.len() {
                continue;
            }

            let ngram_words = &words[i..i + n];
            let ngram = build_ngram(ngram_words);

            if let Some((replacement, _score)) =
                find_best_match(&ngram, custom_words, &custom_words_nospace, threshold)
            {
                let (prefix, _) = extract_punctuation(ngram_words[0]);
                let (_, suffix) = extract_punctuation(ngram_words[n - 1]);

                let corrected = preserve_case_pattern(ngram_words[0], replacement);

                result.push(format!("{}{}{}", prefix, corrected, suffix));
                i += n;
                matched = true;
                break;
            }
        }

        if !matched {
            result.push(words[i].to_string());
            i += 1;
        }
    }

    result.join(" ")
}

fn preserve_case_pattern(original: &str, replacement: &str) -> String {
    if original.chars().all(|c| c.is_uppercase()) {
        replacement.to_uppercase()
    } else if original.chars().next().map_or(false, |c| c.is_uppercase()) {
        let mut chars: Vec<char> = replacement.chars().collect();
        if let Some(first_char) = chars.get_mut(0) {
            *first_char = first_char.to_uppercase().next().unwrap_or(*first_char);
        }
        chars.into_iter().collect()
    } else {
        replacement.to_string()
    }
}

fn extract_punctuation(word: &str) -> (&str, &str) {
    let prefix_end = word.chars().take_while(|c| !c.is_alphanumeric()).map(|c| c.len_utf8()).sum::<usize>();
    let suffix_start = word
        .chars()
        .rev()
        .take_while(|c| !c.is_alphanumeric())
        .map(|c| c.len_utf8())
        .sum::<usize>();

    let prefix = if prefix_end > 0 {
        &word[..prefix_end]
    } else {
        ""
    };

    let suffix = if suffix_start > 0 {
        &word[word.len() - suffix_start..]
    } else {
        ""
    };

    (prefix, suffix)
}

const FILLER_WORDS: &[&str] = &[
    "uh", "um", "uhm", "umm", "uhh", "uhhh", "hmm", "hm", "mmm", "mm", "mh",
    "ehh",
];

static MULTI_SPACE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").unwrap());

fn collapse_stutters(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut result: Vec<&str> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let word = words[i];
        let word_lower = word.to_lowercase();


        if word_lower.chars().all(|c| c.is_alphabetic()) {
            let mut count = 1;
            while i + count < words.len() && words[i + count].to_lowercase() == word_lower {
                count += 1;
            }

            if count >= 3 {
                result.push(word);
                i += count;
            } else {
                result.push(word);
                i += 1;
            }
        } else {
            result.push(word);
            i += 1;
        }
    }

    result.join(" ")
}

fn normalize_word(w: &str) -> String {
    w.trim_matches(|c: char| !c.is_alphanumeric() && c != '\'')
        .to_lowercase()
}

fn collapse_repeated_phrases(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    let n = words.len();
    if n < 6 {
        return text.to_string();
    }

    let normalized: Vec<String> = words.iter().map(|w| normalize_word(w)).collect();

    for phrase_len in (2..=n / 3).rev() {
        for start in 0..phrase_len {
            if start + phrase_len * 2 > n {
                continue;
            }
            let phrase = &normalized[start..start + phrase_len];
            let mut reps = 1;
            let mut pos = start + phrase_len;
            while pos + phrase_len <= n {
                if normalized[pos..pos + phrase_len] == *phrase {
                    reps += 1;
                    pos += phrase_len;
                } else {
                    break;
                }
            }
            if reps >= 3 {
                let mut result: Vec<&str> = words[..start + phrase_len].to_vec();
                result.extend_from_slice(&words[pos..]);
                return result.join(" ");
            }
        }
    }

    text.to_string()
}

static FILLER_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    FILLER_WORDS
        .iter()
        .map(|word| {
            Regex::new(&format!(r"(?i)\b{}\b[,.]?", regex::escape(word))).unwrap()
        })
        .collect()
});

fn collapse_repeated_chars(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();

    while let Some(ch) = chars.next() {
        result.push(ch);
        if !ch.is_alphanumeric() && !ch.is_whitespace() {
            let mut count = 1;
            while chars.peek() == Some(&ch) {
                chars.next();
                count += 1;
            }
            if count >= 4 {
            } else {
                for _ in 1..count {
                    result.push(ch);
                }
            }
        }
    }

    result
}

fn collapse_spaced_repeated_punctuation(text: &str) -> String {
    let mut result = text.to_string();
    for ch in ['!', '?', '.', ',', ';', '-', '*', '#'] {
        let spaced = format!("{ch} {ch} {ch} {ch}");
        if result.contains(&spaced) {
            let double = format!("{ch} {ch}");
            let single = format!("{ch}");
            while result.contains(&double) {
                result = result.replace(&double, &single);
            }
        }
    }
    result
}

fn is_punctuation_only(text: &str) -> bool {
    let trimmed = text.trim();
    !trimmed.is_empty() && !trimmed.chars().any(|c| c.is_alphanumeric())
}

pub fn filter_transcription_output(text: &str) -> String {
    let mut filtered = text.to_string();

    for pattern in FILLER_PATTERNS.iter() {
        filtered = pattern.replace_all(&filtered, "").to_string();
    }

    filtered = collapse_stutters(&filtered);

    filtered = collapse_repeated_phrases(&filtered);
    filtered = collapse_repeated_chars(&filtered);

    filtered = collapse_spaced_repeated_punctuation(&filtered);

    filtered = MULTI_SPACE_PATTERN.replace_all(&filtered, " ").to_string();

    let filtered = filtered.trim().to_string();

    if is_punctuation_only(&filtered) {
        return String::new();
    }

    filtered
}

pub fn apply_text_replacements(text: &str, replacements: &[TextReplacement]) -> String {
    if replacements.is_empty() {
        return text.to_string();
    }

    let mut result = text.to_string();

    for replacement in replacements {
        if replacement.find.is_empty() {
            continue;
        }

        if replacement.case_sensitive {
            result = result.replace(&replacement.find, &replacement.replace);
        } else {
            let escaped = regex::escape(&replacement.find);
            if let Ok(re) = regex::RegexBuilder::new(&escaped)
                .case_insensitive(true)
                .build()
            {
                result = re.replace_all(&result, replacement.replace.as_str()).to_string();
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_custom_words_exact_match() {
        let text = "hello world";
        let custom_words = vec!["Hello".to_string(), "World".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_apply_custom_words_fuzzy_match() {
        let text = "helo wrold";
        let custom_words = vec!["hello".to_string(), "world".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_preserve_case_pattern() {
        assert_eq!(preserve_case_pattern("HELLO", "world"), "WORLD");
        assert_eq!(preserve_case_pattern("Hello", "world"), "World");
        assert_eq!(preserve_case_pattern("hello", "WORLD"), "WORLD");
    }

    #[test]
    fn test_extract_punctuation() {
        assert_eq!(extract_punctuation("hello"), ("", ""));
        assert_eq!(extract_punctuation("!hello?"), ("!", "?"));
        assert_eq!(extract_punctuation("...hello..."), ("...", "..."));
    }

    #[test]
    fn test_empty_custom_words() {
        let text = "hello world";
        let custom_words = vec![];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_filter_filler_words() {
        let text = "So um I was thinking uh about this";
        let result = filter_transcription_output(text);
        assert_eq!(result, "So I was thinking about this");
    }

    #[test]
    fn test_filter_filler_words_case_insensitive() {
        let text = "UM this is UH a test";
        let result = filter_transcription_output(text);
        assert_eq!(result, "this is a test");
    }

    #[test]
    fn test_filter_filler_words_with_punctuation() {
        let text = "Well, um, I think, uh. that's right";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Well, I think, that's right");
    }

    #[test]
    fn test_filter_cleans_whitespace() {
        let text = "Hello    world   test";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Hello world test");
    }

    #[test]
    fn test_filter_trims() {
        let text = "  Hello world  ";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Hello world");
    }

    #[test]
    fn test_filter_combined() {
        let text = "  Um, so I was, uh, thinking about this  ";
        let result = filter_transcription_output(text);
        assert_eq!(result, "so I was, thinking about this");
    }

    #[test]
    fn test_filter_preserves_valid_text() {
        let text = "This is a completely normal sentence.";
        let result = filter_transcription_output(text);
        assert_eq!(result, "This is a completely normal sentence.");
    }

    #[test]
    fn test_filter_stutter_collapse() {
        let text = "w wh wh wh wh wh wh wh wh wh why";
        let result = filter_transcription_output(text);
        assert_eq!(result, "w wh why");
    }

    #[test]
    fn test_filter_stutter_short_words() {
        let text = "I I I I think so so so so";
        let result = filter_transcription_output(text);
        assert_eq!(result, "I think so");
    }

    #[test]
    fn test_filter_stutter_mixed_case() {
        let text = "No NO no NO no";
        let result = filter_transcription_output(text);
        assert_eq!(result, "No");
    }

    #[test]
    fn test_filter_stutter_preserves_two_repetitions() {
        let text = "no no is fine";
        let result = filter_transcription_output(text);
        assert_eq!(result, "no no is fine");
    }

    #[test]
    fn test_apply_custom_words_ngram_two_words() {
        let text = "il cui nome è Charge B, che permette";
        let custom_words = vec!["ChargeBee".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("ChargeBee,"));
        assert!(!result.contains("Charge B"));
    }

    #[test]
    fn test_apply_custom_words_ngram_three_words() {
        let text = "use Chat G P T for this";
        let custom_words = vec!["ChatGPT".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("ChatGPT"));
    }

    #[test]
    fn test_apply_custom_words_prefers_longer_ngram() {
        let text = "Open AI GPT model";
        let custom_words = vec!["OpenAI".to_string(), "GPT".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "OpenAI GPT model");
    }

    #[test]
    fn test_apply_custom_words_ngram_preserves_case() {
        let text = "CHARGE B is great";
        let custom_words = vec!["ChargeBee".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("CHARGEBEE"));
    }

    #[test]
    fn test_apply_custom_words_ngram_with_spaces_in_custom() {
        let text = "using Mac Book Pro";
        let custom_words = vec!["MacBook Pro".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("MacBook"));
    }

    #[test]
    fn test_filter_stutter_longer_words() {
        let text = "hello hello hello hello world";
        let result = filter_transcription_output(text);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_filter_stutter_sentence_like_repeats() {
        let text = "the the the the quick brown fox";
        let result = filter_transcription_output(text);
        assert_eq!(result, "the quick brown fox");
    }

    #[test]
    fn test_apply_custom_words_trailing_number_not_doubled() {
        let text = "use GPT4 for this";
        let custom_words = vec!["GPT-4".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(
            !result.contains("GPT-44"),
            "got double-counted result: {}",
            result
        );
    }

    #[test]
    fn test_text_replacements_basic() {
        let replacements = vec![TextReplacement {
            find: "gonna".to_string(),
            replace: "going to".to_string(),
            case_sensitive: false,
        }];
        let result = apply_text_replacements("I'm gonna do it", &replacements);
        assert_eq!(result, "I'm going to do it");
    }

    #[test]
    fn test_text_replacements_case_sensitive() {
        let replacements = vec![TextReplacement {
            find: "API".to_string(),
            replace: "Application Programming Interface".to_string(),
            case_sensitive: true,
        }];
        assert_eq!(
            apply_text_replacements("The API is great", &replacements),
            "The Application Programming Interface is great"
        );
        assert_eq!(
            apply_text_replacements("The api is great", &replacements),
            "The api is great"
        );
    }

    #[test]
    fn test_text_replacements_case_insensitive() {
        let replacements = vec![TextReplacement {
            find: "gonna".to_string(),
            replace: "going to".to_string(),
            case_sensitive: false,
        }];
        assert_eq!(
            apply_text_replacements("GONNA do it", &replacements),
            "going to do it"
        );
        assert_eq!(
            apply_text_replacements("Gonna do it", &replacements),
            "going to do it"
        );
    }

    #[test]
    fn test_text_replacements_empty() {
        let result = apply_text_replacements("hello world", &[]);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_text_replacements_empty_find() {
        let replacements = vec![TextReplacement {
            find: "".to_string(),
            replace: "something".to_string(),
            case_sensitive: false,
        }];
        let result = apply_text_replacements("hello world", &replacements);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_text_replacements_multiple() {
        let replacements = vec![
            TextReplacement {
                find: "gonna".to_string(),
                replace: "going to".to_string(),
                case_sensitive: false,
            },
            TextReplacement {
                find: "wanna".to_string(),
                replace: "want to".to_string(),
                case_sensitive: false,
            },
        ];
        let result = apply_text_replacements("I'm gonna wanna do it", &replacements);
        assert_eq!(result, "I'm going to want to do it");
    }

    #[test]
    fn test_text_replacements_delete() {
        let replacements = vec![TextReplacement {
            find: "um ".to_string(),
            replace: "".to_string(),
            case_sensitive: false,
        }];
        let result = apply_text_replacements("I um think so", &replacements);
        assert_eq!(result, "I think so");
    }

    #[test]
    fn test_filter_punctuation_only_hallucination() {
        assert_eq!(filter_transcription_output("!"), "");
        assert_eq!(filter_transcription_output("! ! ! ! !"), "");
        assert_eq!(filter_transcription_output("..."), "");
        assert_eq!(filter_transcription_output("? ? ?"), "");
        assert_eq!(filter_transcription_output("!!!"), "");
        assert_eq!(filter_transcription_output(" - "), "");
    }

    #[test]
    fn test_filter_preserves_text_with_punctuation() {
        assert_eq!(
            filter_transcription_output("Hello!"),
            "Hello!"
        );
        assert_eq!(
            filter_transcription_output("Bonjour, comment ça va?"),
            "Bonjour, comment ça va?"
        );
    }
}
