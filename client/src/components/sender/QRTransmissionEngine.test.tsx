import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QRTransmissionEngine } from './QRTransmissionEngine';
import { prepareTransfer } from '@/lib/protocol';

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
    expect(screen.getByText('TRANSMITTING')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });
});
