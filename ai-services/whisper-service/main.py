from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile, os
app=FastAPI(title='SmartHire Whisper Service')
MODEL_SIZE=os.getenv('WHISPER_MODEL','small')
model=WhisperModel(MODEL_SIZE, device=os.getenv('WHISPER_DEVICE','cpu'), compute_type=os.getenv('WHISPER_COMPUTE_TYPE','int8'))
@app.get('/health')
def health(): return {'status':'ok','model':MODEL_SIZE}
@app.post('/transcribe')
async def transcribe(audio:UploadFile=File(...)):
    suffix=os.path.splitext(audio.filename or '.webm')[1] or '.webm'
    with tempfile.NamedTemporaryFile(delete=False,suffix=suffix) as f:
        f.write(await audio.read()); path=f.name
    try:
        segments,_=model.transcribe(path, vad_filter=True)
        text=' '.join(s.text.strip() for s in segments).strip()
        return {'text':text,'provider':'faster-whisper'}
    finally:
        try: os.remove(path)
        except OSError: pass
