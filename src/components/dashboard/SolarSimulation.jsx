import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { Layers } from 'lucide-react';

export function SolarSimulation() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { activeRegions, demoActive, activeAlert } = useStore();
  const [filterMode, setFilterMode] = useState('AIA'); // AIA, HEL1OS, SoLEXS
  const [isDraggingState, setIsDraggingState] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // --- RENDERER SETUP ---
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true, // Transparent background to show NASA image behind
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 2.8;

    // --- SUN MESH (Invisible Occluder) ---
    // colorWrite: false makes the sphere invisible but it STILL writes to the depth buffer!
    // This correctly hides markers when they rotate to the back of the sun.
    const sunGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);

    // --- CORONA GLOW ---
    const coronaCanvas = document.createElement('canvas');
    coronaCanvas.width = 256;
    coronaCanvas.height = 256;
    const ctx = coronaCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255,180,50,0)');
    gradient.addColorStop(0.3, 'rgba(255,180,50,0)');
    gradient.addColorStop(0.5, 'rgba(255,120,20,0.15)');
    gradient.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const coronaTexture = new THREE.CanvasTexture(coronaCanvas);
    const coronaMaterial = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coronaSprite = new THREE.Sprite(coronaMaterial);
    coronaSprite.scale.set(3.2, 3.2, 1);
    scene.add(coronaSprite);

    // --- ACTIVE REGION MARKERS ---
    const arMarkers = [];
    const hardcodedARs = [
      { id: 'AR4478', lat: -6, lon: -52, mag: 'Beta-Gamma-Delta', area: 640 },
      { id: 'AR4475', lat: -9, lon: -21, mag: 'Beta', area: 210 },
      { id: 'AR4473', lat: -14, lon: 35, mag: 'Alpha', area: 120 },
      { id: 'AR4476', lat: 8, lon: 3, mag: 'Beta-Gamma', area: 50 }
    ];
    const ars = activeRegions && activeRegions.length > 0 ? activeRegions : hardcodedARs;

    const helioTo3D = (lat_deg, lon_deg, radius = 1.02) => {
      const lat = (lat_deg * Math.PI) / 180;
      const lon = (lon_deg * Math.PI) / 180;
      return new THREE.Vector3(
        radius * Math.cos(lat) * Math.sin(lon),
        radius * Math.sin(lat),
        radius * Math.cos(lat) * Math.cos(lon)
      );
    };

    ars.forEach((ar) => {
      let lat = ar.lat || 0;
      let lon = ar.lon || 0;
      if (typeof ar.location === 'string' || typeof ar.coordinate === 'string') {
        const locStr = ar.location || ar.coordinate;
        const m = locStr.match(/([NS])(\d+)([EW])(\d+)/);
        if (m) {
          lat = (m[1] === 'N' ? 1 : -1) * parseInt(m[2], 10);
          lon = (m[3] === 'W' ? 1 : -1) * parseInt(m[4], 10);
        }
      }
      
      let color = 0x00ff00; // C-class (green)
      if (ar.area > 200) color = 0xff8800; // M-class (orange)
      if (ar.area > 400 || (ar.mag && ar.mag.includes('Delta'))) color = 0xff0000; // X-class (red)
      
      const markerGeom = new THREE.SphereGeometry(0.025, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: color });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      
      marker.position.copy(helioTo3D(lat, lon));
      sunMesh.add(marker);
      arMarkers.push({ mesh: marker, geom: markerGeom, mat: markerMat });
    });

    // --- PARTICLE FIELD (Solar Wind) ---
    const particleCount = 500;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const r = 1.06 + Math.random() * 1.44; // 1.06 to 2.5
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
      
      particleVelocities[i] = 0.002 + Math.random() * 0.005;
    }
    
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.008,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(particleGeom, particleMat);
    scene.add(particleSystem);

    // --- INTERACTION ---
    const isDragging = { current: false };
    const prevMouse = { current: { x: 0, y: 0 } };
    const rotation = { current: { x: 0.3, y: 0 } };

    const onPointerDown = (e) => {
      isDragging.current = true;
      setIsDraggingState(true);
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      prevMouse.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - prevMouse.current.x;
      const deltaY = clientY - prevMouse.current.y;
      
      rotation.current.y += deltaX * 0.005;
      rotation.current.x += deltaY * 0.005;
      
      // Clamp X rotation (vertical)
      rotation.current.x = Math.max(-1.2, Math.min(1.2, rotation.current.x));
      
      prevMouse.current = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDragging.current = false;
      setIsDraggingState(false);
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    
    container.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // --- RESIZE ---
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // --- ANIMATION LOOP ---
    let animFrameRef;
    let isVisible = true;

    const onVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const animate = () => {
      animFrameRef = requestAnimationFrame(animate);
      if (!isVisible) return;

      if (!isDragging.current) {
        rotation.current.y += 0.0008; // Auto rotate
      }
      
      sunMesh.rotation.x = rotation.current.x;
      sunMesh.rotation.y = rotation.current.y;

      // Animate particles
      const positions = particleGeom.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        
        let x = positions[ix];
        let y = positions[iy];
        let z = positions[iz];
        
        const r = Math.sqrt(x*x + y*y + z*z);
        const newR = r + particleVelocities[i];
        
        if (newR > 2.5) {
          // Reset to inner shell
          const resetR = 1.06;
          positions[ix] = (x / r) * resetR;
          positions[iy] = (y / r) * resetR;
          positions[iz] = (z / r) * resetR;
        } else {
          const ratio = newR / r;
          positions[ix] *= ratio;
          positions[iy] *= ratio;
          positions[iz] *= ratio;
        }
      }
      particleGeom.attributes.position.needsUpdate = true;
      
      // Face camera for corona sprite
      coronaSprite.lookAt(camera.position);

      renderer.render(scene, camera);
    };
    
    animate();

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animFrameRef);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      renderer.dispose();
      sunGeometry.dispose();
      sunMaterial.dispose();
      coronaTexture.dispose();
      coronaMaterial.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      
      arMarkers.forEach(m => {
        m.geom.dispose();
        m.mat.dispose();
      });
    };
  }, [activeRegions]); // Re-run if ARs change significantly

  // --- MULTI-WAVELENGTH FILTERS (CSS based) ---
  const getFilterStyle = () => {
    if (filterMode === 'SoLEXS') return 'hue-rotate(160deg) saturate(1.5)';
    if (filterMode === 'HEL1OS') return 'hue-rotate(220deg) saturate(1.2) brightness(0.8)';
    return 'none';
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border-border-emphasis bg-[#01050A]" p={0}>
      <div className="px-3 py-2 flex justify-between items-center bg-panel-gradient border-b border-border-subtle shrink-0 relative z-20">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-accent-orange" />
          <h3 className="font-header text-[11px] tracking-[0.15em] font-bold text-text-primary uppercase">
            SOLAR DISK OBSERVATION (3D)
          </h3>
        </div>
        
        {/* Optical Filters Toggle */}
        <div className="flex bg-[#020B18] border border-border-subtle rounded px-1 py-0.5 gap-0.5">
          {['AIA', 'HEL1OS', 'SoLEXS'].map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`font-mono text-[9px] px-2 py-0.5 rounded transition-colors uppercase ${
                filterMode === mode 
                  ? 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#071E3D]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div 
        ref={containerRef} 
        className={`flex-1 w-full relative overflow-hidden bg-black ${isDraggingState ? 'cursor-grabbing' : 'cursor-grab'}`} 
        style={{ minHeight: '200px' }}
      >
        {/* Real NASA Background Image Overlay */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
          style={{
            filter: getFilterStyle(),
            transition: 'filter 0.6s ease',
            mixBlendMode: 'screen',
            opacity: 0.85
          }}
        >
          <img 
            src="https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg" 
            alt="NASA SDO AIA"
            className="pointer-events-none rounded-full object-cover"
            style={{ height: '86.2%', aspectRatio: '1/1' }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Three.js Canvas (Transparent Occluder + Glow + Markers) */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full block z-10"
          style={{
            filter: getFilterStyle(),
            transition: 'filter 0.6s ease'
          }}
        />
        
        <div className="absolute top-2 left-2 pointer-events-none font-mono text-[10px] text-text-secondary/70 z-20">
          Drag to rotate · Real NASA SDO texture
        </div>
      </div>

      <div className={`px-3 py-1.5 border-t border-border-subtle shrink-0 font-telemetry text-[10px] tracking-wider uppercase transition-colors z-20 relative ${
        demoActive ? 'bg-alert-gradient text-accent-red border-t-accent-red/50' : 'bg-panel-gradient text-accent-amber'
      }`}>
        {demoActive ? (
          <span>
            ⚡ M5.2 FLARE ONSET DETECTED · AR4478 S06E52 · ADITYA-L1 PAYLOADS TRIGGERED
          </span>
        ) : (
          <span>
            AR4478 · S06E52 · BETA-GAMMA-DELTA · M-CLASS: 45% · X-CLASS: 20%
          </span>
        )}
      </div>
    </Card>
  );
}

