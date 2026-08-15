import time
import soundfile as sf
from kokoro import KPipeline

print("Loading Kokoro...")
start = time.perf_counter()

pipeline = KPipeline(lang_code="a", device="cuda")

load_time = time.perf_counter() - start
print(f"Model loaded in {load_time:.2f} seconds")

text = "Hello! This is a test of the local text to speech system."

print("Generating speech...")
start = time.perf_counter()

generator = pipeline(text, voice="af_heart")

for i, (gs, ps, audio) in enumerate(generator):
    sf.write("test_kokoro.wav", audio, 24000)
    print(f"Generated chunk {i + 1}")

generation_time = time.perf_counter() - start

print(f"Generation time: {generation_time:.2f} seconds")
print("Saved: test_kokoro.wav")