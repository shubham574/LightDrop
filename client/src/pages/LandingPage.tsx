import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowDown } from 'lucide-react';

function Header() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="w-full min-h-[58px] flex items-center justify-between gap-4 px-[max(22px,env(safe-area-inset-right))] py-[14px] pl-[max(22px,env(safe-area-inset-left))] border-b border-decimen-line bg-decimen-bg/90 backdrop-blur-[14px] sticky top-0 z-10">
      <Link to="/" className="inline-flex items-center gap-2.5 text-decimen-text text-[13px] font-extrabold uppercase tracking-[0.12em] uppercase no-underline">
        <svg className="w-[22px] h-[22px] flex-none text-decimen-accent" viewBox="0 0 543 554.1" fill="currentColor" aria-hidden="true">
          <g transform="translate(-241,789) scale(0.1,-0.1)">
            <path d="M2410 6513 l0 -1378 103 101 c540 531 1324 986 1984 1153 402 102 850 95 1268 -21 529 -146 1300 -581 1860 -1050 175 -146 212 -184 199 -205 -37 -63 -502 -432 -754 -600 -969 -644 -1785 -844 -2590 -634 -667 174 -1376 581 -1947 1118 l-123 115 0 -1382 0 -1381 1478 4 c1291 3 1491 5 1588 20 1345 194 2240 1124 2355 2446 17 195 7 620 -19 786 -192 1236 -1030 2069 -2262 2249 -217 32 -411 36 -1772 36 l-1368 0 0 -1377z" />
            <path d="M4945 5906 c-300 -68 -532 -287 -611 -577 -25 -89 -25 -289 0 -378 141 -513 724 -749 1179 -477 405 242 503 778 209 1148 -100 125 -258 229 -417 273 -82 22 -282 29 -360 11z" />
          </g>
        </svg>
        Decimen Optical Transfer
      </Link>
      <nav className="flex gap-[3px] p-[3px] border border-decimen-line rounded-full uppercase text-[11px] tracking-[0.06em] text-decimen-muted font-mono">
        <Link 
          to="/send" 
          className={`px-2.5 py-[3px] rounded-full border border-transparent transition-colors ${currentPath === '/send' ? 'text-decimen-text bg-decimen-panel border-decimen-line-bright' : 'hover:text-decimen-text focus-visible:text-decimen-text'}`}
        >
          Send
        </Link>
        <Link 
          to="/receive" 
          className={`px-2.5 py-[3px] rounded-full border border-transparent transition-colors ${currentPath === '/receive' ? 'text-decimen-text bg-decimen-panel border-decimen-line-bright' : 'hover:text-decimen-text focus-visible:text-decimen-text'}`}
        >
          Receive
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-y-2.5 gap-x-[18px] px-[max(22px,env(safe-area-inset-right))] py-4 pl-[max(22px,env(safe-area-inset-left))] border-t border-decimen-line text-decimen-muted-dim text-[11px] tracking-[0.04em]">
      <span className="flex flex-col gap-[3px]">
        <span>Decimen Optical Transfer</span>
        <span>v1.0.0 · build local · © 2026</span>
      </span>
      <nav className="flex items-center gap-4 uppercase font-bold text-decimen-muted-dim hover:[&>a]:text-decimen-text transition-colors">
        <a href="https://github.com/bashalarmistalt/decimen-optical-transfer">GitHub</a>
      </nav>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100svh] bg-decimen-bg text-decimen-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
      <Header />
      <main className="flex-1 w-[min(1120px,calc(100%-40px))] mx-auto pt-[clamp(56px,9vw,110px)] pb-12 flex flex-col items-center">
        <section className="max-w-[820px] mb-[clamp(48px,7vw,82px)] w-full">
          <h1 className="m-0 text-decimen-text font-mono text-[clamp(32px,5vw,56px)] leading-none tracking-[-0.05em] normal-case text-start">
            Transfer files<br />with light.
          </h1>
          <p className="max-w-[660px] mt-5 text-decimen-muted text-[clamp(15px,2vw,18px)] leading-[1.65]">
            Send a file or a block of text from one screen to another device's camera.
            No account, pairing, cloud storage, or network path between devices.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <article className="min-h-[336px] flex flex-col justify-between gap-[30px] p-[clamp(24px,4vw,42px)] border border-decimen-line rounded-[18px] bg-gradient-to-br from-decimen-panel-strong to-decimen-panel">
            <div>
              <p className="m-0 mb-2 text-decimen-accent text-[11px] font-bold tracking-[0.14em] uppercase">This screen transmits</p>
              <h2 className="max-w-[430px] m-0 mb-[14px] text-decimen-text text-[clamp(25px,3.4vw,38px)] leading-[1.08] tracking-[-0.04em] font-bold">Send a file or text</h2>
              <p className="max-w-[480px] m-0 text-decimen-muted">Any file up to 500MB, or a pasted text snippet. Compressed when it helps, restored with its original name.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/send" className="group flex items-center justify-between gap-[22px] w-full min-h-[54px] px-[22px] text-decimen-accent-ink bg-decimen-accent border border-decimen-accent rounded-[10px] text-[13px] font-bold tracking-[0.14em] uppercase no-underline transition-colors hover:bg-decimen-accent-hi hover:border-decimen-accent-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-decimen-text">
                <span>Send</span>
                <ArrowRight className="w-5 h-5 flex-none transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
              </Link>
            </div>
          </article>

          <article className="min-h-[336px] flex flex-col justify-between gap-[30px] p-[clamp(24px,4vw,42px)] border border-decimen-line-bright rounded-[18px] bg-gradient-to-br from-[rgba(88,200,255,0.07)] to-decimen-panel">
            <div>
              <p className="m-0 mb-2 text-decimen-accent text-[11px] font-bold tracking-[0.14em] uppercase">This camera receives</p>
              <h2 className="max-w-[430px] m-0 mb-[14px] text-decimen-text text-[clamp(25px,3.4vw,38px)] leading-[1.08] tracking-[-0.04em] font-bold">Point and receive</h2>
              <p className="max-w-[480px] m-0 text-decimen-muted">Point your camera at the sender's screen to receive the file.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/receive" className="group flex items-center justify-between gap-[22px] w-full min-h-[54px] px-[22px] text-decimen-accent-ink bg-decimen-accent border border-decimen-accent rounded-[10px] text-[13px] font-bold tracking-[0.14em] uppercase no-underline transition-colors hover:bg-decimen-accent-hi hover:border-decimen-accent-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-decimen-text">
                <span>Receive</span>
                <ArrowDown className="w-5 h-5 flex-none transition-transform group-hover:translate-y-1" strokeWidth={2.4} />
              </Link>
            </div>
          </article>
        </section>

        <p className="mt-[30px] text-decimen-muted-dim text-[11px] text-center max-w-2xl">
          A network path is not required between the devices. The bytes travel as light.
          Files are not encrypted, so anything on the sending screen is readable by any
          camera pointed at it.
        </p>
      </main>
      <Footer />
    </div>
  );
}

export { Header, Footer };