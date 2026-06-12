const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// 1. STL 3D Mesh Generator Helper
// -------------------------------------------------------------

function addTriangle(a, b, c, triangles) {
  // Compute normal vector (cross product of U and V)
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
  if (len > 0) {
    nx /= len; ny /= len; nz /= len;
  }
  triangles.push({
    n: { x: nx, y: ny, z: nz },
    a, b, c
  });
}

function addBox(x1, x2, y1, y2, z1, z2, triangles, invert = false) {
  const v = [
    { x: x1, y: y1, z: z1 }, // 0
    { x: x2, y: y1, z: z1 }, // 1
    { x: x2, y: y2, z: z1 }, // 2
    { x: x1, y: y2, z: z1 }, // 3
    { x: x1, y: y1, z: z2 }, // 4
    { x: x2, y: y1, z: z2 }, // 5
    { x: x2, y: y2, z: z2 }, // 6
    { x: x1, y: y2, z: z2 }  // 7
  ];

  const faces = [
    // Bottom
    [0, 2, 1], [0, 3, 2],
    // Top
    [4, 5, 6], [4, 6, 7],
    // Front
    [0, 1, 5], [0, 5, 4],
    // Back
    [2, 3, 7], [2, 7, 6],
    // Left
    [3, 0, 4], [3, 4, 7],
    // Right
    [1, 2, 6], [1, 6, 5]
  ];

  for (let f of faces) {
    if (invert) {
      addTriangle(v[f[0]], v[f[2]], v[f[1]], triangles);
    } else {
      addTriangle(v[f[0]], v[f[1]], v[f[2]], triangles);
    }
  }
}

function serializeSTL(name, triangles) {
  let output = `solid ${name}\n`;
  for (let t of triangles) {
    output += `  facet normal ${t.n.x.toFixed(6)} ${t.n.y.toFixed(6)} ${t.n.z.toFixed(6)}\n`;
    output += `    outer loop\n`;
    output += `      vertex ${t.a.x.toFixed(3)} ${t.a.y.toFixed(3)} ${t.a.z.toFixed(3)}\n`;
    output += `      vertex ${t.b.x.toFixed(3)} ${t.b.y.toFixed(3)} ${t.b.z.toFixed(3)}\n`;
    output += `      vertex ${t.c.x.toFixed(3)} ${t.c.y.toFixed(3)} ${t.c.z.toFixed(3)}\n`;
    output += `    endloop\n`;
    output += `  endfacet\n`;
  }
  output += `endsolid ${name}\n`;
  return output;
}

// -------------------------------------------------------------
// 2. KiCad Design File Templates
// -------------------------------------------------------------

const kicadProTemplate = `{
  "meta": {
    "version": 1
  },
  "project": {
    "title": "S.P.H.E.R.E. Wearable Biosensor",
    "company": "FrozenLionMax"
  }
}`;

const kicadSchTemplate = `(kicad_sch (version 20211123) (generator eeschema)
  (uuid "a6f8bb1a-ccdc-4ef2-9214-724d9c49a602")
  (paper "A4")
  (title_block
    (title "S.P.H.E.R.E. Wearable Biosensor Schematic")
    (company "FrozenLionMax")
    (comment 1 "ESP32 MCU with MAX30102 PPG and MPU6050 IMU")
  )
  (lib_symbols
    (symbol "ESP32-WROOM-32E"
      (pin input line (at -10 0 0) (length 5)
        (name "EN" (effects (font (size 1.27 1.27))))
        (number "3" (effects (font (size 1.27 1.27))))
      )
      (pin power_in line (at 0 15 270) (length 5)
        (name "3V3" (effects (font (size 1.27 1.27))))
        (number "2" (effects (font (size 1.27 1.27))))
      )
      (pin power_in line (at 0 -15 90) (length 5)
        (name "GND" (effects (font (size 1.27 1.27))))
        (number "15" (effects (font (size 1.27 1.27))))
      )
      (pin bidirectional line (at 10 5 180) (length 5)
        (name "SDA/GPIO21" (effects (font (size 1.27 1.27))))
        (number "33" (effects (font (size 1.27 1.27))))
      )
      (pin bidirectional line (at 10 0 180) (length 5)
        (name "SCL/GPIO22" (effects (font (size 1.27 1.27))))
        (number "36" (effects (font (size 1.27 1.27))))
      )
    )
    (symbol "MAX30102"
      (pin power_in line (at 0 10 270) (length 5)
        (name "VDD" (effects (font (size 1.27 1.27))))
        (number "11" (effects (font (size 1.27 1.27))))
      )
      (pin power_in line (at 0 -10 90) (length 5)
        (name "GND" (effects (font (size 1.27 1.27))))
        (number "12" (effects (font (size 1.27 1.27))))
      )
      (pin open_collector line (at 10 5 180) (length 5)
        (name "SDA" (effects (font (size 1.27 1.27))))
        (number "2" (effects (font (size 1.27 1.27))))
      )
      (pin input line (at 10 0 180) (length 5)
        (name "SCL" (effects (font (size 1.27 1.27))))
        (number "1" (effects (font (size 1.27 1.27))))
      )
    )
    (symbol "MPU6050"
      (pin power_in line (at 0 10 270) (length 5)
        (name "VCC" (effects (font (size 1.27 1.27))))
        (number "1" (effects (font (size 1.27 1.27))))
      )
      (pin power_in line (at 0 -10 90) (length 5)
        (name "GND" (effects (font (size 1.27 1.27))))
        (number "8" (effects (font (size 1.27 1.27))))
      )
      (pin bidirectional line (at 10 5 180) (length 5)
        (name "SDA" (effects (font (size 1.27 1.27))))
        (number "24" (effects (font (size 1.27 1.27))))
      )
      (pin input line (at 10 0 180) (length 5)
        (name "SCL" (effects (font (size 1.27 1.27))))
        (number "23" (effects (font (size 1.27 1.27))))
      )
    )
  )
  (symbol (lib_id "ESP32-WROOM-32E") (at 80 120 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced)
    (uuid "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e")
  )
  (symbol (lib_id "MAX30102") (at 140 100 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced)
    (uuid "c2d3e4f5-a7b8-4c8d-9e0f-1a2b3c4d5e6f")
  )
  (symbol (lib_id "MPU6050") (at 140 150 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced)
    (uuid "d2e3f4a5-b7c8-4d8e-9f0a-1b2c3d4e5f6a")
  )
)
`;

const kicadPcbTemplate = `(kicad_pcb (version 20211014) (generator pcbnew)
  (uuid "e0a1b2c3-d4e5-4f6a-8b9c-d0e1f2a3b4c5")
  (paper "A4")
  (setup
    (stackup
      (layer "F.Cu")
      (layer "B.Cu")
    )
  )
  (segment (start 100 120) (end 140 100) (width 0.25) (layer "F.Cu") (net 1))
  (segment (start 100 125) (end 140 150) (width 0.25) (layer "F.Cu") (net 2))
)
`;

// -------------------------------------------------------------
// 3. Execution & Construction
// -------------------------------------------------------------

function generate() {
  console.log('[GEN] Initializing S.P.H.E.R.E. Hardware File Generation...');

  // Paths
  const cadDir = path.join(__dirname, 'cad');
  const pcbDir = path.join(__dirname, 'pcb');

  if (!fs.existsSync(cadDir)) fs.mkdirSync(cadDir, { recursive: true });
  if (!fs.existsSync(pcbDir)) fs.mkdirSync(pcbDir, { recursive: true });

  // A. Generate Bottom Casing Mesh
  const bottomTriangles = [];
  
  // 1. Bottom plate base built with 4 sub-boxes to leave center window hole (-4 to 4, -4 to 4)
  addBox(-20, -4, -20, 20, 0, 1.5, bottomTriangles);   // Left plate
  addBox(4, 20, -20, 20, 0, 1.5, bottomTriangles);     // Right plate
  addBox(-4, 4, -20, -4, 0, 1.5, bottomTriangles);     // Front plate
  addBox(-4, 4, 4, 20, 0, 1.5, bottomTriangles);       // Back plate

  // 2. Outer walls (1.5mm to 10mm high, 2mm thick)
  addBox(-20, -18, -20, 20, 1.5, 10, bottomTriangles); // Left wall
  addBox(18, 20, -20, 20, 1.5, 10, bottomTriangles);   // Right wall
  addBox(-18, 18, 18, 20, 1.5, 10, bottomTriangles);   // Back wall

  // Front wall has USB-C cutout (open Z=[1.5, 5] between X=[-4.5, 4.5])
  addBox(-18, -4.5, -20, -18, 1.5, 10, bottomTriangles); // Front left
  addBox(4.5, 18, -20, -18, 1.5, 10, bottomTriangles);  // Front right
  addBox(-4.5, 4.5, -20, -18, 5, 10, bottomTriangles);   // Front top bridge

  // 3. Strap slot loops on Left/Right outer walls
  // Left loop
  addBox(-24, -22, -10, 10, 1.5, 4.5, bottomTriangles);  // Outer vertical block
  addBox(-22, -20, 8, 10, 1.5, 4.5, bottomTriangles);    // Top connector bridge
  addBox(-22, -20, -10, -8, 1.5, 4.5, bottomTriangles);  // Bottom connector bridge
  // Right loop
  addBox(22, 24, -10, 10, 1.5, 4.5, bottomTriangles);   // Outer vertical block
  addBox(20, 22, 8, 10, 1.5, 4.5, bottomTriangles);     // Top connector bridge
  addBox(20, 22, -10, -8, 1.5, 4.5, bottomTriangles);   // Bottom connector bridge

  const bottomStl = serializeSTL('wearable_casing_bottom', bottomTriangles);
  fs.writeFileSync(path.join(cadDir, 'wearable_casing_bottom.stl'), bottomStl);
  console.log('[GEN] Generated wearable_casing_bottom.stl');

  // B. Generate Top Cover Mesh
  const topTriangles = [];
  
  // Lid Plate (40x40x2mm)
  addBox(-20, 20, -20, 20, 10, 12, topTriangles);
  // Inner rim lip (fits inside bottom wall rim 36x36x2mm)
  addBox(-18, -17.5, -17.5, 17.5, 8, 10, topTriangles); // Left lip
  addBox(17.5, 18, -17.5, 17.5, 8, 10, topTriangles);   // Right lip
  addBox(-17.5, 17.5, -18, -17.5, 8, 10, topTriangles); // Front lip
  addBox(-17.5, 17.5, 17.5, 18, 8, 10, topTriangles);   // Back lip

  const topStl = serializeSTL('wearable_casing_top', topTriangles);
  fs.writeFileSync(path.join(cadDir, 'wearable_casing_top.stl'), topStl);
  console.log('[GEN] Generated wearable_casing_top.stl');

  // C. Generate KiCad Project Files
  fs.writeFileSync(path.join(pcbDir, 'wearable_pcb.kicad_pro'), kicadProTemplate);
  fs.writeFileSync(path.join(pcbDir, 'wearable_pcb.kicad_sch'), kicadSchTemplate);
  fs.writeFileSync(path.join(pcbDir, 'wearable_pcb.kicad_pcb'), kicadPcbTemplate);
  console.log('[GEN] Generated KiCad design files (kicad_pro, kicad_sch, kicad_pcb)');

  console.log('[GEN] All S.P.H.E.R.E. Hardware assets generated successfully.');
}

generate();
