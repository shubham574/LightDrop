import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QRTransmissionEngine } from './QRTransmissionEngine';
import { prepareTransfer } from '@/lib/protocol';

// Mock Web Workers for jsdom environment
class MockWorker {
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  postMessage(data: any) {
    // Simulate async worker response with a minimal valid QR module grid
    setTimeout(() => {
      if (this.onmessage) {
        const size = 21; // QR v1
        const modules = new Array(size * size).fill(0);
        this.onmessage({ data: { type: 'result', id: data.id, modules, size } });
      } else {
        // Some code uses addEventListener
        // Dispatching a mock event if onmessage isn't set isn't fully robust here, 
        // but wait, QRDisplay uses addEventListener('message')
      }
    }, 10);
  }
  addEventListener(type: string, listener: any) {
    if (type === 'message') {
      // we need to call this on postMessage
      this.messageListeners.push(listener);
    }
  }
  removeEventListener(type: string, listener: any) {
    if (type === 'message') {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    }
  }
  messageListeners: any[] = [];
  terminate() {}
}

const originalPostMessage = MockWorker.prototype.postMessage;
MockWorker.prototype.postMessage = function(data: any) {
  setTimeout(() => {
    const event = { data: { type: 'result', id: data.id, modules: new Array(21*21).fill(0), size: 21 } };
    if (this.onmessage) this.onmessage(event);
    this.messageListeners.forEach(l => l(event));
  }, 10);
};

vi.stubGlobal('Worker', MockWorker);

describe('QRTransmissionEngine Component', () => {
  it('should render transmission UI with frames without blank screen or errors', async () => {
    const file = new File(['Hello LightDrop Test Content'], 'photo.jpg', { type: 'image/jpeg' });
    const { manifest, encoder } = await prepareTransfer(file, {
      blockSize: 256,
      speed: 'EXTREME',
    });

    const onCancel = vi.fn();
    const onSpeedChange = vi.fn();

    const { container } = render(
      <QRTransmissionEngine
        encoder={encoder}
        manifest={manifest}
        onCancel={onCancel}
        onSpeedChange={onSpeedChange}
        initialSpeed="EXTREME"
      />
    );

    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText('sending')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Stop Transfer')).toBeInTheDocument();
  });
});
