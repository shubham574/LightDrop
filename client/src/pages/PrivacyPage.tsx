'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Camera, 
  WifiOff, 
  Shield, 
  CheckCircle,
  Lock,
  Database,
  EyeOff,
  Server,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Info
} from 'lucide-react';

export function PrivacyPage() {
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-optical-green/10 mb-6">
              <Shield className="w-8 h-8 text-optical-green" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              Privacy & Security
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your files never leave your device. Period.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {[
                { icon: WifiOff, title: 'No Network Transfer', desc: 'Files travel only via light' },
                { icon: Database, title: 'No Server Storage', desc: 'Zero file data on backend' },
                { icon: EyeOff, title: 'No Tracking', desc: 'Anonymous analytics only' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="card-panel p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-optical-green/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-6 h-6 text-optical-green" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="section-title mb-6">Data Flow Architecture</h2>
            <div className="space-y-6">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-optical-green" />
                    What Stays on Your Device
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-optical-green flex-shrink-0" />
                      <strong>File contents</strong> — Never leave the sender's browser memory
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-optical-green flex-shrink-0" />
                      <strong>File chunks</strong> — Exist only as temporary QR frame data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-optical-green flex-shrink-0" />
                      <strong>QR payloads</strong> — Displayed on screen, captured by camera, then discarded
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-optical-green flex-shrink-0" />
                      <strong>Reconstructed file</strong> — Stays in receiver's browser until download
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-optical-green flex-shrink-0" />
                      <strong>SHA-256 checksums</strong> — Computed locally, never transmitted
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-optical-green" />
                    What the Backend Sees (Anonymous Analytics)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    The server only receives aggregated, anonymous transfer statistics:
                  </p>
                  <pre className="bg-optical-darker p-4 rounded-lg text-sm overflow-x-auto text-optical-green/80 font-mono">
{`{
  "protocolVersion": "1",
  "fileSizeBucket": "medium",      // "tiny" | "small" | "medium" | "large" | "xlarge"
  "frameCount": 1847,
  "durationMs": 423000,
  "completed": true,
  "redundancyLevel": "MEDIUM",
  "chunkSize": 1024,
  "createdAt": "2024-01-15T10:30:00Z"
}`}
</pre>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-optical-green/50 flex-shrink-0" />
                      No filenames, no file contents, no transfer IDs, no user identifiers
                    </li>
                    <li className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-optical-green/50 flex-shrink-0" />
                      File size bucketed (not exact size)
                    </li>
                    <li className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-optical-green/50 flex-shrink-0" />
                      Opt-out available (disable in settings)
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass-strong border-amber-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    What You Should Know
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <strong>Line of sight required:</strong> Anyone with a camera pointed at the sender's screen could theoretically capture the QR frames
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <strong>No encryption:</strong> The QR payloads are not encrypted. For sensitive files, encrypt before transfer (e.g., with age, GPG, or 7-Zip with AES-256)
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <strong>Shoulder surfing:</strong> Physical observers can see the file name and size on the sender UI
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <strong>Camera permissions:</strong> The receiver page requests camera access. This is required for QR scanning and is never used for anything else
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="section-title mb-6">Technical Safeguards</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Lock, title: 'SHA-256 Verification', desc: 'End-to-end integrity check. Transfer fails if any bit is corrupted.' },
                { icon: Shield, title: 'Transfer IDs', desc: 'Unique per-transfer identifiers prevent cross-contamination between simultaneous transfers.' },
                { icon: CheckCircle, title: 'Frame Validation', desc: 'Every frame validated: protocol version, transfer ID, checksum, frame type.' },
                { icon: Database, title: 'Memory Management', desc: 'Automatic cleanup of buffers after completion/cancellation. No persistent storage.' },
                { icon: Camera, title: 'Camera Cleanup', desc: 'Camera stream stopped immediately when leaving receiver page.' },
                { icon: WifiOff, title: 'Offline-First', desc: 'Core transfer works 100% offline. Backend only for optional analytics.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="card-panel p-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-optical-green/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-optical-green" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="section-title mb-6">Recommendations for Sensitive Files</h2>
            <div className="space-y-4">
              <Card className="glass-strong">
                <CardContent className="space-y-3 pt-6">
                  <p className="text-muted-foreground">
                    For maximum privacy with sensitive files, we recommend:
                  </p>
                  <ol className="space-y-3 text-muted-foreground ml-4 list-decimal">
                    <li><strong>Pre-encrypt:</strong> Encrypt files locally before transfer using tools like <code className="font-mono bg-optical-darker px-1 rounded">age</code>, <code className="font-mono bg-optical-darker px-1 rounded">GPG</code>, or <code className="font-mono bg-optical-darker px-1 rounded">7-Zip (AES-256)</code></li>
                    <li><strong>Verify physically:</strong> Ensure no cameras (phones, webcams, security cameras) have line of sight to the sender screen</li>
                    <li><strong>Use privacy screens:</strong> Laptop privacy filters reduce viewing angles</li>
                    <li><strong>Disable analytics:</strong> Turn off anonymous analytics in settings if desired</li>
                    <li><strong>Clear browser data:</strong> After transfer, clear site data to remove any cached frames</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-8 border-t border-optical-border"
          >
            <h3 className="text-xl font-semibold mb-4">Questions?</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              This is an open-source project. Review the code, audit the protocol, and contribute improvements.
            </p>
            <Link to="/send">
              <Button size="lg" className="btn-primary gap-2">
                <ArrowRight className="w-4 h-4" />
                Start Transfer
              </Button>
            </Link>
          </motion.section>
        </div>
      </main>

      <footer className="border-t border-optical-border py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>LightDrop — Privacy-first file transfer through light</p>
        </div>
      </footer>
    </div>
  );
}