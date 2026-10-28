import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import type { MascotMood } from '../../engine/types';
import { MOOD_META } from './moods';

function Falcon({ mood }: { mood: MascotMood }) {
  const root = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const lidL = useRef<THREE.Mesh>(null);
  const lidR = useRef<THREE.Mesh>(null);
  const tear = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const spin = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (!root.current) return;

    // Base levitation — celebrating gets a happy hop, sleeping drifts slowly
    const hop = mood === 'celebrating' ? Math.abs(Math.sin(t * 5)) * 0.35 : 0;
    root.current.position.y = Math.sin(t * (mood === 'sleeping' ? 0.8 : 1.6)) * (mood === 'sleeping' ? 0.08 : 0.18) + hop;

    // Mood posture — sad/zen slouch, angry/alert lean forward
    const targetRotX = mood === 'angry' ? 0.3 : mood === 'sad' ? 0.18 : mood === 'zen' ? 0.05 : mood === 'alert' ? 0.12 : 0.06;
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, targetRotX, delta * 3);
    const targetLean = mood === 'sad' ? 0.12 : mood === 'thinking' ? -0.22 : 0;
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, targetLean, delta * 3);

    // Happy / celebrating victory spin
    if (mood === 'happy' || mood === 'celebrating') spin.current += delta * (mood === 'celebrating' ? 6.5 : 4.2);
    root.current.rotation.y = mood === 'happy' || mood === 'celebrating' ? spin.current : Math.sin(t * 0.5) * 0.25;

    // Wing articulation
    const flap =
      mood === 'celebrating' ? Math.sin(t * 16) * 1.1
      : mood === 'happy' ? Math.sin(t * 14) * 0.9
      : mood === 'sleeping' ? 0.15
      : mood === 'sad' ? 0.28
      : mood === 'zen' ? 0.5
      : Math.sin(t * 2.2) * 0.22 + 0.35;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;

    // Head behaviour — alert scans fast, thinking tilts, sleeping droops
    if (head.current) {
      head.current.rotation.y = mood === 'alert' ? Math.sin(t * 6) * 0.5 : mood === 'thinking' ? 0.35 : Math.sin(t * 0.8) * 0.18;
      head.current.rotation.x = mood === 'sleeping' ? 0.4 : mood === 'sad' ? 0.22 : 0;
    }

    // Eye glow + eyelid closure (sleeping shut, sad half-droop, zen soft)
    const eyeColor = new THREE.Color(MOOD_META[mood].color);
    const lidClose = mood === 'sleeping' ? 1 : mood === 'sad' ? 0.55 : mood === 'zen' ? 0.35 : mood === 'thinking' ? 0.2 : 0.05;
    for (const [eye, lid] of [[eyeL, lidL], [eyeR, lidR]] as const) {
      if (eye.current) {
        const mat = eye.current.material as THREE.MeshStandardMaterial;
        mat.color.copy(eyeColor);
        mat.emissive.copy(eyeColor);
        mat.emissiveIntensity = mood === 'angry' ? 2.2 + Math.sin(t * 10) * 1.4 : mood === 'sleeping' ? 0.15 : 1.6 + Math.sin(t * 3) * 0.4;
        eye.current.scale.y = mood === 'sleeping' ? 0.08 : 1;
      }
      if (lid.current) lid.current.scale.y = THREE.MathUtils.lerp(lid.current.scale.y, lidClose, delta * 6);
    }

    // Sad tear — falls and resets
    if (tear.current) {
      const visible = mood === 'sad';
      tear.current.visible = visible;
      if (visible) {
        const cycle = (t * 0.9) % 1;
        tear.current.position.y = 0.02 - cycle * 0.42;
        tear.current.position.x = -0.13;
        tear.current.position.z = 0.34;
        (tear.current.material as THREE.MeshBasicMaterial).opacity = 1 - cycle;
      }
    }

    if (halo.current) {
      halo.current.rotation.z = t * 0.4;
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      mat.color.set(MOOD_META[mood].color);
      mat.opacity = mood === 'sleeping' ? 0.15 : 0.5 + Math.sin(t * 2) * 0.15;
    }
  });

  const metal = useMemo(() => ({ color: '#18233f', metalness: 0.85, roughness: 0.28 }), []);

  return (
    <group ref={root}>
      {/* Torso */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.7, 8, 18]} />
        <meshStandardMaterial {...metal} emissive="#0c1830" emissiveIntensity={0.6} />
      </mesh>
      {/* Chest core */}
      <mesh position={[0, 0.05, 0.36]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color={MOOD_META[mood].color} emissive={MOOD_META[mood].color} emissiveIntensity={2} />
      </mesh>
      {/* Head */}
      <group ref={head} position={[0, 0.62, 0.05]}>
        <mesh>
          <sphereGeometry args={[0.34, 24, 24]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        {/* Falcon beak */}
        <mesh position={[0, -0.08, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.09, 0.28, 16]} />
          <meshStandardMaterial color="#38e8ff" metalness={0.6} roughness={0.3} emissive="#0e5b70" emissiveIntensity={0.8} />
        </mesh>
        {/* Eyes */}
        <mesh ref={eyeL} position={[-0.13, 0.06, 0.3]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color={MOOD_META[mood].color} emissive={MOOD_META[mood].color} emissiveIntensity={1.8} />
        </mesh>
        <mesh ref={eyeR} position={[0.13, 0.06, 0.3]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color={MOOD_META[mood].color} emissive={MOOD_META[mood].color} emissiveIntensity={1.8} />
        </mesh>
        {/* Eyelids (body-coloured shells that slide over the eyes) */}
        <mesh ref={lidL} position={[-0.13, 0.06, 0.315]} scale={[1, 0.05, 1]}>
          <sphereGeometry args={[0.072, 14, 14]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh ref={lidR} position={[0.13, 0.06, 0.315]} scale={[1, 0.05, 1]}>
          <sphereGeometry args={[0.072, 14, 14]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        {/* Tear */}
        <mesh ref={tear} visible={false} position={[-0.13, 0.02, 0.34]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshBasicMaterial color="#6fb3ff" transparent opacity={0.9} />
        </mesh>
        {/* Crest fins */}
        <mesh position={[0, 0.34, -0.05]} rotation={[0.3, 0, 0]}>
          <coneGeometry args={[0.08, 0.3, 12]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      </group>
      {/* Wings */}
      <mesh ref={wingL} position={[-0.42, 0.1, -0.02]}>
        <boxGeometry args={[0.95, 0.08, 0.42]} />
        <meshStandardMaterial {...metal} emissive="#123055" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={wingR} position={[0.42, 0.1, -0.02]}>
        <boxGeometry args={[0.95, 0.08, 0.42]} />
        <meshStandardMaterial {...metal} emissive="#123055" emissiveIntensity={0.5} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, -0.62, -0.18]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.16, 0.5, 14]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      {/* Halo */}
      <mesh ref={halo} position={[0, 0.1, -0.35]}>
        <torusGeometry args={[0.85, 0.025, 12, 60]} />
        <meshBasicMaterial color={MOOD_META[mood].color} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function MoodParticles({ mood }: { mood: MascotMood }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 110;
  const seeds = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 3;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * (mood === 'angry' ? 1.6 : mood === 'celebrating' ? 2.4 : 0.5);
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.color.set(MOOD_META[mood].color);
    mat.opacity = mood === 'sleeping' ? 0.15 : 0.55;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[seeds, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export function FalconMascot({ mood, height = 250 }: { mood: MascotMood; height?: number }) {
  return (
    <div style={{ height }} className="relative">
      <Canvas camera={{ position: [0, 0.4, 4.2], fov: 42 }} dpr={[1, 1.8]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 4]} intensity={1.4} color="#38e8ff" />
        <pointLight position={[-3, -2, 3]} intensity={0.8} color="#9d6bff" />
        <Float speed={mood === 'sleeping' ? 0.8 : 2} rotationIntensity={0.25} floatIntensity={0.5}>
          <Falcon mood={mood} />
        </Float>
        <MoodParticles mood={mood} />
      </Canvas>
    </div>
  );
}
