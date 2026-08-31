# Manual Test — Section 6 & Proctoring

## Preconditions
1. Start Spring Boot backend.
2. Start DeepFace service on port 8092.
3. Start MediaPipe service on port 8093.
4. Start object detection service on port 8094.
5. Configure Gemini API key.
6. Open the frontend with Live Server.

## Test A — real monitoring
Start an interview with camera enabled. Confirm the monitoring panel says ACTIVE and provider names are DeepFace/MediaPipe. Wait for at least 3 valid samples.

## Test B — AI outage safety
Stop DeepFace or MediaPipe while interview is running. The UI must show DEGRADED/Unavailable. It must NOT invent emotion/eye scores and must NOT create a NO_FACE violation from the outage.

## Test C — fullscreen violation
Exit fullscreen once. Expect Warning 1.

## Test D — second violation
Switch tabs or exit fullscreen again after the debounce window. Expect Warning 2.

## Test E — third violation
Cause a third valid violation. The backend must set PROCTORING_TERMINATED and the interview must be auto-submitted. Refreshing must not restore the session.

## Test F — camera/microphone
Disable the camera or microphone track. Each valid event should create a warning.

## Test G — face detection
With real MediaPipe running, leave the camera view for more than 5 seconds. Expect NO_FACE warning. Bring the face back; it should stop accumulating.

## Test H — multiple faces
Place a second face in view for more than 3 seconds. Expect MULTIPLE_FACES warning.

## Test I — prohibited object
Place a supported visible phone/laptop/device in the camera frame. The YOLO service should return a prohibited-object detection. The backend should persist the event with detector evidence.

## Test J — normal completion
Complete an interview without violations. Final report should be COMPLETED, not PROCTORING_TERMINATED, and confidence should include valid monitoring evidence.

## Evidence
Record screenshots of the monitoring panel, warning 1/2/3, final report, and the backend console/API response for the violation count.

## Limitations
Camera-based object detection can only detect objects visible to the camera. Emotion and eye-contact outputs are ML estimates, not definitive psychological measurements.
