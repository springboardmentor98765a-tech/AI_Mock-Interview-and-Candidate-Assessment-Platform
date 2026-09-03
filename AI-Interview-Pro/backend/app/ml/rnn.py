"""
app/ml/rnn.py
==========================
Module 6 - CNN + RNN Interview Behavior Analysis (RNN stage)

This is a small Elman (vanilla) recurrent neural network implemented
from scratch in NumPy - forward pass, full backpropagation-through-time
(BPTT), and an Adam optimizer step - with zero ML-framework dependency
(no PyTorch/TensorFlow needed on the backend).

Why it exists / where it sits in the pipeline:

    Browser (per video frame, ~every 1.5s)          Backend (per rolling window)
    ------------------------------------          -------------------------------
    face-api.js CNNs (TinyFaceDetector,      -->   EngagementRNN (this file):
    FaceLandmark68TinyNet, FaceExpressionNet)       consumes the SEQUENCE of those
    extract, per frame: face box, 68-point          per-tick vectors and models how
    landmarks, expression probabilities.            they evolve over ~30s, producing
    These are genuine CNNs (convolutional                a temporal engagement score,
    backbones) already running client-side -              a sustained-disengagement risk,
    see interview-session.js::detectEmotionTick.          and an integrity-risk signal
    That stage turns pixels into a small,                 (repeated no-face / multi-face
    per-tick numeric feature vector - see                 patterns a single frame can't
    features.py::TICK_FEATURE_NAMES.                      tell you about).

Only numeric feature vectors ever cross the network - never image or
video data - keeping the project's "no video leaves the browser"
privacy guarantee intact (see README / interview-session.html).

Training: see train_engagement_rnn.py. Because no labeled real-interview
dataset is available for this project, the network is bootstrapped on
programmatically generated synthetic behavior sequences (four archetypes:
engaged / distracted / absent / multiple-people - see that file for the
generator). This is a legitimate, common way to bootstrap a sequence
model before real annotated session data is available; swap in real
labeled sessions later by re-running the same training loop.
"""
import numpy as np

class EngagementRNN:
    """
    Single-layer Elman RNN: h_t = tanh(Wxh.x_t + Whh.h_(t-1) + bh),
    output = sigmoid(Why.h_T + by) read off the final hidden state.

    Input:  a (T, input_size) sequence of per-tick feature vectors
            (T = window length, e.g. 20 ticks ~= 30s of interview video).
    Output: a 3-vector in [0, 1]:
            [0] engagement_score       - higher = more engaged/attentive
            [1] disengagement_risk     - higher = sustained inattention
            [2] integrity_risk         - higher = proctoring concern
                                          (no face / multiple faces pattern)
    """

    def __init__(self, input_size=6, hidden_size=16, output_size=3, seed=42):
        rng = np.random.default_rng(seed)
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size

        def glorot(fan_in, fan_out):
            limit = np.sqrt(6 / (fan_in + fan_out))
            return rng.uniform(-limit, limit, size=(fan_out, fan_in)).astype(np.float64)

        self.Wxh = glorot(input_size, hidden_size)
        self.Whh = glorot(hidden_size, hidden_size)
        self.bh = np.zeros((hidden_size, 1))
        self.Why = glorot(hidden_size, output_size)
        self.by = np.zeros((output_size, 1))

        self._m = {}
        self._v = {}
        self._t = 0

    def params(self):
        return {"Wxh": self.Wxh, "Whh": self.Whh, "bh": self.bh, "Why": self.Why, "by": self.by}

    @staticmethod
    def _sigmoid(z):
        return 1.0 / (1.0 + np.exp(-z))

    def forward(self, X):
        """X: (T, input_size) -> (y (output_size,1), cache)"""
        T = X.shape[0]
        h = np.zeros((self.hidden_size, 1))
        hs = {-1: h}
        for t in range(T):
            x = X[t].reshape(-1, 1)
            h = np.tanh(self.Wxh @ x + self.Whh @ hs[t - 1] + self.bh)
            hs[t] = h
        y_lin = self.Why @ hs[T - 1] + self.by
        y = self._sigmoid(y_lin)
        cache = (X, hs, y)
        return y, cache

    def predict(self, X):
        y, _ = self.forward(X)
        return y.flatten()

    def backward(self, cache, target):
        X, hs, y = cache
        T = X.shape[0]
        dy = (y - target.reshape(-1, 1))  # d(BCE)/d(y_lin) for sigmoid output = (y - target)

        grads = {k: np.zeros_like(v) for k, v in self.params().items()}
        grads["Why"] = dy @ hs[T - 1].T
        grads["by"] = dy

        dh_next = self.Why.T @ dy
        for t in reversed(range(T)):
            dh = dh_next
            dtanh = (1 - hs[t] ** 2) * dh
            grads["bh"] += dtanh
            grads["Wxh"] += dtanh @ X[t].reshape(1, -1)
            grads["Whh"] += dtanh @ hs[t - 1].T
            dh_next = self.Whh.T @ dtanh

        return grads

    @staticmethod
    def _clip_grads(grads, max_norm=5.0):
        total_norm = np.sqrt(sum(float(np.sum(g ** 2)) for g in grads.values()))
        if total_norm > max_norm:
            scale = max_norm / (total_norm + 1e-8)
            for k in grads:
                grads[k] = grads[k] * scale
        return grads

    def adam_step(self, grads, lr=0.01, beta1=0.9, beta2=0.999, eps=1e-8, clip=5.0):
        self._t += 1
        if clip:
            grads = self._clip_grads(grads, clip)
        for k, g in grads.items():
            if k not in self._m:
                self._m[k] = np.zeros_like(g)
                self._v[k] = np.zeros_like(g)
            self._m[k] = beta1 * self._m[k] + (1 - beta1) * g
            self._v[k] = beta2 * self._v[k] + (1 - beta2) * (g ** 2)
            mhat = self._m[k] / (1 - beta1 ** self._t)
            vhat = self._v[k] / (1 - beta2 ** self._t)
            update = lr * mhat / (np.sqrt(vhat) + eps)
            setattr(self, k, getattr(self, k) - update)

    def save(self, path):
        np.savez(path, Wxh=self.Wxh, Whh=self.Whh, bh=self.bh, Why=self.Why, by=self.by,
                 input_size=self.input_size, hidden_size=self.hidden_size, output_size=self.output_size)

    @classmethod
    def load(cls, path):
        data = np.load(path)
        model = cls(int(data["input_size"]), int(data["hidden_size"]), int(data["output_size"]))
        model.Wxh = data["Wxh"]; model.Whh = data["Whh"]; model.bh = data["bh"]
        model.Why = data["Why"]; model.by = data["by"]
        return model
