from faster_whisper import WhisperModel
import time

print("Loading Faster-Whisper Small...")

start = time.perf_counter()

model = WhisperModel(
    "small",
    device="cuda",
    compute_type="float16"
)

print(f"Model loaded in {time.perf_counter() - start:.2f} seconds")

print("Transcribing test_audio.m4a...")

start = time.perf_counter()

segments, info = model.transcribe(
    "test_audio.m4a",
    beam_size=5
)

text = ""

for segment in segments:
    text += segment.text

print(f"\nDetected language: {info.language}")
print(f"Language probability: {info.language_probability:.2f}")
print("\nTranscription:")
print(text.strip())

print(f"\nTranscription time: {time.perf_counter() - start:.2f} seconds")