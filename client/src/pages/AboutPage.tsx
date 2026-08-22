'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  WifiOff, 
  Shield, 
  CheckCircle,
  Cpu,
  Zap,
  Eye,
  Monitor,
  Smartphone,
  FileText,
  Hash,
  RotateCcw,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-optical-darker">
      <nav className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-optical-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-optical-green/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-optical-green" />
              </div>
              <span className="font-bold text-xl text-optical-green">LightDrop</span>
            </Link>
            <Link to="/" className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              How LightDrop Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A deep dive into the optical QR file transfer protocol
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="section-title mb-6">Core Concept</h2>
            <div className="prose prose-invert max-w-none space-y-4">
              <p className="text-muted-foreground text-lg">
                LightDrop transfers files between two devices using <strong>only a screen and a camera</strong>. 
                No Wi-Fi, no Bluetooth, no cables, no cloud. The sender displays an animated sequence of QR codes 
                containing chunks of the file. The receiver uses its camera to scan those QR codes and reconstruct 
                the original file.
              </p>
              <p className="text-muted-foreground text-lg">
                The actual file payload travels exclusively through:
              </p>
              <div className="glass-strong rounded-xl p-6 text-center my-6">
                <div className="font-mono text-optical-green text-lg tracking-wider">
                  Sender Screen → Light → Receiver Camera → QR Decoder → File Reconstruction
                </div>
              </div>
              <p className="text-muted-foreground">
                The backend is used only for application infrastructure (health checks, configuration, analytics) — 
                <strong>the file payload never passes through the backend</strong>.
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="section-title mb-6">Transfer Protocol</h2>
            <div className="space-y-6">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-optical-green" />
                    File Chunking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    Files are split into chunks of 512–2048 bytes (configurable). Each chunk becomes a data frame.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-optical-panel p-3 rounded-lg">
                      <p className="text-optical-green font-semibold">Chunk Size</p>
                      <p className="text-muted-foreground">Default: 1 KB</p>
                    </div>
                    <div className="bg-optical-panel p-3 rounded-lg">
                      <p className="text-optical-green font-semibold">Encoding</p>
                      <p className="text-muted-foreground">Base64 for binary safety</p>
                    </div>
                    <div className="bg-optical-panel p-3 rounded-lg">
                      <p className="text-optical-green font-semibold">Checksum</p>
                      <p className="text-muted-foreground">Per-frame CRC32</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-optical-green" />
                    Frame Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    Each QR frame contains a JSON payload with metadata for robustness:
                  </p>
                  <pre className="bg-optical-darker p-4 rounded-lg text-sm overflow-x-auto text-optical-green/80 font-mono">{`{
  "protocolVersion": 1,
  "transferId": "od_1xk9m2p_abc123def",
  "frameIndex": 142,
  "totalFrames": 1800,
  "payload": "SGVsbG8gV29ybGQh...",
  "checksum": "a1b2c3d4",
  "frameType": "data"
}`}</pre>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-optical-green mb-2">Frame Types</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><span className="font-mono">metadata</span> — File info, sent first</li>
                        <li><span className="font-mono">data</span> — File chunks</li>
                        <li><span className="font-mono">parity</span> — Error correction frames</li>
                        <li><span className="font-mono">complete</span> — End marker</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-optical-green mb-2">Validation</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>Protocol version match</li>
                        <li>Transfer ID match</li>
                        <li>Frame checksum verification</li>
                        <li>Duplicate detection</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-optical-green" />
                    Error Correction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    Since the optical channel is one-way (no feedback from receiver to sender), 
                    we implement forward error correction using parity frames:
                  </p>
                  <ul className="space-y-2 text-muted-foreground ml-4 list-disc">
                    <li><strong>Parity chunks</strong> — XOR of multiple data chunks (configurable 10–30% redundancy)</li>
                    <li><strong>Recovery</strong> — Single missing chunk per parity group can be recovered</li>
                    <li><strong>Duplicate handling</strong> — Frame index tracking prevents double-counting</li>
                    <li><strong>Out-of-order support</strong> — Frames can arrive in any sequence</li>
                  </ul>
                  <div className="bg-optical-panel p-4 rounded-lg">
                    <p className="font-mono text-sm text-optical-green">
                      DATA 001 ⊕ DATA 002 ⊕ DATA 003 ⊕ DATA 004 = PARITY 001
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      If DATA 003 is lost: DATA 003 = PARITY 001 ⊕ DATA 001 ⊕ DATA 002 ⊕ DATA 004
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-optical-green" />
                    Integrity Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    End-to-end integrity is guaranteed by SHA-256 checksums:
                  </p>
                  <ol className="space-y-2 text-muted-foreground ml-4 list-decimal">
                    <li>Sender computes SHA-256 of entire file before transfer</li>
                    <li>Checksum included in metadata frame</li>
                    <li>Receiver reconstructs file and recomputes SHA-256</li>
                    <li>Transfer only succeeds if checksums match exactly</li>
                  </ol>
                  <p className="text-muted-foreground text-sm">
                    This ensures the downloaded file is bit-for-bit identical to the original.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="section-title mb-6">Transmission Speeds</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { name: 'Balanced', fps: 10, delay: 100, desc: 'Reliable default speed', icon: Eye },
                { name: 'Fast', fps: 15, delay: 66, desc: 'High performance transfer', icon: Zap },
                { name: 'Extreme', fps: 30, delay: 33, desc: '30 FPS default speed', icon: Cpu },
                { name: 'Hyper', fps: 60, delay: 16, desc: '60 FPS ultra high-speed', icon: Monitor },
              ].map((speed, i) => (
                <motion.div
                  key={speed.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="card-panel p-6 text-center hover:border-optical-green/50 transition-all"
                >
                  <speed.icon className="w-8 h-8 mx-auto text-optical-green mb-3" />
                  <h3 className="font-semibold text-lg">{speed.name}</h3>
                  <p className="text-3xl font-bold font-mono text-optical-green mt-1">{speed.fps} FPS</p>
                  <p className="text-xs text-muted-foreground mt-2">{speed.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">{speed.delay}ms/frame</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="section-title mb-6">Best Practices</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Monitor, title: 'Sender Screen', tips: ['Maximize brightness', 'Disable auto-brightness', 'Full-screen QR code', 'Avoid dark mode OS UI'] },
                { icon: Smartphone, title: 'Receiver Camera', tips: ['Use rear camera', 'Tap to focus on QR', 'Keep steady', 'Fill frame with QR'] },
                { icon: Zap, title: 'Environment', tips: ['Reduce glare/reflections', 'Adequate ambient light', 'Parallel device alignment', 'Minimize motion'] },
                { icon: Cpu, title: 'Settings', tips: ['Start with Balanced speed', 'Reduce if frames dropped', 'Enable error correction', 'Allow parity recovery'] },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="card-panel p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-optical-green/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-optical-green" />
                    </div>
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {item.tips.map((tip) => (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-optical-green/50 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Link to="/send">
              <Button size="xl" className="btn-primary gap-2">
                <ArrowRight className="w-5 h-5" />
                Try It Now
              </Button>
            </Link>
          </motion.section>
        </div>
      </main>

      <footer className="border-t border-optical-border py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>LightDrop — Send files through light</p>
        </div>
      </footer>
    </div>
  );
}