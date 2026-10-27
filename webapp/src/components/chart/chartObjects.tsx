import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { BrainSnapshot } from '../../engine/brain';
import { buildScale, mapZones, mapDarkZones, mapHeat, mapSweeps, visibleCandles, CHART_W, CHART_H } from './chartMath';

const PATH_COLOR = { A: '#2dffb0', B: '#ffd84d', C: '#ff5470' } as const;

// ── Holographic base grid ──────────────────────────────────────────────────
export function HoloGrid() {
  return (
    <group position={[0, 0, -0.4]}>
      <Grid
        args={[CHART_W + 4, 10]}
        position={[0, 0, 0]}
        cellSize={0.55}
        cellThickness={0.6}
        cellColor="#1d3a6e"
        sectionSize={2.2}
        sectionThickness={1.1}
        sectionColor="#2f6fc4"
        fadeDistance={26}
        fadeStrength={2.2}
        infiniteGrid={false}
      />
      <Line points={[[-CHART_W / 2 - 1, 0, 0.02], [CHART_W / 2 + 1, 0, 0.02]]} color="#38e8ff" lineWidth={1.4} transparent opacity={0.55} />
    </group>
  );
}

// ── Price energy ribbon ────────────────────────────────────────────────────
export function PriceStream({ candles, snapshot }: { candles: ReturnType<typeof visibleCandles>; snapshot: BrainSnapshot }) {
  const scale = useMemo(
    () => buildScale(candles, snapshot.paths, snapshot.monteCarlo),
    [candles, snapshot.paths, snapshot.monteCarlo],
  );
  const pts = useMemo(() => candles.map((c, i) => [scale.x(i), scale.y(c.c), 0.05] as [number, number, number]), [candles, scale]);
  const glowRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) glowRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(clock.elapsedTime * 2 + i) * 0.18;
    });
  });
  if (pts.length < 2) return null;
  const up = pts[pts.length - 1][1] >= pts[Math.max(0, pts.length - 8)][1];
  const color = up ? '#2dffb0' : '#ff5470';
  return (
    <group>
      <Line points={pts} color={color} lineWidth={2.6} transparent opacity={0.95} />
      <Line points={pts} color={color} lineWidth={7} transparent opacity={0.18} />
      <group ref={glowRef}>
        {pts.filter((_, i) => i % 6 === 0).map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── SMC / ICT structural zones ─────────────────────────────────────────────
export function ZoneBoxes({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const scale = useMemo(() => buildScale(candles, snapshot.paths, snapshot.monteCarlo), [candles, snapshot.paths, snapshot.monteCarlo]);
  const mapped = useMemo(() => mapZones(snapshot.zones, scale, candles[0]?.t ?? 0, 8000), [snapshot.zones, scale, candles]);
  return (
    <group>
      {mapped.map((z) => {
        const faint = z.kind === 'premium' || z.kind === 'discount' || z.mitigated;
        return (
          <mesh key={z.id} position={z.position}>
            <boxGeometry args={z.size} />
            <meshBasicMaterial
              color={z.color}
              transparent
              opacity={faint ? 0.07 : 0.16 + z.strength * 0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Hidden-confluence glow heatmap (instanced) ─────────────────────────────
export function GlowHeatmap({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const scale = useMemo(() => buildScale(candles, snapshot.paths, snapshot.monteCarlo), [candles, snapshot.paths, snapshot.monteCarlo]);
  const cells = useMemo(() => mapHeat(snapshot.confluenceCells, scale, candles), [snapshot.confluenceCells, scale, candles]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;
    cells.forEach((cell, i) => {
      dummy.position.set(...cell.position);
      const s = 0.06 + cell.glow * 0.22;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      const hue = cell.glow > 0.6 ? 0.45 : 0.55;
      ref.current!.setColorAt(i, new THREE.Color().setHSL(hue, 0.9, 0.45 + cell.glow * 0.3));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [cells, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

// ── Particle Volume System — energy flow + sweep explosion ─────────────────
export function VolumeParticles({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const COUNT = 650;
  const ref = useRef<THREE.Points>(null);
  const scale = useMemo(() => buildScale(candles, snapshot.paths, snapshot.monteCarlo), [candles, snapshot.paths, snapshot.monteCarlo]);
  const curve = useMemo(() => {
    const pts = candles.map((c, i) => new THREE.Vector3(scale.x(i), scale.y(c.c), 0.1));
    return pts.length > 3 ? new THREE.CatmullRomCurve3(pts) : null;
  }, [candles, scale]);

  const seeds = useMemo(() => {
    const arr = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 4] = Math.random(); // u along curve
      arr[i * 4 + 1] = (Math.random() - 0.5) * 2.4; // jitter radius
      arr[i * 4 + 2] = 0.04 + Math.random() * 0.25; // speed
      arr[i * 4 + 3] = Math.random() * Math.PI * 2; // phase
    }
    return arr;
  }, []);

  const sweep = snapshot.sweeps[0];
  const sweepEnergy = sweep ? Math.max(0, 1 - (Date.now() - sweep.t) / 9000) * sweep.intensity : 0;

  useFrame(({ clock }) => {
    const points = ref.current;
    if (!points || !curve) return;
    const pos = points.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      let u = (seeds[i * 4] + t * seeds[i * 4 + 2] * 0.06) % 1;
      const p = curve.getPointAt(u);
      const phase = seeds[i * 4 + 3];
      const jitter = seeds[i * 4 + 1];
      const explode = sweepEnergy * Math.pow(u, 3) * 2.4;
      pos.setXYZ(
        i,
        p.x,
        p.y + Math.sin(t * 2 + phase) * 0.12 + jitter * (0.4 + explode),
        p.z + Math.cos(t * 2 + phase) * 0.18 + explode * 0.4,
      );
    }
    pos.needsUpdate = true;
    const mat = points.material as THREE.PointsMaterial;
    mat.opacity = 0.35 + sweepEnergy * 0.55;
    mat.size = 0.07 + sweepEnergy * 0.12;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(COUNT * 3), 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={sweepEnergy > 0.4 ? (sweep?.side === 'buyside' ? '#ff5470' : '#2dffb0') : '#38e8ff'}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        size={0.08}
      />
    </points>
  );
}

// ── Dark-pool purple nebula ────────────────────────────────────────────────
export function DarkNebula({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const scale = useMemo(() => buildScale(candles, snapshot.paths, snapshot.monteCarlo), [candles, snapshot.paths, snapshot.monteCarlo]);
  const mapped = useMemo(() => mapDarkZones(snapshot.darkZones, scale, candles), [snapshot.darkZones, scale, candles]);
  return (
    <group>
      {mapped.map((z, i) => (
        <mesh key={z.id} position={z.position}>
          <sphereGeometry args={[0.35 + z.intensity * 0.45, 20, 20]} />
          <meshBasicMaterial color="#c06bff" transparent opacity={0.1 + z.intensity * 0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Time Machine neon vector streams ───────────────────────────────────────
export function TimePaths({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const scale = useMemo(() => buildScale(candles, snapshot.paths, snapshot.monteCarlo), [candles, snapshot.paths, snapshot.monteCarlo]);
  const n = candles.length;
  return (
    <group>
      {snapshot.paths.map((path) => {
        const color = PATH_COLOR[path.id];
        const pts = path.points.map((pt, i) => {
          const x = scale.x(n - 1) + ((i + 1) / path.points.length) * (CHART_W / 2.4);
          return [x, scale.y(pt.price), 0.15] as [number, number, number];
        });
        const last = pts[pts.length - 1];
        return (
          <group key={path.id}>
            <Line points={pts} color={color} lineWidth={3} transparent opacity={0.85} dashed={false} />
            <Line points={pts} color={color} lineWidth={10} transparent opacity={0.12} />
            <Html position={last} center distanceFactor={16} zIndexRange={[10, 0]}>
              <div
                className="px-2.5 py-1 rounded-full text-[0.68rem] font-mono whitespace-nowrap"
                style={{
                  color,
                  border: `1px solid ${color}66`,
                  background: 'rgba(5,8,16,0.72)',
                  boxShadow: `0 0 16px ${color}44`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                PATH {path.id} · {path.probability.toFixed(1)}%
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ── Dimensional Wormhole — 5M / 15M / 1H stacked layers + laser beam ───────
export function WormholeLayers({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const scale = useMemo(() => buildScale(candles, snapshot.paths, null), [candles, snapshot.paths]);
  const beamRef = useRef<THREE.Mesh>(null);
  const layers = useMemo(() => {
    const make = (smooth: number, z: number, label: string) => {
      const pts: [number, number, number][] = [];
      candles.forEach((c, i) => {
        const from = Math.max(0, i - smooth);
        const avg = candles.slice(from, i + 1).reduce((a, x) => a + x.c, 0) / (i - from + 1);
        pts.push([scale.x(i), scale.y(avg), z]);
      });
      return { pts, z, label };
    };
    return [make(0, -3.2, '5M'), make(3, 0, '15M'), make(9, 3.2, '1H')];
  }, [candles, scale]);

  const aligned = snapshot.confluenceScore > 62;
  const beamX = scale.x(candles.length - 14);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = aligned ? 0.35 + Math.sin(clock.elapsedTime * 6) * 0.2 : 0.05;
      const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.25;
      beamRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group>
      {layers.map((l) => (
        <group key={l.label}>
          <Grid
            position={[0, 0, l.z - 0.1]}
            args={[CHART_W, CHART_H + 2]}
            cellSize={1.1}
            cellThickness={0.4}
            cellColor="#16305c"
            sectionSize={3.3}
            sectionThickness={0.8}
            sectionColor="#2a5aa8"
            fadeDistance={30}
            fadeStrength={1.5}
          />
          <Line points={l.pts} color="#4d7dff" lineWidth={1.6} transparent opacity={l.z === 0 ? 0.85 : 0.4} />
          <Html position={[-CHART_W / 2 - 0.4, CHART_H / 2 + 0.5, l.z]} center distanceFactor={18}>
            <span className="text-[0.6rem] tracking-[0.3em] dim font-mono">{l.label}</span>
          </Html>
        </group>
      ))}
      {aligned && (
        <mesh ref={beamRef} position={[beamX, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 11, 16, 1, true]} />
          <meshBasicMaterial color="#2dffb0" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ── 3D Monte Carlo neural tree ─────────────────────────────────────────────
export function MonteCarloTree({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const mc = snapshot.monteCarlo;
  const scale = useMemo(() => buildScale(candles, [], mc), [candles, mc]);
  const n = candles.length;
  const bandLines = useMemo(() => {
    if (!mc) return [];
    const keys: ('p5' | 'p25' | 'p50' | 'p75' | 'p95')[] = ['p5', 'p25', 'p50', 'p75', 'p95'];
    return keys.map((key) =>
      mc.bands.map((b, i) => {
        const x = scale.x(n - 1) + ((i + 1) / mc.steps) * (CHART_W / 2.4);
        return [x, scale.y(b[key]), 0.1] as [number, number, number];
      }),
    );
  }, [mc, scale, n]);
  const filaments = useMemo(() => {
    if (!mc) return [];
    return mc.filaments.slice(0, 10).map((path) =>
      path.map((pt, i) => {
        const x = scale.x(n - 1) + ((i + 1) / path.length) * (CHART_W / 2.4);
        return [x, scale.y(pt.price), 0.12] as [number, number, number];
      }),
    );
  }, [mc, scale, n]);
  if (!mc) return null;
  return (
    <group>
      {bandLines.map((pts, i) => (
        <Line key={i} points={pts} color={i === 2 ? '#38e8ff' : '#2f6fc4'} lineWidth={i === 2 ? 2.4 : 1} transparent opacity={i === 2 ? 0.8 : 0.28} />
      ))}
      {filaments.map((pts, i) => (
        <Line key={`f${i}`} points={pts} color="#9d6bff" lineWidth={0.8} transparent opacity={0.4} />
      ))}
    </group>
  );
}

// ── Sweep wave markers ─────────────────────────────────────────────────────
export function SweepMarkers({ snapshot, candles }: { snapshot: BrainSnapshot; candles: ReturnType<typeof visibleCandles> }) {
  const scale = useMemo(() => buildScale(candles, snapshot.paths, snapshot.monteCarlo), [candles, snapshot.paths, snapshot.monteCarlo]);
  const mapped = useMemo(() => mapSweeps(snapshot.sweeps, scale, candles), [snapshot.sweeps, scale, candles]);
  return (
    <group>
      {mapped.map((s) => (
        <mesh key={s.id} position={s.position}>
          <ringGeometry args={[0.16, 0.24, 28]} />
          <meshBasicMaterial color={s.side === 'buyside' ? '#ff5470' : '#2dffb0'} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
