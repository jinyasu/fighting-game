import * as THREE from 'three';

export const STAGE_RADIUS = 8.0; // ここから出るとリングアウト

// 闘技場ステージの構築(円形リング + 周囲の床 + 照明 + 空)
export function buildStage(scene) {
  scene.background = new THREE.Color(0x0d1530);
  scene.fog = new THREE.Fog(0x0d1530, 25, 60);

  // リング(円形プラットフォーム)
  const ringGeo = new THREE.CylinderGeometry(STAGE_RADIUS, STAGE_RADIUS + 0.6, 0.9, 48);
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5c });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = -0.45;
  scene.add(ring);

  // リング表面の模様
  const topGeo = new THREE.CircleGeometry(STAGE_RADIUS, 48);
  const topMat = new THREE.MeshLambertMaterial({ color: 0xb09c72 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.005;
  scene.add(top);

  const innerGeo = new THREE.RingGeometry(STAGE_RADIUS - 0.5, STAGE_RADIUS - 0.3, 48);
  const innerMat = new THREE.MeshLambertMaterial({ color: 0x7a2e22, side: THREE.DoubleSide });
  const innerRing = new THREE.Mesh(innerGeo, innerMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.01;
  scene.add(innerRing);

  const centerGeo = new THREE.RingGeometry(1.0, 1.15, 40);
  const center = new THREE.Mesh(centerGeo, innerMat);
  center.rotation.x = -Math.PI / 2;
  center.position.y = 0.01;
  scene.add(center);

  // 下の地面(リングアウトで落ちる先)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    new THREE.MeshLambertMaterial({ color: 0x131c38 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.0;
  scene.add(ground);

  // 観客席風の柱と遠景
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x2a3658 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6 + (i % 3) * 2, 1.2), pillarMat);
    p.position.set(Math.cos(a) * 16, 1, Math.sin(a) * 16);
    scene.add(p);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), lampMat);
    lamp.position.set(Math.cos(a) * 16, 4.2 + (i % 3), Math.sin(a) * 16);
    scene.add(lamp);
  }

  // 星空
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 300; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 25;
    const y = 5 + Math.random() * 30;
    starPos.push(Math.cos(a) * r, y, Math.sin(a) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
  scene.add(stars);

  // 照明
  const amb = new THREE.AmbientLight(0x8890b0, 0.9);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xfff2dd, 1.6);
  key.position.set(6, 12, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7088ff, 0.7);
  rim.position.set(-8, 6, -8);
  scene.add(rim);
  const spot = new THREE.PointLight(0xffe6b0, 60, 30);
  spot.position.set(0, 9, 0);
  scene.add(spot);
}
