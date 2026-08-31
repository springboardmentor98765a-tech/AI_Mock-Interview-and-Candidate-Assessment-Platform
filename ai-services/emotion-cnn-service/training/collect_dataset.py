"""Consent-based webcam dataset collector for the exact three SmartHire classes.

Run from this directory with Python + OpenCV installed. It captures face crops
from the webcam and stores them under dataset/Nervous, dataset/Scared, or
 dataset/Confused based on an explicit annotator choice. This is a custom dataset
workflow; do not use it on people without consent.
"""
from pathlib import Path
import argparse, time, cv2

CLASSES = ["Nervous", "Scared", "Confused"]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--class-name", choices=CLASSES, required=True)
    p.add_argument("--count", type=int, default=200)
    p.add_argument("--out", default="../dataset")
    p.add_argument("--interval", type=float, default=0.20)
    args = p.parse_args()
    out = Path(args.out) / args.class_name
    out.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("Unable to open webcam")
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    saved = 0
    last = 0.0
    print(f"Consent required. Capturing {args.class_name}; press ESC to stop.")
    try:
        while saved < args.count:
            ok, frame = cap.read()
            if not ok:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(100, 100))
            if len(faces):
                x,y,w,h = max(faces, key=lambda r:r[2]*r[3])
                crop = frame[y:y+h, x:x+w]
                cv2.rectangle(frame,(x,y),(x+w,y+h),(0,255,0),2)
                now=time.time()
                if now-last >= args.interval:
                    path=out/f"{args.class_name.lower()}_{saved:05d}.jpg"
                    cv2.imwrite(str(path), crop)
                    saved += 1
                    last = now
            cv2.putText(frame, f"Class: {args.class_name} | {saved}/{args.count}", (20,40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
            cv2.imshow("SmartHire CNN Dataset Collector", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                break
    finally:
        cap.release(); cv2.destroyAllWindows()
    print(f"Saved {saved} face crops to {out}")

if __name__ == "__main__":
    main()
