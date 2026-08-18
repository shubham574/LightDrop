import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QRTransmissionEngine } from './QRTransmissionEngine';
import { createTransfer, encodeFrames } from '@/lib/protocol';

describe('QRTransmissionEngine Component', () => {
  it('should render transmission UI with frames without blank screen or errors', async () => {
    const file = new File(['Hello OpticalDrop Test Content'], 'photo.jpg', { type: 'image/jpeg' });
    const { metadata, chunks, parityChunks } = await createTransfer(file, {
      chunkSize: 1024,
      redundancyLevel: 'LOW',
      speed: 'EXTREME',
    });
    const frames = encodeFrames(metadata, chunks, parityChunks);

    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onSpeedChange = vi.fn();

    const { container } = render(
      <QRTransmissionEngine
        frames={frames}
        metadata={metadata}
        onComplete={onComplete}
        onCancel={onCancel}
        onPause={onPause}
        onResume={onResume}
        onSpeedChange={onSpeedChange}
        initialSpeed="EXTREME"
      />
    );

    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText('TRANSMITTING')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });
});
