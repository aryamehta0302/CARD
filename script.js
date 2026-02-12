/* ============================================================
   AI MIRROR PROTOCOL — script.js
   Cinematic identity gateway for CognizanceX'26
   ============================================================ */

(() => {
    'use strict';

    /* --------------------------------------------------------
       STATE MACHINE
       -------------------------------------------------------- */
    const STATES = {
        IDLE: 'IDLE',
        OBSERVING: 'OBSERVING',
        INPUT: 'INPUT',
        ANALYZING: 'ANALYZING',
        SYNCHRONIZING: 'SYNCHRONIZING',
        AUTHORIZED: 'AUTHORIZED',
        DIVERGENCE: 'DIVERGENCE',
    };

    const app = {
        state: STATES.IDLE,
        rollNumber: '',
        identityHash: '',
        coherenceScore: 0,
        interactionMetrics: {
            firstKeystrokeTime: null,
            inputStartTime: null,
            keystrokeTimestamps: [],
            totalDuration: 0,
        },
        mouse: { x: 0, y: 0, nx: 0, ny: 0 },
        deviceOrientation: { beta: 0, gamma: 0 },
        isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    };

    /* --------------------------------------------------------
       DOM REFS
       -------------------------------------------------------- */
    const dom = {
        container: document.getElementById('canvas-container'),
        observingText: document.getElementById('observing-text'),
        inputZone: document.getElementById('input-zone'),
        rollInput: document.getElementById('roll-input'),
        submitBtn: document.getElementById('submit-btn'),
        analysisHud: document.getElementById('analysis-hud'),
        coherenceDisplay: document.getElementById('coherence-display'),
        hashDisplay: document.getElementById('hash-display'),
        cardContainer: document.getElementById('access-card-container'),
        accessCard: document.getElementById('access-card'),
        cardRoll: document.getElementById('card-roll'),
        cardDatetime: document.getElementById('card-datetime'),
        cardCoherence: document.getElementById('card-coherence'),
        cardHash: document.getElementById('card-hash'),
        divergenceOverlay: document.getElementById('divergence-overlay'),
    };

    /* --------------------------------------------------------
       THREE.JS SETUP
       -------------------------------------------------------- */
    let scene, camera, renderer, clock;
    let neuralGroup, nodesArr = [], edgesArr = [];
    let crystalMesh = null;
    const NODE_COUNT = 150;
    const EDGE_COUNT = 280;

    function initThree() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000510, 0.015);

        const aspect = window.innerWidth / window.innerHeight;
        const fov = aspect < 1 ? 85 : 65;
        camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
        camera.position.set(0, 0, 14);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000510, 1);
        dom.container.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        // Lights
        const ambientLight = new THREE.AmbientLight(0x111133, 0.5);
        scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x00d4ff, 1.5, 30);
        pointLight1.position.set(5, 5, 5);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xa855f7, 1.2, 30);
        pointLight2.position.set(-5, -3, 3);
        scene.add(pointLight2);

        buildNeuralOrganism();
    }

    /* --------------------------------------------------------
       NEURAL ORGANISM
       -------------------------------------------------------- */
    function buildNeuralOrganism() {
        neuralGroup = new THREE.Group();
        scene.add(neuralGroup);

        // Node material
        const nodeMat = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            emissive: 0x003355,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
            shininess: 100,
        });

        const nodeGeo = new THREE.SphereGeometry(0.08, 12, 12);

        // Create nodes with random positions in a sphere
        for (let i = 0; i < NODE_COUNT; i++) {
            const mesh = new THREE.Mesh(nodeGeo, nodeMat.clone());
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 3 + Math.random() * 6;
            mesh.position.set(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            mesh.userData = {
                basePos: mesh.position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.005,
                    (Math.random() - 0.5) * 0.005,
                    (Math.random() - 0.5) * 0.005
                ),
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.5 + Math.random() * 1.5,
            };
            neuralGroup.add(mesh);
            nodesArr.push(mesh);
        }

        // Build edges
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.12,
        });

        for (let i = 0; i < EDGE_COUNT; i++) {
            const a = Math.floor(Math.random() * NODE_COUNT);
            let b = Math.floor(Math.random() * NODE_COUNT);
            if (b === a) b = (a + 1) % NODE_COUNT;

            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const line = new THREE.Line(geo, edgeMat.clone());
            line.userData = { nodeA: a, nodeB: b, baseOpacity: 0.06 + Math.random() * 0.1 };
            neuralGroup.add(line);
            edgesArr.push(line);
        }
    }

    /* --------------------------------------------------------
       CRYSTAL MESH
       -------------------------------------------------------- */
    function createCrystal() {
        const geo = new THREE.IcosahedronGeometry(1.5, 1);
        const mat = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            emissive: 0x221155,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0,
            shininess: 200,
            wireframe: false,
            flatShading: true,
        });
        crystalMesh = new THREE.Mesh(geo, mat);
        crystalMesh.scale.set(0.01, 0.01, 0.01);
        scene.add(crystalMesh);
        return crystalMesh;
    }

    /* --------------------------------------------------------
       ANIMATION — NEURAL ORGANISM UPDATE
       -------------------------------------------------------- */
    let pulseIntensity = 0; // controlled by typing speed

    function updateNeuralOrganism(time, delta) {
        if (!neuralGroup) return;

        const st = app.state;
        const mouseInfluence = new THREE.Vector3(app.mouse.nx * 2, app.mouse.ny * 2, 0);

        if (app.isMobile) {
            mouseInfluence.x = (app.deviceOrientation.gamma / 45) * 2;
            mouseInfluence.y = (app.deviceOrientation.beta / 45) * 2;
        }

        // Node animation
        nodesArr.forEach((node, i) => {
            const ud = node.userData;
            const pulse = Math.sin(time * ud.pulseSpeed + ud.phase) * 0.1;

            if (st === STATES.OBSERVING || st === STATES.INPUT) {
                // Force-based gentle motion
                node.position.x = ud.basePos.x + ud.velocity.x * time * 30 + mouseInfluence.x * 0.15 + pulse;
                node.position.y = ud.basePos.y + ud.velocity.y * time * 30 + mouseInfluence.y * 0.15 + pulse;
                node.position.z = ud.basePos.z + Math.sin(time * 0.3 + i) * 0.15;

                // Keep within bounds — fill entire screen
                const dist = node.position.length();
                if (dist > 12) {
                    node.position.multiplyScalar(12 / dist);
                    ud.velocity.multiplyScalar(-1);
                    ud.basePos.copy(node.position);
                }
            }

            if (st === STATES.INPUT) {
                // Circle formation — responsive to aspect ratio
                const angle = (i / NODE_COUNT) * Math.PI * 2;
                const ar = window.innerWidth / window.innerHeight;
                const circR = ar < 1 ? 5.5 : 7.5;
                const targetX = Math.cos(angle) * circR;
                const targetY = Math.sin(angle) * circR * (ar < 1 ? 0.75 : 1);
                node.position.x += (targetX - node.position.x) * 0.005;
                node.position.y += (targetY - node.position.y) * 0.005;
                node.position.z += (0 - node.position.z) * 0.01;
            }

            // Pulse intensity from typing
            const emissiveVal = 0.3 + pulseIntensity * 0.7 + pulse * 0.3;
            node.material.emissiveIntensity = emissiveVal;

            // Scale pulse
            const s = 1 + pulse * 0.3 + pulseIntensity * 0.5;
            node.scale.setScalar(s);
        });

        // Edge update
        edgesArr.forEach(edge => {
            const posAttr = edge.geometry.attributes.position;
            const nA = nodesArr[edge.userData.nodeA];
            const nB = nodesArr[edge.userData.nodeB];
            posAttr.array[0] = nA.position.x;
            posAttr.array[1] = nA.position.y;
            posAttr.array[2] = nA.position.z;
            posAttr.array[3] = nB.position.x;
            posAttr.array[4] = nB.position.y;
            posAttr.array[5] = nB.position.z;
            posAttr.needsUpdate = true;

            // Pulse energy along edges
            const basePulse = edge.userData.baseOpacity;
            edge.material.opacity = basePulse + pulseIntensity * 0.15 + Math.sin(time * 2 + edge.userData.nodeA) * 0.04;

            // Change color during divergence
            if (st === STATES.DIVERGENCE) {
                edge.material.color.setHex(0xff3333);
                edge.material.opacity = Math.random() * 0.3;
            }
        });

        // Slow rotation
        neuralGroup.rotation.y += delta * 0.08;
        neuralGroup.rotation.x += delta * 0.03;

        // Decay pulse intensity
        pulseIntensity *= 0.95;
    }

    /* --------------------------------------------------------
       SPLIT + MIRROR ANIMATION (Phase 3)
       -------------------------------------------------------- */
    function animateSplit() {
        return new Promise(resolve => {
            const tl = gsap.timeline({ onComplete: resolve });

            // Split nodes into left and right halves
            nodesArr.forEach((node, i) => {
                const isLeft = i < NODE_COUNT / 2;
                const targetX = isLeft ? node.position.x - 3 : node.position.x + 3;
                tl.to(node.position, {
                    x: targetX,
                    duration: 1.5,
                    ease: 'power2.inOut',
                }, 0);
            });

            // Change right-side color to purple
            nodesArr.forEach((node, i) => {
                if (i >= NODE_COUNT / 2) {
                    tl.to(node.material.color, {
                        r: 0.66, g: 0.33, b: 0.97,
                        duration: 1.0,
                        ease: 'power2.inOut',
                    }, 0.5);
                    tl.to(node.material.emissive, {
                        r: 0.2, g: 0.05, b: 0.4,
                        duration: 1.0,
                        ease: 'power2.inOut',
                    }, 0.5);
                }
            });
        });
    }

    function animateConvergence(score) {
        return new Promise(resolve => {
            const tl = gsap.timeline({ onComplete: resolve });
            const convergeFactor = score / 100;

            // Bring halves together based on coherence score
            nodesArr.forEach((node, i) => {
                const isLeft = i < NODE_COUNT / 2;
                const moveBack = isLeft ? convergeFactor * 3 : -convergeFactor * 3;
                tl.to(node.position, {
                    x: node.position.x + moveBack,
                    duration: 2.0,
                    ease: 'power3.inOut',
                }, 0);
            });

            // Animate coherence counter
            const counter = { val: 0 };
            tl.to(counter, {
                val: score,
                duration: 2.5,
                ease: 'power2.out',
                onUpdate: () => {
                    dom.coherenceDisplay.textContent = Math.round(counter.val) + '%';
                },
            }, 0);

            // Color merge for all nodes back to cyan
            nodesArr.forEach((node) => {
                tl.to(node.material.color, {
                    r: 0, g: 0.83, b: 1,
                    duration: 1.5,
                    ease: 'power2.inOut',
                }, 1.0);
            });
        });
    }

    /* --------------------------------------------------------
       CRYSTAL FORMATION (Phase 4)
       -------------------------------------------------------- */
    function animateCrystalFormation() {
        return new Promise(resolve => {
            createCrystal();

            const tl = gsap.timeline({ onComplete: resolve });

            // Shrink all nodes toward center
            nodesArr.forEach((node, i) => {
                tl.to(node.position, {
                    x: 0, y: 0, z: 0,
                    duration: 1.5,
                    ease: 'power3.in',
                }, i * 0.005);
                tl.to(node.material, {
                    opacity: 0,
                    duration: 0.5,
                }, 1.0 + i * 0.003);
            });

            // Hide edges
            edgesArr.forEach(edge => {
                tl.to(edge.material, {
                    opacity: 0,
                    duration: 0.8,
                }, 0.8);
            });

            // Grow crystal
            tl.to(crystalMesh.scale, {
                x: 1, y: 1, z: 1,
                duration: 1.5,
                ease: 'elastic.out(1, 0.5)',
            }, 1.5);
            tl.to(crystalMesh.material, {
                opacity: 0.85,
                duration: 1.0,
                ease: 'power2.out',
            }, 1.5);

            // Camera push forward
            tl.to(camera.position, {
                z: 6,
                duration: 2.5,
                ease: 'power2.inOut',
            }, 1.0);
        });
    }

    function animateCrystalToCard() {
        return new Promise(resolve => {
            const tl = gsap.timeline({ onComplete: resolve });

            // Crystal rotate and fracture
            tl.to(crystalMesh.rotation, {
                y: Math.PI * 4,
                x: Math.PI * 2,
                duration: 2,
                ease: 'power2.inOut',
            }, 0);

            tl.to(crystalMesh.scale, {
                x: 0.01, y: 0.01, z: 0.01,
                duration: 1.0,
                ease: 'power3.in',
            }, 1.5);

            tl.to(crystalMesh.material, {
                opacity: 0,
                duration: 0.8,
            }, 1.8);

            // Show access card
            tl.to(dom.cardContainer, {
                opacity: 1,
                duration: 1.5,
                ease: 'power2.out',
            }, 2.0);

            tl.fromTo(dom.accessCard, {
                rotateY: 90,
                scale: 0.5,
            }, {
                rotateY: 0,
                scale: 1,
                duration: 1.5,
                ease: 'back.out(1.2)',
            }, 2.0);

            tl.set(dom.cardContainer, { pointerEvents: 'all' }, 2.5);
        });
    }

    /* --------------------------------------------------------
       DIVERGENCE ANIMATION
       -------------------------------------------------------- */
    function animateDivergence() {
        return new Promise(resolve => {
            app.state = STATES.DIVERGENCE;

            // Make nodes jitter violently
            nodesArr.forEach(node => {
                node.material.color.setHex(0xff3333);
                node.material.emissive.setHex(0x550000);
                node.userData.velocity.multiplyScalar(10);
            });

            const tl = gsap.timeline({ onComplete: resolve });
            tl.to(dom.divergenceOverlay, {
                opacity: 1,
                duration: 0.8,
                ease: 'power2.out',
            }, 0);

            // Camera shake
            const shakeTimeline = gsap.timeline({ repeat: 8 });
            shakeTimeline.to(camera.position, {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.5,
                duration: 0.05,
            });
            shakeTimeline.to(camera.position, {
                x: 0, y: 0,
                duration: 0.05,
            });
            tl.add(shakeTimeline, 0);

            // Break edges
            edgesArr.forEach(edge => {
                tl.to(edge.material, {
                    opacity: Math.random() > 0.5 ? 0 : 0.4,
                    duration: 0.3,
                }, Math.random() * 0.5);
            });

            // Red vignette
            tl.to(renderer, {
                duration: 0.5,
                onUpdate: function () {
                    renderer.setClearColor(new THREE.Color(0x150000), 1);
                },
            }, 0);
        });
    }

    /* --------------------------------------------------------
       WEB CRYPTO — IDENTITY HASH
       -------------------------------------------------------- */
    async function generateIdentityHash(rollNumber, metrics) {
        const payload = [
            rollNumber,
            navigator.userAgent,
            `${screen.width}x${screen.height}`,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            String(metrics.totalDuration),
            String(metrics.keystrokeTimestamps.length),
            String(metrics.firstKeystrokeTime || 0),
        ].join('|');

        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /* --------------------------------------------------------
       COHERENCE SCORE
       -------------------------------------------------------- */
    function computeCoherenceScore(metrics) {
        const { keystrokeTimestamps, firstKeystrokeTime, inputStartTime, totalDuration } = metrics;

        if (keystrokeTimestamps.length < 2) return 72 + Math.random() * 15;

        // Calculate timing intervals between keystrokes
        const intervals = [];
        for (let i = 1; i < keystrokeTimestamps.length; i++) {
            intervals.push(keystrokeTimestamps[i] - keystrokeTimestamps[i - 1]);
        }

        // Mean interval
        const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;

        // Variance
        const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // Coefficient of variation (lower = more consistent)
        const cv = mean > 0 ? stdDev / mean : 1;

        // Time to first keystroke factor (faster reaction = higher factor)
        const reactionTime = firstKeystrokeTime - inputStartTime;
        const reactionFactor = Math.max(0, 1 - reactionTime / 5000);

        // Base score from consistency
        let score = Math.max(60, 100 - cv * 40);

        // Adjust by reaction
        score = score * 0.8 + reactionFactor * 20;

        // Clamp
        return Math.min(99, Math.max(55, Math.round(score * 10) / 10));
    }

    /* --------------------------------------------------------
       DEVICE IDENTITY BINDING (Phase 5)
       -------------------------------------------------------- */
    function getDeviceSignature() {
        return [navigator.userAgent, `${screen.width}x${screen.height}`, navigator.language].join('|');
    }

    function storeIdentity(rollNumber, hash) {
        const data = {
            rollNumber,
            hash,
            deviceSignature: getDeviceSignature(),
            timestamp: Date.now(),
        };
        localStorage.setItem('ai_mirror_identity', JSON.stringify(data));
    }

    function checkStoredIdentity() {
        const raw = localStorage.getItem('ai_mirror_identity');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    /* --------------------------------------------------------
       PHASE ORCHESTRATION
       -------------------------------------------------------- */
    function setState(newState) {
        app.state = newState;
    }

    // PHASE 1 → OBSERVING
    function startPhase1() {
        setState(STATES.OBSERVING);

        gsap.to(dom.observingText, {
            opacity: 0.6,
            duration: 2,
            ease: 'power2.out',
        });

        // After 3.5s, transition to circle + Phase 2
        gsap.delayedCall(3.5, () => {
            transitionToPhase2();
        });
    }

    // PHASE 2 — INPUT
    function transitionToPhase2() {
        setState(STATES.INPUT);

        const tl = gsap.timeline();

        // Fade out observing text
        tl.to(dom.observingText, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
        }, 0);

        // Animate neural network into circle (handled in update loop via state)

        // Materialize input zone
        tl.to(dom.inputZone, {
            opacity: 1,
            scale: 1,
            duration: 1.2,
            ease: 'back.out(1.4)',
            onStart: () => dom.inputZone.classList.add('active'),
        }, 1.5);

        // Focus input
        tl.add(() => dom.rollInput.focus(), 2.5);

        // Start tracking interaction
        app.interactionMetrics.inputStartTime = performance.now();
    }

    // PHASE 3 — ANALYZING
    async function startPhase3(rollNumber) {
        setState(STATES.ANALYZING);
        app.rollNumber = rollNumber;

        // Finalize interaction metrics
        app.interactionMetrics.totalDuration = performance.now() - app.interactionMetrics.inputStartTime;

        const tl = gsap.timeline();

        // Hide input zone
        tl.to(dom.inputZone, {
            opacity: 0,
            scale: 0.8,
            duration: 0.8,
            ease: 'power3.in',
            onComplete: () => dom.inputZone.classList.remove('active'),
        });

        // Show analysis HUD
        tl.to(dom.analysisHud, {
            opacity: 1,
            duration: 1,
            ease: 'power2.out',
        }, 0.5);

        // Wait for split animation
        await tl.then();

        // Generate identity hash
        const hash = await generateIdentityHash(rollNumber, app.interactionMetrics);
        app.identityHash = hash;
        dom.hashDisplay.textContent = hash;

        // Compute coherence score
        app.coherenceScore = computeCoherenceScore(app.interactionMetrics);

        // Visual split
        await animateSplit();

        // Transition to synchronizing
        setState(STATES.SYNCHRONIZING);

        // Convergence animation
        await animateConvergence(app.coherenceScore);

        // Proceed to Phase 4
        await startPhase4();
    }

    // PHASE 4 — CRYSTAL + CARD
    async function startPhase4() {
        // Hide analysis HUD
        gsap.to(dom.analysisHud, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.in',
        });

        // Crystal formation
        await animateCrystalFormation();

        // Populate card data
        populateCard();

        // Crystal to card transition
        await animateCrystalToCard();

        // State: AUTHORIZED
        setState(STATES.AUTHORIZED);
        dom.accessCard.classList.add('glow-active');

        // Store identity
        storeIdentity(app.rollNumber, app.identityHash);
    }

    function populateCard() {
        dom.cardRoll.textContent = app.rollNumber;

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
        dom.cardDatetime.textContent = `${dateStr} ${timeStr}`;

        dom.cardCoherence.textContent = app.coherenceScore.toFixed(1) + '%';
        dom.cardHash.textContent = app.identityHash.substring(0, 24) + '…';
    }

    // Immediate card render for returning identity
    function renderCardImmediately(stored) {
        setState(STATES.AUTHORIZED);
        app.rollNumber = stored.rollNumber;
        app.identityHash = stored.hash;
        app.coherenceScore = 0; // Not recalculated

        // Hide observing text
        dom.observingText.style.opacity = '0';

        // Dim neural organism
        nodesArr.forEach(node => {
            node.material.opacity = 0.2;
            node.material.emissiveIntensity = 0.2;
        });
        edgesArr.forEach(edge => {
            edge.material.opacity = 0.03;
        });

        populateCardFromStored(stored);

        gsap.to(dom.cardContainer, {
            opacity: 1,
            duration: 1.5,
            ease: 'power2.out',
            delay: 0.5,
        });
        gsap.fromTo(dom.accessCard, {
            rotateY: 30,
            scale: 0.9,
        }, {
            rotateY: 0,
            scale: 1,
            duration: 1.5,
            ease: 'back.out(1.2)',
            delay: 0.5,
        });
        gsap.set(dom.cardContainer, { pointerEvents: 'all', delay: 1.5 });
        dom.accessCard.classList.add('glow-active');
    }

    function populateCardFromStored(stored) {
        dom.cardRoll.textContent = stored.rollNumber;

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
        dom.cardDatetime.textContent = `${dateStr} ${timeStr}`;

        dom.cardCoherence.textContent = 'SESSION RESUMED';
        dom.cardHash.textContent = stored.hash.substring(0, 24) + '…';
    }

    /* --------------------------------------------------------
       INPUT HANDLING
       -------------------------------------------------------- */
    function setupInputListeners() {
        dom.rollInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
                return;
            }

            const now = performance.now();

            if (!app.interactionMetrics.firstKeystrokeTime) {
                app.interactionMetrics.firstKeystrokeTime = now;
            }

            app.interactionMetrics.keystrokeTimestamps.push(now);

            // Calculate typing speed for pulse
            const timestamps = app.interactionMetrics.keystrokeTimestamps;
            if (timestamps.length >= 2) {
                const lastInterval = timestamps[timestamps.length - 1] - timestamps[timestamps.length - 2];
                // Fast typing = stronger pulse
                pulseIntensity = Math.min(1, Math.max(pulseIntensity, 300 / Math.max(lastInterval, 50)));
            }
        });

        dom.submitBtn.addEventListener('click', handleSubmit);
    }

    function handleSubmit() {
        const roll = dom.rollInput.value.trim();
        if (!roll) return;

        // Check for divergence
        const stored = checkStoredIdentity();
        if (stored && stored.rollNumber !== roll) {
            animateDivergence();
            return;
        }

        startPhase3(roll);
    }

    /* --------------------------------------------------------
       MOUSE / DEVICE ORIENTATION
       -------------------------------------------------------- */
    function setupInteractionListeners() {
        window.addEventListener('mousemove', (e) => {
            app.mouse.x = e.clientX;
            app.mouse.y = e.clientY;
            app.mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
            app.mouse.ny = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Card tilt on mouse
        window.addEventListener('mousemove', (e) => {
            if (app.state !== STATES.AUTHORIZED) return;
            const card = dom.accessCard;
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);
            card.style.transform = `rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
        });

        // DeviceOrientation API
        if (app.isMobile && window.DeviceOrientationEvent) {
            // Try to request permission (iOS 13+)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                document.body.addEventListener('click', () => {
                    DeviceOrientationEvent.requestPermission().then(response => {
                        if (response === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                        }
                    }).catch(() => { });
                }, { once: true });
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        }

        // Resize — adaptive FOV for portrait/landscape
        window.addEventListener('resize', () => {
            const ar = window.innerWidth / window.innerHeight;
            camera.aspect = ar;
            camera.fov = ar < 1 ? 85 : 65;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    function handleOrientation(event) {
        app.deviceOrientation.beta = event.beta || 0;
        app.deviceOrientation.gamma = event.gamma || 0;

        // Card tilt on mobile
        if (app.state === STATES.AUTHORIZED) {
            const dx = (app.deviceOrientation.gamma / 45);
            const dy = (app.deviceOrientation.beta / 45);
            dom.accessCard.style.transform = `rotateY(${dx * 12}deg) rotateX(${-dy * 12}deg)`;
        }
    }

    /* --------------------------------------------------------
       MAIN LOOP
       -------------------------------------------------------- */
    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        updateNeuralOrganism(elapsed, delta);

        // Crystal rotation
        if (crystalMesh && app.state === STATES.SYNCHRONIZING) {
            crystalMesh.rotation.y += delta * 0.5;
            crystalMesh.rotation.x += delta * 0.2;
        }

        renderer.render(scene, camera);
    }

    /* --------------------------------------------------------
       INITIALIZATION
       -------------------------------------------------------- */
    function init() {
        initThree();
        setupInputListeners();
        setupInteractionListeners();

        // Check for stored identity
        const stored = checkStoredIdentity();
        if (stored && stored.deviceSignature === getDeviceSignature()) {
            // Same device, same identity → immediate card
            renderCardImmediately(stored);
        } else if (stored && stored.deviceSignature !== getDeviceSignature()) {
            // Different device — allow re-registration
            localStorage.removeItem('ai_mirror_identity');
            startPhase1();
        } else {
            startPhase1();
        }

        // Start render loop
        animate();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
