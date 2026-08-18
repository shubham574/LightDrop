'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { QRDisplay } from '@/components/qr/QRDisplay';
import { 
  ArrowRight, 
  Camera, 
  WifiOff, 
  Link as LinkIcon, 
  CloudOff, 
  Shield, 
  CheckCircle,
  Cpu,
  Zap,
  Eye,
  Monitor,
  Smartphone
} from 'lucide-react';

const features = [
  { icon: WifiOff, title: 'No Internet Required', description: 'Works completely offline. No network connection between devices.' },
  { icon: LinkIcon, title: 'No Pairing', description: 'No Bluetooth pairing, no Wi-Fi Direct, no account creation needed.' },
  { icon: CloudOff, title: 'No Cloud Storage', description: 'Your files never leave your device. Zero server-side storage.' },
  { icon: Camera, title: 'Camera Only', description: 'Uses only the camera and screen. Works on any device with a browser.' },
  { icon: Shield, title: 'End-to-End Local', description: 'Direct optical transfer. No intermediaries, no metadata leakage.' },
  { icon: CheckCircle, title: 'Integrity Verified', description: 'SHA-256 checksum verification ensures file integrity.' },
];

const steps = [
  { number: '01', title: 'Select File', description: 'Choose any file up to 500MB on the sender device' },
  { number: '02', title: 'Generate QR Frames', description: 'File is chunked, encoded, and displayed as animated QR codes' },
  { number: '03', title: 'Scan with Camera', description: 'Point receiver camera at sender screen to capture frames' },
  { number: '04', title: 'Reconstruct File', description: 'Frames are decoded, verified, and reassembled into original file' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-optical-darker">
      <nav className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-optical-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-optical-green/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-optical-green" />
              </div>
              <span className="font-bold text-xl text-optical-green">OpticalDrop</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-white transition-colors">About</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-white transition-colors">Privacy</Link>
              <Link to="/send" className="btn-primary">
                <ArrowRight className="w-4 h-4 mr-2" />
                Send a File
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-optical-green/5 via-transparent to-optical-cyan/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-optical-green/10 via-transparent to-transparent" />
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-5xl mx-auto text-center space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-optical-green/10"
            >
              <Camera className="w-10 h-10 text-optical-green" />
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
                Send Files Through{' '}
                <span className="text-gradient">Light</span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                A private, network-free file transfer system using nothing but a screen and a camera.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/send">
                <Button size="xl" className="btn-primary min-w-[200px] gap-2">
                  <Camera className="w-5 h-5" />
                  Send a File
                </Button>
              </Link>
              <Link to="/receive">
                <Button size="xl" variant="secondary" className="min-w-[200px] gap-2">
                  <Smartphone className="w-5 h-5" />
                  Receive a File
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-optical-green" />
                <span>No Internet</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-optical-green" />
                <span>No Pairing</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudOff className="w-4 h-4 text-optical-green" />
                <span>No Cloud</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="py-20 px-4 border-y border-optical-border">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="section-title mb-4">How It Works</h2>
              <p className="section-subtitle mx-auto">Four simple steps to transfer files optically</p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="card-panel p-6 relative"
                >
                  <div className="text-4xl font-bold text-optical-green/20 mb-4 font-mono">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="section-title mb-4">Key Features</h2>
              <p className="section-subtitle mx-auto">Built for privacy, speed, and reliability</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="card-panel p-6 hover:border-optical-green/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-optical-green/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-optical-green" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 border-y border-optical-border">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="section-title mb-4">Live Demo</h2>
              <p className="section-subtitle mx-auto">Try the QR frame generator (simulated for demo)</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card-panel p-8 max-w-2xl mx-auto"
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Demo Transfer ID</label>
                  <div className="font-mono text-optical-green bg-optical-panel px-4 py-3 rounded-lg border border-optical-border">
                    od_1xk9m2p_abc123def
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Current Frame</label>
                  <QRDisplay
                    data={JSON.stringify({
                      protocolVersion: 1,
                      transferId: 'od_1xk9m2p_abc123def',
                      frameIndex: 142,
                      totalFrames: 1800,
                      payload: 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBkZW1vIGZyYW1lLi4u',
                      checksum: 'a1b2c3d4',
                      frameType: 'data'
                    })}
                    size={256}
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frame</span>
                    <span className="font-mono text-optical-green">142 / 1,800</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono text-optical-green">7.9%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ETA</span>
                    <span className="font-mono text-optical-green">4m 32s</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1">Pause</Button>
                  <Button variant="optical" className="flex-1">Resume</Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title mb-4">Ready to Transfer?</h2>
              <p className="section-subtitle mx-auto mb-8">Start sending files through light today</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/send">
                  <Button size="xl" className="btn-primary min-w-[200px] gap-2">
                    <Camera className="w-5 h-5" />
                    Send a File
                  </Button>
                </Link>
                <Link to="/receive">
                  <Button size="xl" variant="secondary" className="min-w-[200px] gap-2">
                    <Smartphone className="w-5 h-5" />
                    Receive a File
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-optical-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-lg bg-optical-green/20 flex items-center justify-center">
              <Camera className="w-4 h-4 text-optical-green" />
            </div>
            <span className="font-semibold text-white">OpticalDrop</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Files never leave your device. Transfer directly through light.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/about" className="hover:text-white transition-colors">About</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}