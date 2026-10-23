'use strict';
class AnkuzoPCM extends AudioWorkletProcessor {
  constructor() { super(); this.phase = 0; this.sum = 0; this.n = 0; this.buffer = new Int16Array(320); this.index = 0; this.offset = 0; }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.sum += sample; this.n++; this.phase += 16000;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        const value = Math.max(-1, Math.min(1, this.sum / this.n));
        this.buffer[this.index++] = Math.round(value * (value < 0 ? 32768 : 32767));
        this.sum = 0; this.n = 0;
        if (this.index === 320) {
          this.port.postMessage({ samples: this.buffer, offset: this.offset }, [this.buffer.buffer]);
          this.offset += 320; this.buffer = new Int16Array(320); this.index = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('ankuzo-pcm', AnkuzoPCM);
