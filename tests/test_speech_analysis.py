import io
import os
import wave
import struct
import unittest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.filler_service import analyze_fillers
from backend.services.pace_service import calculate_speech_pace, count_transcript_words, count_transcript_sentences
from backend.services.grammar_service import analyze_grammar
from backend.services.audio_processor import analyze_audio_pauses, validate_audio_file
from backend.services.pronunciation_service import analyze_pronunciation
from backend.services.communication_service import compute_communication_score

client = TestClient(app)


def create_dummy_wav_bytes(duration_seconds: float = 4.0, sample_rate: int = 16000) -> bytes:
    """Generates valid in-memory PCM 16-bit WAV bytes with alternating speech and silence bursts."""
    buf = io.BytesIO()
    total_frames = int(sample_rate * duration_seconds)
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)

        frames = []
        for i in range(total_frames):
            t = i / sample_rate
            if int(t) % 2 == 0:
                val = int(12000 * ((i % 100) / 100.0))
            else:
                val = 0
            frames.append(val)

        raw_data = struct.pack(f"<{len(frames)}h", *frames)
        wf.writeframes(raw_data)
    return buf.getvalue()


class TestSpeechAnalysis(unittest.TestCase):

    def test_filler_word_detection(self):
        transcript = "Um, I basically think that, you know, we should actually optimize the, uh, database query like right now."
        res = analyze_fillers(transcript)
        self.assertTrue(res.total >= 5)
        self.assertTrue("um" in res.words or "basically" in res.words or "you know" in res.words)
        self.assertTrue(res.rate > 0.0)
        self.assertIsNotNone(res.most_used)
        self.assertIn("<mark class=\"filler-tag\"", res.highlighted_transcript)

    def test_speech_pace_calculation(self):
        # 150 words in 1 minute (60s) -> 150 WPM -> Normal
        res = calculate_speech_pace(word_count=150, duration_seconds=60.0)
        self.assertEqual(res.wpm, 150.0)
        self.assertEqual(res.category, "Normal")
        self.assertTrue("Optimal pacing" in res.recommendation or "Excellent" in res.recommendation)

        # 60 words in 1 minute (60s) -> 60 WPM -> Very Slow
        slow_res = calculate_speech_pace(word_count=60, duration_seconds=60.0)
        self.assertEqual(slow_res.wpm, 60.0)
        self.assertEqual(slow_res.category, "Very Slow")

        # 200 words in 1 minute (60s) -> 200 WPM -> Very Fast
        fast_res = calculate_speech_pace(word_count=200, duration_seconds=60.0)
        self.assertEqual(fast_res.wpm, 200.0)
        self.assertEqual(fast_res.category, "Very Fast")

    def test_grammar_analysis(self):
        bad_transcript = "I is building a system and they was using more better tools because we could of done it. We tested the microservices properly."
        res = analyze_grammar(bad_transcript)
        self.assertTrue(res.mistakes_count >= 2)
        self.assertTrue(res.score < 90)
        self.assertTrue(len(res.mistakes) > 0)
        self.assertTrue(res.total_sentences_count >= 2)
        self.assertTrue(len(res.sentences_analysis) >= 2)
        self.assertFalse(res.sentences_analysis[0].is_valid)
        self.assertTrue(res.sentences_analysis[1].is_valid)
        self.assertTrue(any("am" in m.suggested_correction or "were" in m.suggested_correction for m in res.mistakes))

    def test_sentence_by_sentence_grammar_breakdown(self):
        multi_sentence = "They was working on the frontend. The database latency is optimal. We should of scaled earlier."
        res = analyze_grammar(multi_sentence)
        self.assertEqual(res.total_sentences_count, 3)
        self.assertEqual(len(res.sentences_analysis), 3)
        self.assertEqual(res.sentences_analysis[0].sentence_index, 1)
        self.assertFalse(res.sentences_analysis[0].is_valid)
        self.assertEqual(res.sentences_analysis[1].sentence_index, 2)
        self.assertTrue(res.sentences_analysis[1].is_valid)
        self.assertEqual(res.sentences_analysis[1].status, "Correct")
        self.assertEqual(res.sentences_analysis[2].sentence_index, 3)
        self.assertFalse(res.sentences_analysis[2].is_valid)
        self.assertEqual(res.passed_sentences_count, 1)

    def test_pronunciation_analysis(self):
        transcript = "The asynchronous architecture requires distributed orchestration and multi-tenant scalability."
        res = analyze_pronunciation(transcript)
        self.assertTrue(res.score > 0)
        self.assertNotEqual(res.clarity_assessment, "")

    def test_pause_analysis_on_audio(self):
        wav_bytes = create_dummy_wav_bytes(duration_seconds=5.0)
        res = analyze_audio_pauses(wav_bytes, "test.wav", explicit_duration=5.0)
        self.assertTrue(res.count >= 1)
        self.assertTrue(len(res.timeline) > 0)
        self.assertTrue(res.total_silence_duration >= 0.0)

    def test_communication_score_calculation(self):
        grammar = analyze_grammar("I have built modular microservices with high test coverage.")
        fillers = analyze_fillers("I have built modular microservices with high test coverage.")
        pace = calculate_speech_pace(word_count=140, duration_seconds=60.0)
        pauses = analyze_audio_pauses(create_dummy_wav_bytes(4.0), "test.wav")
        pronunciation = analyze_pronunciation("I have built modular microservices with high test coverage.")

        score_breakdown = compute_communication_score(
            grammar=grammar,
            fillers=fillers,
            pace=pace,
            pauses=pauses,
            pronunciation=pronunciation,
            transcript="I have built modular microservices with high test coverage."
        )
        self.assertTrue(0 <= score_breakdown.overall_score <= 100)
        self.assertTrue(score_breakdown.grammar >= 80)
        self.assertTrue(score_breakdown.fluency >= 80)
        self.assertTrue(score_breakdown.pace >= 90)

    def test_api_grammar_endpoint(self):
        r = client.post("/api/speech/grammar", json={"transcript": "They was working on the backend."})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("score", data)
        self.assertIn("mistakes", data)

    def test_api_fillers_endpoint(self):
        r = client.post("/api/speech/fillers", json={"transcript": "Um, well, like, basically it works."})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["total"] >= 3)
        self.assertTrue(data["rate"] > 0)

    def test_api_pace_endpoint(self):
        r = client.post("/api/speech/pace", json={"word_count": 135, "duration_seconds": 60.0})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["wpm"], 135.0)
        self.assertEqual(data["category"], "Normal")

    def test_api_text_analyze_endpoint(self):
        r = client.post("/api/speech/text-analyze", json={
            "transcript": "Um, in my recent project, basically I designed a scalable asynchronous FastAPI backend with PostgreSQL, you know, to handle high concurrency.",
            "audio_duration": 45.0
        })
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("session_id", data)
        self.assertTrue(data["word_count"] > 10)
        self.assertIn("grammar", data)
        self.assertIn("fillers", data)
        self.assertIn("pace", data)
        self.assertIn("pauses", data)
        self.assertIn("pronunciation", data)
        self.assertIn("communication", data)
        self.assertIn("feedback", data)

    def test_api_audio_analyze_and_validation(self):
        # Test empty file rejection
        r = client.post("/api/speech/analyze", files={"file": ("empty.webm", b"", "audio/webm")})
        self.assertEqual(r.status_code, 400)

        # Test invalid audio extension
        r_bad_ext = client.post("/api/speech/analyze", files={"file": ("malicious.exe", b"invalid executable bytes", "application/octet-stream")})
        self.assertEqual(r_bad_ext.status_code, 400)

        # Test valid wav audio upload
        wav_bytes = create_dummy_wav_bytes(duration_seconds=6.0)
        r = client.post(
            "/api/speech/analyze",
            files={"file": ("interview_sample.wav", wav_bytes, "audio/wav")},
            data={"explicit_duration": "6.0"}
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["audio_duration"] >= 3.0)
        self.assertTrue(data["communication"]["overall_score"] > 0)
        self.assertIn("session_id", data)

        # Test retrieval of the generated session
        session_id = data["session_id"]
        r_get = client.get(f"/api/speech/analysis/{session_id}")
        self.assertEqual(r_get.status_code, 200)
        self.assertEqual(r_get.json()["session_id"], session_id)

    def test_api_transcribe_endpoint(self):
        wav_bytes = create_dummy_wav_bytes(duration_seconds=4.0)
        r = client.post(
            "/api/speech/transcribe",
            files={"file": ("speech.wav", wav_bytes, "audio/wav")}
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("transcript", data)
        self.assertTrue(data["audio_duration"] > 0)
        self.assertTrue(data["word_count"] > 0)

    def test_api_pronunciation_endpoint(self):
        r = client.post("/api/speech/pronunciation", json={
            "transcript": "We built distributed microservices with high scalability and asynchronous queues."
        })
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["score"] > 0)
        self.assertIn("issues", data)

    def test_api_communication_score_endpoint(self):
        r = client.post("/api/speech/communication-score", json={
            "grammar_score": 90,
            "fluency_score": 85,
            "pronunciation_score": 88,
            "pace_score": 95,
            "clarity_score": 92,
            "vocabulary_score": 80,
            "confidence_score": 85
        })
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(80 <= data["overall_score"] <= 100)
        self.assertEqual(data["grammar"], 90)

    def test_error_handling_empty_transcript(self):
        r = client.post("/api/speech/text-analyze", json={"transcript": "   "})
        self.assertEqual(r.status_code, 400)

    def test_nonexistent_session(self):
        r = client.get("/api/speech/analysis/non_existent_12345")
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
