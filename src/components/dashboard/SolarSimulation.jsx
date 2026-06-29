import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { SolarParticles } from './SolarParticles';
import { Layers } from 'lucide-react';

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFilterMode; // 0.0=AIA, 1.0=SoLEXS, 2.0=HEL1OS
  uniform float uDemoActive;
  uniform vec3 uActiveRegions[4];
  uniform float uARIntensities[4];
  uniform float uAspect;
  uniform sampler2D uSdoTexture;
  uniform float uUseSdoTexture;

  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.xyz, p.yzx + 19.19);
    return fract(p.x * p.y * p.z);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash(i+vec3(0.0,0.0,0.0)), hash(i+vec3(1.0,0.0,0.0)), f.x),
          mix(hash(i+vec3(0.0,1.0,0.0)), hash(i+vec3(1.0,1.0,0.0)), f.x), f.y),
      mix(mix(hash(i+vec3(0.0,0.0,1.0)), hash(i+vec3(1.0,0.0,1.0)), f.x),
          mix(hash(i+vec3(0.0,1.0,1.0)), hash(i+vec3(1.0,1.0,1.0)), f.x), f.y), f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uAspect;
    
    float radius = 0.75;
    float d = length(uv);
    
    vec3 baseColor = vec3(0.0);
    
    // Outer Corona glow
    float coronaGlow = 0.0;
    if (d > radius) {
      coronaGlow = exp(-(d - radius) * 4.5);
      if (uFilterMode == 0.0) {
        baseColor = vec3(1.0, 0.35, 0.05) * coronaGlow * (uDemoActive > 0.5 ? 0.6 : 0.4);
      } else if (uFilterMode == 1.0) {
        baseColor = vec3(0.0, 0.8, 0.5) * coronaGlow * (uDemoActive > 0.5 ? 0.5 : 0.35);
      } else {
        baseColor = vec3(0.05, 0.3, 0.8) * coronaGlow * 0.15;
      }
      gl_FragColor = vec4(baseColor, coronaGlow * 0.5);
      return;
    }
    
    // 3D Sphere projection
    float z = sqrt(radius * radius - d * d);
    vec3 N = normalize(vec3(uv.x, uv.y, z));
    
    // Y-axis rotation
    float rot = uTime * 0.015;
    vec3 rotatedP = vec3(N.x * cos(rot) - N.z * sin(rot), N.y, N.x * sin(rot) + N.z * cos(rot));
    
    // Solar texture
    float n = fbm(rotatedP * 9.0 + vec3(0.0, 0.0, uTime * 0.05));
    
    // Limb darkening
    float mu = N.z;
    float limb = pow(mu, 0.6);
    
    float intensity = n * limb;
    
    // SDO Texture mapping (if loaded)
    if (uUseSdoTexture > 0.5) {
      float lon = atan(N.x, N.z) + rot;
      float lat = asin(N.y);
      vec2 texUv = vec2(lon / (2.0 * 3.14159) + 0.5, lat / 3.14159 + 0.5);
      vec4 texColor = texture2D(uSdoTexture, texUv);
      intensity = mix(intensity, texColor.r * limb * 1.6, 0.5);
    }
    
    // Active Region Hotspots
    float arGlowTotal = 0.0;
    for (int i = 0; i < 4; i++) {
      vec3 arPos = uActiveRegions[i];
      // Only render if on front-facing side of the rotating sphere
      vec3 rotArPos = vec3(arPos.x * cos(rot) - arPos.z * sin(rot), arPos.y, arPos.x * sin(rot) + arPos.z * cos(rot));
      if (rotArPos.z > 0.0) {
        float arDist = distance(N, rotArPos);
        float arGlow = exp(-arDist * arDist * 60.0) * uARIntensities[i];
        
        // Erupting flare (AR4478 is index 0)
        if (uDemoActive > 0.5 && i == 0) {
          float flareCycle = mod(uTime * 5.0, 150.0);
          float fAlpha = 0.0;
          if (flareCycle < 30.0) fAlpha = flareCycle / 30.0;
          else if (flareCycle < 150.0) fAlpha = 1.0 - (flareCycle - 30.0) / 120.0;
          
          arGlow += exp(-arDist * arDist * 180.0) * fAlpha * 12.0;
        }
        arGlowTotal += arGlow;
      }
    }
    
    // Color bands
    if (uFilterMode == 0.0) {
      baseColor = vec3(1.0, 0.55, 0.08) * intensity + vec3(1.0, 0.85, 0.6) * arGlowTotal;
    } else if (uFilterMode == 1.0) {
      baseColor = vec3(0.0, 0.7, 0.45) * intensity + vec3(0.6, 1.0, 0.85) * arGlowTotal;
    } else {
      baseColor = vec3(0.02, 0.08, 0.22) * intensity + vec3(0.5, 0.75, 1.0) * arGlowTotal;
    }
    
    // Rim highlight
    float rim = pow(1.0 - mu, 4.0);
    baseColor += rim * 0.1 * vec3(1.0);
    
    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

export function SolarSimulation() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { demoActive, activeRegions, activeAlert } = useStore();
  const [sdoImage, setSdoImage] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [filterMode, setFilterMode] = useState('AIA'); // AIA, HEL1OS, SoLEXS
  const [isWebGl, setIsWebGl] = useState(true);

  // Helioviewer API fetch (Optional SDO overlay)
  useEffect(() => {
    let mounted = true;
    const fetchHelioviewerImage = async () => {
      try {
        const dateStr = new Date().toISOString().slice(0, 19) + 'Z';
        const res = await fetch(`https://api.helioviewer.org/v2/getClosestImage/?sourceId=10&date=${dateStr}`);
        const data = await res.json();
        
        if (mounted && data && data.id) {
          const imgUrl = `https://api.helioviewer.org/v2/downloadFile/?id=${data.id}`;
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => { if (mounted) setSdoImage(img); };
          img.onerror = () => { if (mounted) setImageFailed(true); };
          img.src = imgUrl;
        } else if (mounted) {
          setImageFailed(true);
        }
      } catch (err) {
        if (mounted) setImageFailed(true);
      }
    };
    
    const timeout = setTimeout(() => {
      if (mounted && !sdoImage) setImageFailed(true);
    }, 5000);

    fetchHelioviewerImage();
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // WebGL 3D Solar simulation with Canvas 2D fallback
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let frame = 0;
    let animationFrameId;

    // Convert heliographic to 3D Cartesian coordinates on unit sphere
    const hgToCartesian = (lat_deg, lon_deg) => {
      const lat_rad = lat_deg * Math.PI / 180;
      const lon_rad = lon_deg * Math.PI / 180;
      return [
        Math.cos(lat_rad) * Math.sin(lon_rad), // X
        Math.sin(lat_rad),                    // Y
        Math.cos(lat_rad) * Math.cos(lon_rad)  // Z (facing camera positive)
      ];
    };

    const hardcodedARs = [
      { id: 'AR4478', lat: -6, lon: -52, mag: 'Beta-Gamma-Delta', area: 640 },
      { id: 'AR4475', lat: -9, lon: -21, mag: 'Beta', area: 210 },
      { id: 'AR4473', lat: -14, lon: 35, mag: 'Alpha', area: 120 },
      { id: 'AR4476', lat: 8, lon: 3, mag: 'Beta-Gamma', area: 50 }
    ];

    const ars = activeRegions && activeRegions.length > 0 ? activeRegions : hardcodedARs;
    const arPositions = [];
    const arIntensities = [];

    const maxArs = ars.slice(0, 4);
    
    // Parse active region locations
    maxArs.forEach(ar => {
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
      arPositions.push(...hgToCartesian(lat, lon));
      arIntensities.push(Math.min(1.5, Math.max(0.5, (ar.area || 100) / 200)));
    });

    // Fill missing spaces up to 4 active regions
    while (arPositions.length < 12) arPositions.push(0, 0, 0);
    while (arIntensities.length < 4) arIntensities.push(0);

    // Attempt WebGL Setup
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true }) || 
               canvas.getContext('experimental-webgl', { alpha: false, antialias: true });

    if (!gl) {
      setIsWebGl(false);
      // --- 2D CANVAS FALLBACK RENDERER ---
      const ctx = canvas.getContext('2d', { alpha: false });
      
      const render2DFallback = () => {
        const rect = container.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.38;

        // Colors
        const style = {
          AIA: { bg: '#010308', sun: '#FF6B00', grid: 'rgba(255, 107, 0, 0.15)', ar: '#FFD264' },
          SoLEXS: { bg: '#01050A', sun: '#00E5A0', grid: 'rgba(0, 229, 160, 0.15)', ar: '#96FFFF' },
          HEL1OS: { bg: '#000000', sun: '#020C1F', grid: 'rgba(0, 150, 255, 0.1)', ar: '#64C8FF' }
        }[filterMode];

        ctx.fillStyle = style.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Core sun disk
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = style.sun;
        ctx.fill();

        // 3D Grid rotation lines
        const rot = frame * 0.008;
        ctx.strokeStyle = style.grid;
        ctx.lineWidth = 1;

        // Longitude lines
        for (let i = 0; i < 6; i++) {
          const lonAngle = (i / 6) * Math.PI * 2 + rot;
          const xOffset = Math.sin(lonAngle) * radius;
          if (Math.cos(lonAngle) > 0) { // front face
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.abs(xOffset), radius, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // Latitude lines
        for (let i = -4; i <= 4; i++) {
          const latAngle = (i / 10) * Math.PI;
          const yOffset = Math.sin(latAngle) * radius;
          const rLat = Math.cos(latAngle) * radius;
          ctx.beginPath();
          ctx.ellipse(cx, cy - yOffset, rLat, rLat * 0.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Active Regions projection
        ctx.globalCompositeOperation = 'screen';
        ars.forEach((ar, idx) => {
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
          const [x0, y0, z0] = hgToCartesian(lat, lon);
          // Rotate around Y axis
          const xr = x0 * Math.cos(rot) + z0 * Math.sin(rot);
          const yr = y0;
          const zr = -x0 * Math.sin(rot) + z0 * Math.cos(rot);

          if (zr > 0) { // front face
            const px = cx + xr * radius;
            const py = cy - yr * radius;
            
            // Marker
            ctx.beginPath();
            ctx.arc(px, py, 6 * arIntensities[idx], 0, Math.PI * 2);
            ctx.fillStyle = style.ar;
            ctx.fill();

            // Label
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = '9px "Rajdhani"';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(ar.id || ar.number, px + 8, py - 4);
            ctx.globalCompositeOperation = 'screen';
          }
        });
        ctx.globalCompositeOperation = 'source-over';

        // Rim
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = style.grid;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '10px "Chakra Petch"';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`${filterMode} SIMULATION (2D FALLBACK)`, 10, canvas.height - 15);

        frame++;
        animationFrameId = requestAnimationFrame(render2DFallback);
      };
      
      render2DFallback();
      return () => cancelAnimationFrame(animationFrameId);
    }

    // --- WebGL RENDERER SETUP ---
    setIsWebGl(true);

    const compileShader = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(s));
      }
      return s;
    };

    const vs = compileShader(VERTEX_SHADER_SRC, gl.VERTEX_SHADER);
    const fs = compileShader(FRAGMENT_SHADER_SRC, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("WebGL link failed:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uFilterMode = gl.getUniformLocation(program, 'uFilterMode');
    const uDemoActive = gl.getUniformLocation(program, 'uDemoActive');
    const uAspect = gl.getUniformLocation(program, 'uAspect');
    const uActiveRegions = gl.getUniformLocation(program, 'uActiveRegions');
    const uARIntensities = gl.getUniformLocation(program, 'uARIntensities');
    const uUseSdoTexture = gl.getUniformLocation(program, 'uUseSdoTexture');
    const uSdoTexture = gl.getUniformLocation(program, 'uSdoTexture');

    // Create texture for SDO images
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const renderWebGL = () => {
      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Pass uniforms
      gl.uniform1f(uTime, frame * 0.5);
      gl.uniform1f(uFilterMode, filterMode === 'AIA' ? 0.0 : filterMode === 'SoLEXS' ? 1.0 : 2.0);
      gl.uniform1f(uDemoActive, demoActive ? 1.0 : 0.0);
      gl.uniform1f(uAspect, canvas.width / canvas.height);

      gl.uniform3fv(uActiveRegions, new Float32Array(arPositions));
      gl.uniform1fv(uARIntensities, new Float32Array(arIntensities));

      // SDO texture bind
      if (sdoImage && !imageFailed && filterMode === 'AIA') {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sdoImage);
        gl.uniform1f(uUseSdoTexture, 1.0);
        gl.uniform1i(uSdoTexture, 0);
      } else {
        gl.uniform1f(uUseSdoTexture, 0.0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      frame++;
      animationFrameId = requestAnimationFrame(renderWebGL);
    };

    renderWebGL();

    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteTexture(texture);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
    };
  }, [demoActive, activeRegions, sdoImage, imageFailed, filterMode]);

  return (
    <Card className="flex flex-col h-full overflow-hidden border-border-emphasis bg-[#01050A]" p={0}>
      <div className="px-4 py-3 flex justify-between items-center bg-panel-gradient border-b border-border-subtle shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-accent-orange" />
          <h3 className="font-header text-[13px] tracking-[0.2em] font-bold text-text-primary uppercase">
            SOLAR DISK OBSERVATION (3D)
          </h3>
        </div>
        
        {/* Optical Filters Toggle */}
        <div className="flex bg-[#020B18] border border-border-subtle rounded px-1 py-1 gap-1">
          {['AIA', 'HEL1OS', 'SoLEXS'].map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`font-mono text-[10px] px-3 py-1 rounded transition-colors uppercase ${
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

      <div ref={containerRef} className="flex-1 w-full relative min-h-[300px]">
        <canvas ref={canvasRef} className="absolute inset-0 block z-0" />
        <SolarParticles trigger={activeAlert !== null} />
        
        {/* HTML/CSS Active Region Markers synced in 3D projection overlay */}
        <ActiveRegionLabelsOverlay containerRef={containerRef} filterMode={filterMode} />
      </div>

      <div className={`px-4 py-2 border-t border-border-subtle shrink-0 font-telemetry text-[12px] tracking-wider uppercase transition-colors ${
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

// Active Region labels projected dynamically in 3D on top of WebGL
function ActiveRegionLabelsOverlay({ containerRef, filterMode }) {
  const { activeRegions } = useStore();
  const [coords, setCoords] = useState([]);
  
  useEffect(() => {
    let frame = 0;
    let animId;

    const hardcodedARs = [
      { id: 'AR4478', lat: -6, lon: -52, mag: 'Beta-Gamma-Delta', area: 640 },
      { id: 'AR4475', lat: -9, lon: -21, mag: 'Beta', area: 210 },
      { id: 'AR4473', lat: -14, lon: 35, mag: 'Alpha', area: 120 },
      { id: 'AR4476', lat: 8, lon: 3, mag: 'Beta-Gamma', area: 50 }
    ];

    const hgToCartesian = (lat_deg, lon_deg) => {
      const lat_rad = lat_deg * Math.PI / 180;
      const lon_rad = lon_deg * Math.PI / 180;
      return [
        Math.cos(lat_rad) * Math.sin(lon_rad),
        Math.sin(lat_rad),
        Math.cos(lat_rad) * Math.cos(lon_rad)
      ];
    };

    const updateLabelPositions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.38;

      const rot = frame * 0.0075; // Matches WebGL rotation speed
      const ars = activeRegions && activeRegions.length > 0 ? activeRegions : hardcodedARs;
      const list = [];

      ars.forEach(ar => {
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
        const [x0, y0, z0] = hgToCartesian(lat, lon);
        
        // Rotate around Y axis
        const xr = x0 * Math.cos(rot) + z0 * Math.sin(rot);
        const yr = y0;
        const zr = -x0 * Math.sin(rot) + z0 * Math.cos(rot);

        // Render label if on the facing side of the 3D sphere
        if (zr > 0.05) {
          list.push({
            id: ar.id || ar.number || ar.Region,
            x: cx + xr * radius,
            y: cy - yr * radius,
            opacity: zr // Fade near the limb
          });
        }
      });

      setCoords(list);
      frame++;
      animId = requestAnimationFrame(updateLabelPositions);
    };

    updateLabelPositions();
    return () => cancelAnimationFrame(animId);
  }, [activeRegions, containerRef]);

  const glowColor = filterMode === 'HEL1OS' ? 'border-[#0096ff] text-[#0096ff]' : 'border-[#FF6B00] text-[#FF6B00]';

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {coords.map((c, idx) => (
        <div 
          key={idx}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ 
            left: `${c.x}px`, 
            top: `${c.y}px`, 
            opacity: c.opacity,
            transition: 'opacity 0.1s linear'
          }}
        >
          {/* Target Reticle */}
          <div className={`w-3 h-3 border-[0.5px] rounded-full flex items-center justify-center animate-pulse ${glowColor}`}>
            <div className="w-1 h-1 bg-current rounded-full" />
          </div>
          {/* Label */}
          <div className="mt-1 bg-black/60 border border-border-subtle/50 px-1 py-0.5 rounded font-mono text-[9px] text-white">
            {c.id}
          </div>
        </div>
      ))}
    </div>
  );
}

