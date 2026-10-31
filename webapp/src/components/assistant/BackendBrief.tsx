import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, FlaskConical, BrainCircuit, ArrowRight,
  Activity, ShieldAlert, Wrench, Trophy, Radar, RefreshCw,
} from 'lucide-react';
import { useStore } from '../../state/store';
import { timeAgo, cn } from '../../utils/cn';
import { deriveBrief } from '../../utils/backendBrief';

/**
 * Live backend briefing for the Miri assistant panel.
 *
 * Miri is not decoration — she reports what the trading engine actually did:
 * the last paper trade, the latest strategy check (Flash Backtest verdict or
 * the active genome), and the newest post-mortem with the concrete rule
 * modification it triggered.
 *
 * Colour rule (same as the rest of the app): a green verdict is only ever
 * rendered for a result an actual in-session test produced. Anything that has
 * not been tested stays amber and says so.
 */

function Row({
  icon: Icon,
  label,
  tone,
  onClick,
  children,
}: {
  icon: typeof Activity;
  label: string;
  tone: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-2',
        onClick && 'hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] transition-colors cursor-pointer',
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} style={{ color: tone }} />
        <span className="text-[0.55rem] font-semibold tracking-wider uppercase" style={{ color: tone }}>
          {label}
        </span>
      </div>
      {children}
    </Tag>
  );
}

export function BackendBrief() {
  const snapshot = useStore((s) => s.snapshot);
  const setView = useStore((s) => s.setView);
  const setBacktestTab = useStore((s) => s.setBacktestTab);
  const setAutopsyTab = useStore((s) => s.setAutopsyTab);
  const setSelectedPostMortemId = useStore((s) => s.setSelectedPostMortemId);
  const setLabTab = useStore((s) => s.setLabTab);

  const brief = useMemo(() => deriveBrief(snapshot), [snapshot]);
  if (!snapshot || !brief) return null;

  const {
    lastTrade, openPnl, report, genomeName, podStatus, postMortem, proposals,
    validated: testedProposal, validatedFix, bestStrategy, activeStrategy, backend,
  } = brief;
  const scan = backend.lastScan;
  const validated = validatedFix?.report ?? testedProposal;

  return (
    <div className="space-y-1.5 px-3 pt-3">
      <div className="flex items-center gap-1.5">
        <Activity size={11} className="text-[var(--accent)]" />
        <span className="text-[0.58rem] font-semibold tracking-wider uppercase text-[var(--accent)]">
          Live backend
        </span>
        <span className="text-[0.55rem] dim ml-auto">
          {backend.tradesOpened} engine trade{backend.tradesOpened === 1 ? '' : 's'} · {backend.checksRun} check{backend.checksRun === 1 ? '' : 's'} · {snapshot.positions.length} open
        </span>
      </div>

      {/* 1 — what the engine traded */}
      <Row
        icon={lastTrade && lastTrade.outcome === 'loss' ? TrendingDown : TrendingUp}
        label="Trade executed"
        tone={lastTrade ? (lastTrade.outcome === 'loss' ? 'var(--red)' : 'var(--green)') : 'var(--text-dim)'}
        onClick={() => setView('home')}
      >
        {lastTrade ? (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.7rem] font-semibold">{lastTrade.symbol}</span>
              <span className="text-[0.6rem] dim uppercase">{lastTrade.side}</span>
              <span
                className="text-[0.65rem] font-bold font-mono"
                style={{ color: lastTrade.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {lastTrade.pnl >= 0 ? '+' : ''}{lastTrade.pnl.toFixed(2)}
              </span>
              <span className="text-[0.55rem] dim ml-auto">{timeAgo(lastTrade.closedAt)}</span>
            </div>
            <p className="text-[0.62rem] dim mt-0.5 leading-snug">{lastTrade.reason}</p>
          </>
        ) : (
          <p className="text-[0.64rem] dim leading-snug">
            {snapshot.positions.length
              ? `${snapshot.positions.length} position(s) open · unrealised ${openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}`
              : 'Abhi koi trade nahi — brain scanning kar raha hai'}
          </p>
        )}
      </Row>

      {/* 1b — the autonomous universe sweep */}
      <Row icon={Radar} label="Autonomous scan" tone="var(--accent)" onClick={() => setView('scanner')}>
        {scan ? (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.62rem] font-mono">{scan.candidates} instruments swept</span>
              {scan.best && (
                <span className="text-[0.62rem] dim">
                  · best <span className="text-[var(--accent)] font-semibold">{scan.best.score.toFixed(0)}%</span> {scan.best.symbol}
                </span>
              )}
              <span className="text-[0.55rem] dim ml-auto">{timeAgo(scan.at)}</span>
            </div>
            <p className="text-[0.62rem] dim mt-0.5 leading-snug">
              {scan.taken
                ? `Setup qualified — Scanner ${scan.taken} paper position kholi.`
                : scan.reason
                  ? `Blocked: ${scan.reason}.`
                  : scan.best
                    ? `Koi setup 60% confluence gate ke upar nahi mila (best ${scan.best.score.toFixed(0)}%).`
                    : 'Abhi tak koi confluence data nahi — pehla tick aane tak intezaar.'}
            </p>
          </>
        ) : (
          <p className="text-[0.62rem] dim leading-snug">Scanner shuru ho raha hai — pehla sweep abhi pending hai.</p>
        )}
      </Row>

      {/* 2 — strategy check */}
      <Row
        icon={FlaskConical}
        label="Strategy check"
        tone="var(--accent)"
        onClick={() => {
          setBacktestTab('flash');
          setView('backtest');
        }}
      >
        {report ? (
          <>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  color: report.recommendation === 'GO' ? 'var(--green)' : 'var(--red)',
                  background: report.recommendation === 'GO' ? 'rgba(29,184,134,0.14)' : 'rgba(229,83,107,0.14)',
                }}
              >
                {report.recommendation}
              </span>
              <span className="text-[0.66rem] font-mono">
                {(report.winRate * 100).toFixed(1)}% WR · PF {report.profitFactor.toFixed(2)}
              </span>
              <span className="text-[0.55rem] dim ml-auto">{timeAgo(report.at)}</span>
            </div>
            <p className="text-[0.62rem] dim mt-0.5 truncate">“{report.query}”</p>
            <p className="text-[0.58rem] dim mt-0.5 leading-snug">
              {report.auto
                ? 'Backend ka apna cadence check · single-symbol flash test (poore portfolio ka proof nahi).'
                : 'Manual flash test · single-symbol result.'}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <BrainCircuit size={11} className="dim" />
              <span className="text-[0.68rem] font-semibold truncate">{genomeName}</span>
              {podStatus && <span className="text-[0.55rem] dim ml-auto truncate">{podStatus}</span>}
            </div>
            <p className="text-[0.62rem] dim mt-0.5 leading-snug">
              Koi Flash Backtest abhi nahi chala — result aate hi yahan dikhega.
            </p>
          </>
        )}
      </Row>

      {/* 3 — the best strategy the learning loop produced */}
      <Row
        icon={bestStrategy ? Trophy : Wrench}
        label="Best stored strategy"
        tone={bestStrategy ? 'var(--green)' : 'var(--text-dim)'}
        onClick={
          bestStrategy
            ? () => {
                setLabTab('registry');
                setView('lab');
              }
            : undefined
        }
      >
        {bestStrategy ? (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.68rem] font-semibold">{bestStrategy.codename}</span>
              {activeStrategy?.id === bestStrategy.id && (
                <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>
                  PAPER TRADING ACTIVE
                </span>
              )}
              <span className="text-[0.58rem] dim ml-auto">
                CV {(bestStrategy.metrics.cvFitness * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-[0.62rem] dim mt-0.5 leading-snug">
              Fixes: {bestStrategy.origin}
            </p>
            {bestStrategy.changes.length > 0 && (
              <p className="text-[0.6rem] dim mt-1 font-mono">
                {bestStrategy.changes.map((c) => `${c.param} ${c.from}→${c.to}`).join(' · ')}
              </p>
            )}
          </>
        ) : (
          <p className="text-[0.64rem] dim leading-snug">
            Abhi koi validated strategy nahi — pehla autopsy auto-learn hote hi yahan aa jayega.
          </p>
        )}
      </Row>

      {/* 4 — mistake and the modification it triggered */}
      <Row
        icon={postMortem ? ShieldAlert : Wrench}
        label="Mistake → Modification"
        tone={postMortem ? 'var(--amber)' : 'var(--text-dim)'}
        onClick={
          postMortem
            ? () => {
                setSelectedPostMortemId(postMortem.id);
                setAutopsyTab('learning');
                setView('autopsy');
              }
            : undefined
        }
      >
        {postMortem ? (
          <>
            <p className="text-[0.66rem] leading-snug">
              <span className="dim">Mistake: </span>
              {postMortem.mistake}
            </p>
            <p className="text-[0.66rem] leading-snug mt-0.5">
              <span className="dim">Fix: </span>
              {postMortem.correction}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[0.58rem] dim">{proposals.length} rule change(s) proposed</span>
              {validated ? (
                <span
                  className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md ml-auto flex items-center gap-1"
                  style={{ color: 'var(--green)', background: 'rgba(29,184,134,0.14)' }}
                >
                  {validatedFix && <RefreshCw size={9} />}
                  VERIFIED {validated.recommendation}
                </span>
              ) : (
                <span
                  className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md ml-auto"
                  style={{ color: 'var(--amber)', background: 'rgba(224,165,47,0.14)' }}
                >
                  UNTESTED
                </span>
              )}
            </div>
            {proposals[0] && (
              <p className="text-[0.6rem] dim mt-1 leading-snug flex items-start gap-1">
                <ArrowRight size={10} className="mt-0.5 shrink-0" />
                <span className="truncate">{proposals[0].condition}: {proposals[0].proposed}</span>
              </p>
            )}
            {validatedFix && validatedFix.changes.length > 0 && (
              <p className="text-[0.6rem] dim mt-1 font-mono leading-snug">
                Applied: {validatedFix.changes.map((c) => `${c.param} ${c.from}→${c.to}`).join(' · ')}
              </p>
            )}
          </>
        ) : (
          <p className="text-[0.64rem] dim leading-snug">
            Koi post-mortem nahi — abhi tak koi trade rule toota nahi hai.
          </p>
        )}
      </Row>
    </div>
  );
}
