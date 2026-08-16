from fastapi import FastAPI
from pydantic import BaseModel
from deepface import DeepFace
import base64, tempfile, os, cv2, numpy as np
app=FastAPI(title='SmartHire DeepFace Service')
class ImagePayload(BaseModel): image:str
@app.get('/health')
def health(): return {'status':'ok'}
@app.post('/analyze')
def analyze(payload:ImagePayload):
    raw=base64.b64decode(payload.image.split(',',1)[-1]);
    fd,path=tempfile.mkstemp(suffix='.jpg'); os.close(fd)
    try:
        with open(path,'wb') as f:f.write(raw)
        result=DeepFace.analyze(img_path=path,actions=['emotion'],enforce_detection=False)
        item=result[0] if isinstance(result,list) else result
        return {'dominant_emotion':item.get('dominant_emotion','Neutral'),'confidence':max(item.get('emotion',{}).values()) if item.get('emotion') else 50,'emotion':item.get('emotion',{})}
    finally:
        try:os.remove(path)
        except OSError:pass
