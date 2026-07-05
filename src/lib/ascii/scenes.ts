import * as THREE from 'three';
import type { AsciiScene } from './renderer';
import type { PourStyle } from '../recipes';

/**
 * Scene builders for the ASCII renderer. All scenes render in deep-violet ink
 * (the renderer maps luminance to glyphs); geometry is built bright-on-dark so
 * the luminance ramp produces the character density. Honey Gold never appears.
 *
 * Scenes are intentionally low-poly: they are sampled down to a character grid,
 * so detail beyond ~80x60 cells is wasted work.
 */

const INK = 0xffffff; // bright so luminance ramp is dense; renderer colors glyphs with --ink

function disposeObjects(scene: THREE.Scene) {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) (mat as THREE.Material).dispose();
  });
}

/* ───────────────────────── Hero: V60 cone + spiral pour ───────────────────────── */

export function heroScene(): AsciiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.12, 5.75);
  camera.lookAt(0, 0.14, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Classic V60 profile: open 60-degree cone, taller than it is wide.
  const coneRadius = 1.15;
  const coneHeight = 1.98;
  const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 36, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: INK,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.rotation.x = Math.PI; // open end up
  cone.position.y = -0.08;
  group.add(cone);

  // V60 ribs — radial grooves down the cone wall.
  const ribGroup = new THREE.Group();
  const ribMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.32,
  });
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const top = new THREE.Vector3(Math.cos(angle) * coneRadius * 0.94, -0.08 + coneHeight / 2, Math.sin(angle) * coneRadius * 0.94);
    const lower = new THREE.Vector3(Math.cos(angle) * 0.16, -0.08 - coneHeight / 2 + 0.12, Math.sin(angle) * 0.16);
    const ribGeo = new THREE.BufferGeometry().setFromPoints([top, lower]);
    ribGroup.add(new THREE.Line(ribGeo, ribMat));
  }
  group.add(ribGroup);

  // Top rim — stronger ellipse so the brewer silhouette reads at ASCII scale.
  const rimGeo = new THREE.TorusGeometry(coneRadius, 0.012, 6, 64);
  const rimMat = new THREE.MeshBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.66,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.08 + coneHeight / 2;
  group.add(rim);

  // Drip tip — a small bright point at the apex.
  const tipGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const tipMat = new THREE.MeshBasicMaterial({ color: INK });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(0, -0.08 - coneHeight / 2, 0);
  group.add(tip);

  // Brewer base — a quiet stand under the cone so the V60 feels grounded.
  const baseY = -0.08 - coneHeight / 2 - 0.16;
  const baseMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.58,
  });
  const baseRingGeo = new THREE.TorusGeometry(0.82, 0.026, 8, 72);
  const baseRing = new THREE.Mesh(baseRingGeo, new THREE.MeshBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.52,
    depthTest: false,
  }));
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = baseY;
  group.add(baseRing);

  const pedestalGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.34, baseY + 0.14, 0),
    new THREE.Vector3(-0.52, baseY, 0),
    new THREE.Vector3(0.52, baseY, 0),
    new THREE.Vector3(0.34, baseY + 0.14, 0),
  ]);
  group.add(new THREE.Line(pedestalGeo, baseMat));

  const contactShadowGeo = new THREE.RingGeometry(0.22, 0.86, 56);
  const contactShadow = new THREE.Mesh(
    contactShadowGeo,
    new THREE.MeshBasicMaterial({
      color: INK,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.z = 0.34;
  contactShadow.position.y = baseY - 0.04;
  group.add(contactShadow);

  // Water stream — particles start on the top rim and spiral inward across the bed.
  const dropCount = 48;
  const dropPositions = new Float32Array(dropCount * 3);
  const dropSeeds = new Float32Array(dropCount);
  for (let i = 0; i < dropCount; i++) {
    dropSeeds[i] = i / dropCount;
  }
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
  const dropMat = new THREE.PointsMaterial({
    color: INK,
    size: 0.09,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
  });
  const drops = new THREE.Points(dropGeo, dropMat);
  group.add(drops);

  // A faint descending spiral makes the water path legible in ASCII.
  const traceSegments = 96;
  const tracePositions = new Float32Array((traceSegments + 1) * 3);
  const traceGeo = new THREE.BufferGeometry();
  traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePositions, 3));
  const traceMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.24,
  });
  const spiralTrace = new THREE.Line(traceGeo, traceMat);
  group.add(spiralTrace);

  // A short inlet stroke makes the pour read as falling from above.
  const inletPositions = new Float32Array(6);
  const inletGeo = new THREE.BufferGeometry();
  inletGeo.setAttribute('position', new THREE.BufferAttribute(inletPositions, 3));
  const inletMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.42,
  });
  const inlet = new THREE.Line(inletGeo, inletMat);
  group.add(inlet);

  // Coffee bed — a thin disc at the cone opening.
  const bedGeo = new THREE.RingGeometry(0.08, coneRadius * 0.88, 36);
  const bedMat = new THREE.MeshBasicMaterial({
    color: INK,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.18,
  });
  const bed = new THREE.Mesh(bedGeo, bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -0.08 + coneHeight / 2 - 0.04;
  group.add(bed);

  let pointerX = 0;
  let pointerY = 0;

  function update(_dt: number, elapsed: number) {
    group.rotation.y = elapsed * 0.22 + pointerX * 0.28;
    group.rotation.x = pointerY * 0.12;

    const pos = drops.geometry.getAttribute('position') as THREE.BufferAttribute;
    const rimY = -0.08 + coneHeight / 2;
    const top = rimY + 0.68;
    const bottom = rimY - 0.08;
    const streamAngle = elapsed * 1.05;
    const streamTurns = Math.PI * 2.8;

    const inletPos = inlet.geometry.getAttribute('position') as THREE.BufferAttribute;
    const entryRadius = coneRadius * 0.68;
    const entryX = Math.cos(streamAngle) * entryRadius;
    const entryZ = Math.sin(streamAngle) * entryRadius;
    inletPos.setXYZ(0, entryX * 0.72, top + 0.34, entryZ * 0.72);
    inletPos.setXYZ(1, entryX, top, entryZ);
    inletPos.needsUpdate = true;

    const tracePos = spiralTrace.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i <= traceSegments; i++) {
      const p = i / traceSegments;
      const r = coneRadius * 0.68 * (1 - p * 0.78);
      const y = top - (top - bottom) * p;
      const angle = streamAngle + p * streamTurns;
      tracePos.setXYZ(i, Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
    tracePos.needsUpdate = true;

    for (let i = 0; i < dropCount; i++) {
      const seed = dropSeeds[i];
      const t = (seed + elapsed * 0.18) % 1;
      const y = top - (top - bottom) * t;
      // The water stream itself spirals downward and contracts into the bed.
      const radius = coneRadius * 0.68 * (1 - t * 0.78);
      const angle = streamAngle + t * streamTurns;
      pos.setXYZ(i, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
    pos.needsUpdate = true;
  }

  function onPointer(nx: number, ny: number) {
    pointerX = nx;
    pointerY = ny;
  }

  function dispose() {
    disposeObjects(scene);
  }

  return { scene, camera, update, onPointer, dispose };
}

/* ───────────────────────── Pour-phase scenes ───────────────────────── */

const POUR_BED_RADIUS = 0.82;

function makeLine(positions: Float32Array, opacity: number): THREE.Line {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity,
  });
  return new THREE.Line(geo, mat);
}

function makePoints(positions: Float32Array, size: number, opacity: number): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: INK,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
  });
  return new THREE.Points(geo, mat);
}

/** Build a static spiral line from center outward. */
function spiralPath(segments: number, maxRadius: number, turns: number): Float32Array {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const r = maxRadius * t;
    const a = t * Math.PI * 2 * turns;
    pts[i * 3] = Math.cos(a) * r;
    pts[i * 3 + 1] = Math.sin(a) * r;
    pts[i * 3 + 2] = 0;
  }
  return pts;
}

/** Build a static circle outline. */
function circlePath(segments: number, radius: number): Float32Array {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts[i * 3] = Math.cos(a) * radius;
    pts[i * 3 + 1] = Math.sin(a) * radius;
    pts[i * 3 + 2] = 0;
  }
  return pts;
}

export function pourScene(style: PourStyle): AsciiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 10);
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);

  // Coffee bed — faint filled disc.
  const bedGeo = new THREE.CircleGeometry(POUR_BED_RADIUS, 32);
  const bedMat = new THREE.MeshBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.08,
  });
  const bed = new THREE.Mesh(bedGeo, bedMat);
  scene.add(bed);

  // Bed rim — circle outline.
  const rimLine = makeLine(circlePath(48, POUR_BED_RADIUS), 0.35);
  scene.add(rimLine);

  // Active pour head — bright moving point(s).
  const headCount = 6;
  const headPositions = new Float32Array(headCount * 3);
  const head = makePoints(headPositions, 0.08, 0.95);
  scene.add(head);

  // Style-specific gesture geometry and animation.
  let update: (_dt: number, elapsed: number) => void;

  if (style === 'spiral') {
    // Static spiral path from center outward.
    const spiralLine = makeLine(spiralPath(80, POUR_BED_RADIUS * 0.92, 2.5), 0.25);
    scene.add(spiralLine);

    update = (_dt, elapsed) => {
      const pos = head.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < headCount; i++) {
        const offset = (i / headCount);
        const t = (offset + elapsed * 0.15) % 1;
        const r = POUR_BED_RADIUS * 0.92 * t;
        const a = t * Math.PI * 2 * 2.5;
        pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, 0);
      }
      pos.needsUpdate = true;
    };
  } else if (style === 'circular') {
    // Two concentric ring outlines.
    const ring1 = makeLine(circlePath(48, POUR_BED_RADIUS * 0.72), 0.22);
    const ring2 = makeLine(circlePath(48, POUR_BED_RADIUS * 0.38), 0.22);
    scene.add(ring1, ring2);

    update = (_dt, elapsed) => {
      const pos = head.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < headCount; i++) {
        const ring = i < 3 ? POUR_BED_RADIUS * 0.72 : POUR_BED_RADIUS * 0.38;
        const speed = i < 3 ? 0.8 : 1.2;
        const a = (i / headCount) * Math.PI * 2 + elapsed * speed;
        pos.setXYZ(i, Math.cos(a) * ring, Math.sin(a) * ring, 0);
      }
      pos.needsUpdate = true;
    };
  } else if (style === 'center') {
    // Vertical water stream from top to center.
    const streamSegs = 12;
    const streamPts = new Float32Array((streamSegs + 1) * 3);
    for (let i = 0; i <= streamSegs; i++) {
      const t = i / streamSegs;
      streamPts[i * 3] = 0;
      streamPts[i * 3 + 1] = 1.0 - t * 1.0; // from y=1.0 down to y=0
      streamPts[i * 3 + 2] = 0;
    }
    const streamLine = makeLine(streamPts, 0.3);
    scene.add(streamLine);

    // Central pool — small filled circle.
    const poolGeo = new THREE.CircleGeometry(0.12, 16);
    const poolMat = new THREE.MeshBasicMaterial({
      color: INK,
      transparent: true,
      opacity: 0.3,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    scene.add(pool);

    update = (_dt, elapsed) => {
      const pos = head.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < headCount; i++) {
        const t = ((i / headCount) + elapsed * 0.4) % 1;
        // Drops falling along the stream with slight jitter.
        const y = 1.0 - t * 1.0;
        const jitter = Math.sin(elapsed * 3 + i) * 0.015;
        pos.setXYZ(i, jitter, y, 0);
      }
      pos.needsUpdate = true;
      // Pool pulses gently.
      const s = 1 + Math.sin(elapsed * 2) * 0.12;
      pool.scale.set(s, s, 1);
    };
  } else {
    // swirl — rotation arcs around the bed.
    const arcSegs = 20;
    const buildArc = (radius: number, startA: number, sweep: number) => {
      const pts = new Float32Array((arcSegs + 1) * 3);
      for (let i = 0; i <= arcSegs; i++) {
        const t = i / arcSegs;
        const a = startA + t * sweep;
        pts[i * 3] = Math.cos(a) * radius;
        pts[i * 3 + 1] = Math.sin(a) * radius;
        pts[i * 3 + 2] = 0;
      }
      return pts;
    };
    const arc1 = makeLine(buildArc(POUR_BED_RADIUS * 0.85, 0, Math.PI * 0.6), 0.3);
    const arc2 = makeLine(buildArc(POUR_BED_RADIUS * 0.85, Math.PI, Math.PI * 0.6), 0.3);
    const arcGroup = new THREE.Group();
    arcGroup.add(arc1, arc2);
    scene.add(arcGroup);

    // Inner swirl circles.
    const innerRing = makeLine(circlePath(32, POUR_BED_RADIUS * 0.3), 0.2);
    scene.add(innerRing);

    update = (_dt, elapsed) => {
      arcGroup.rotation.z = elapsed * 0.8;
      innerRing.rotation.z = -elapsed * 1.2;
      const pos = head.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < headCount; i++) {
        const a = (i / headCount) * Math.PI * 2 + elapsed * 0.8;
        const r = POUR_BED_RADIUS * 0.85;
        pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, 0);
      }
      pos.needsUpdate = true;
    };
  }

  function dispose() {
    disposeObjects(scene);
  }

  return { scene, camera, update, dispose };
}

/* ───────────────────────── Ambient steam field ───────────────────────── */

export function ambientScene(): AsciiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(0, 0, 4);

  const count = 60;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: INK,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  function update(_dt: number, elapsed: number) {
    const pos = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const sx = seeds[i * 3];
      const sy = seeds[i * 3 + 1];
      const speed = 0.04 + sy * 0.05;
      const y = ((sy + elapsed * speed) % 1) * 2 - 1;
      const drift = Math.sin(elapsed * 0.3 + sx * 6) * 0.15;
      const x = (sx * 2 - 1) + drift;
      pos.setXYZ(i, x, y, 0);
    }
    pos.needsUpdate = true;
  }

  function dispose() {
    disposeObjects(scene);
  }

  return { scene, camera, update, dispose };
}
