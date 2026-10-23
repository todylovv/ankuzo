import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from faster_whisper import WhisperModel

model = None
model_error = False
lock = threading.Lock()
threads = int(os.getenv('SPEECH_THREADS', '2'))
beam = int(os.getenv('SPEECH_BEAM', '1'))
hotwords = os.getenv('SPEECH_HOTWORDS', '') or None


def load_model():
    global model, model_error
    try:
        model = WhisperModel(os.getenv('SPEECH_MODEL', 'base'), device='cpu', compute_type='int8', cpu_threads=threads, num_workers=1, download_root='/models')
        print('Speech model ready', flush=True)
    except Exception:
        model_error = True
        print('Speech model failed to load', flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != '/health':
            return self.reply(404, {'error': 'Not found'})
        self.reply(200, {'ready': model is not None, 'failed': model_error, 'model': os.getenv('SPEECH_MODEL', 'base'), 'compute': 'int8', 'threads': threads, 'beam': beam})

    def do_POST(self):
        if self.path != '/transcribe':
            return self.reply(404, {'error': 'Not found'})
        if model is None:
            return self.reply(503, {'error': 'Model not ready'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.reply(400, {'error': 'Invalid length'})
        if length < 3200 or length > 320000 or length % 2:
            return self.reply(400, {'error': 'Expected 0.1–10 seconds of mono PCM16 at 16000 Hz'})
        if not lock.acquire(blocking=False):
            return self.reply(429, {'error': 'Busy'})
        try:
            raw = self.rfile.read(length)
            if len(raw) != length:
                return self.reply(400, {'error': 'Incomplete audio'})
            audio = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
            started = time.monotonic()
            segments, _ = model.transcribe(audio, language='ru', beam_size=beam, best_of=1, temperature=0, condition_on_previous_text=False, word_timestamps=True, hotwords=hotwords, vad_filter=True, vad_parameters={'min_silence_duration_ms': 300}, no_speech_threshold=0.6, compression_ratio_threshold=2.4)
            words, texts = [], []
            for segment in segments:
                if segment.no_speech_prob > 0.8 or segment.avg_logprob < -1.5:
                    continue
                texts.append(segment.text.strip())
                for word in segment.words or []:
                    words.append({'word': word.word.strip(), 'start': word.start, 'end': word.end, 'probability': word.probability})
            self.reply(200, {'text': ' '.join(texts), 'words': words, 'processingMs': round((time.monotonic() - started) * 1000), 'audioMs': round(len(audio) / 16)})
        except Exception:
            self.reply(500, {'error': 'Transcription failed'})
        finally:
            lock.release()


threading.Thread(target=load_model, daemon=True).start()
ThreadingHTTPServer(('0.0.0.0', 17223), Handler).serve_forever()
