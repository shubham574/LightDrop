import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SendPage } from '@/pages/SendPage';
import { BrowserRouter } from 'react-router-dom';

describe('SendPage User Flow', () => {
  it('should allow file selection and start transmission without blank screen', async () => {
    render(
      <BrowserRouter>
        <SendPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Select File')).toBeInTheDocument();

    const file = new File(['Test photo content for optical transfer flow'], 'vacation_photo.jpg', {
      type: 'image/jpeg',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Trigger file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // The file should be processed and transition to transmission or show file info
    await waitFor(() => {
      // It should either show the file name or be transmitting
      const hasFileName = screen.queryByText('vacation_photo.jpg');
      const isTransmitting = screen.queryByText('sending');
      expect(hasFileName !== null || isTransmitting !== null).toBe(true);
    }, { timeout: 3000 });
  });
});
