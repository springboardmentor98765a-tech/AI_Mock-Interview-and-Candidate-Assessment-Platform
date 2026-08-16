from fastapi import FastAPI
from pydantic import BaseModel
import base64, tempfile, os, cv2, numpy as np, mediapipe as mp
app=FastAPI(title='SmartHire MediaPipe Eye Service')
face_mesh=mp.solutions.face_mesh.FaceMesh(static_image_mode=True,max_num_faces=1,refine_landmarks=True,min_detection_confidence=0.5)
class ImagePayload(BaseModel): image:str
@app.get('/health')
def health(): return {'status':'ok'}
@app.post('/analyze')
def analyze(payload:ImagePayload):
 raw=base64.b64decode(payload.image.split(',',1)[-1]); fd,path=tempfile.mkstemp(suffix='.jpg'); os.close(fd)
 try:
  with open(path,'wb') as f:f.write(raw)
  frame=cv2.imread(path); rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); result=face_mesh.process(rgb)
  if not result.multi_face_landmarks:return {'eye_contact_percentage':0,'looking_away_duration_seconds':0,'head_orientation':'Unknown','attention_level':'Low'}
  lm=result.multi_face_landmarks[0].landmark
  # Normalized eye openness/iris position gives a lightweight gaze proxy; stable front-facing frames score as eye contact.
  nose=lm[1]; left_iris=lm[468]; right_iris=lm[473]
  centered=abs(left_iris.x-0.5)<0.22 and abs(right_iris.x-0.5)<0.22 and abs(nose.x-0.5)<0.25
  pct=85 if centered else 45
  return {'eye_contact_percentage':pct,'looking_away_duration_seconds':0 if centered else 1,'head_orientation':'Front' if centered else 'Away','attention_level':'High' if centered else 'Medium'}
 finally:
  try:os.remove(path)
  except OSError:pass
