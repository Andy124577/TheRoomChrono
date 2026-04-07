     const API_URL = 'https://the-room-api.vercel.app/api/timer';

        // Map des IDs pour l'API (0 = team, 1-5 = players)
        const timerIds = {
            'team': 0,
            'person1': 1,
            'person2': 2,
            'person3': 3,
            'person4': 4,
            'person5': 5
        };

        // Persistent timers state
        const timers = {
            team:    { time: 1500, running: false, initial: 1500, animating: false },
            person1: { time: 300,  running: false, initial: 300,  animating: false },
            person2: { time: 300,  running: false, initial: 300,  animating: false },
            person3: { time: 300,  running: false, initial: 300,  animating: false },
            person4: { time: 300,  running: false, initial: 300,  animating: false },
            person5: { time: 300,  running: false, initial: 300,  animating: false }
        };

        // Local countdown intervals for visual feedback
        const countdownIntervals = {};

        function startLocalCountdown(timerId) {
            if (countdownIntervals[timerId]) return;
            if (timers[timerId].animating) return;
            countdownIntervals[timerId] = setInterval(() => {
                if (timers[timerId].running && timers[timerId].time > 0) {
                    timers[timerId].time--;
                    updateTimerDisplay(timerId);
                }
            }, 1000);
        }

        function stopLocalCountdown(timerId) {
            if (countdownIntervals[timerId]) {
                clearInterval(countdownIntervals[timerId]);
                delete countdownIntervals[timerId];
            }
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        async function fetchTimers() {
            try {
                const response = await fetch(API_URL, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    console.error('Response not OK:', response.status);
                    return;
                }

                const data = await response.json();
                console.log('✅ Fetched data:', data);

                if (!data.chronos || !Array.isArray(data.chronos)) {
                    console.error('❌ Invalid data format:', data);
                    return;
                }

                // Update timers from API
                data.chronos.forEach(chrono => {
                    const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                    if (localKey && timers[localKey]) {
                        const wasRunning = timers[localKey].running;
                        const isRunning = chrono.status === 'running';

                        // Update time from API when:
                        // - Timer is stopped (sync final value)
                        // - Timer just started (get initial value)
                        // Don't update when timer is STILL running (let local countdown handle it)
                        if (!isRunning || !wasRunning) {
                            timers[localKey].time = Math.max(0, Math.floor(chrono.value / 1000));
                        }
                        timers[localKey].running = isRunning;
                    }
                });

                // Update display and manage countdowns
                Object.keys(timers).forEach(key => {
                    updateTimerDisplay(key);
                    if (timers[key].running) {
                        startLocalCountdown(key);
                    } else {
                        stopLocalCountdown(key);
                    }
                });

            } catch (error) {
                console.error('❌ Error fetching timers:', error);
                console.log('Tentative de fetch via proxy...');

                // Fallback avec proxy si CORS échoue
                try {
                    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(API_URL);
                    const response = await fetch(proxyUrl);
                    const data = await response.json();

                    if (data.chronos) {
                        data.chronos.forEach(chrono => {
                            const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                            if (localKey && timers[localKey]) {
                                const wasRunning = timers[localKey].running;
                                const isRunning = chrono.status === 'running';

                                if (!isRunning || !wasRunning) {
                                    timers[localKey].time = Math.max(0, Math.floor(chrono.value / 1000));
                                }
                                timers[localKey].running = isRunning;
                            }
                        });

                        Object.keys(timers).forEach(key => {
                            updateTimerDisplay(key);
                            if (timers[key].running) {
                                startLocalCountdown(key);
                            } else {
                                stopLocalCountdown(key);
                            }
                        });
                    }
                } catch (proxyError) {
                    console.error('❌ Proxy also failed:', proxyError);
                }
            }
        }

        function updateTimerDisplay(timerId) {
            if (timers[timerId].animating) return;
            if (timerId === 'team') {
                const teamTime = document.getElementById('team-time');
                const teamStatus = document.getElementById('team-status');
                const teamSection = document.getElementById('team-section');

                if (!teamTime || !teamStatus || !teamSection) return;

                teamTime.textContent = formatTime(timers.team.time);

                teamTime.classList.remove('warning', 'danger', 'zero');
                teamSection.classList.remove('danger');

                if (timers.team.time === 0) {
                    teamTime.classList.add('zero');
                    teamSection.classList.add('danger');
                } else if (timers.team.time <= 10) {
                    teamTime.classList.add('danger');
                    teamSection.classList.add('danger');
                } else if (timers.team.time <= 60) {
                    teamTime.classList.add('warning');
                }

                if (timers.team.running) {
                    teamStatus.textContent = 'EN COURS';
                    teamStatus.className = 'team-status status-running';
                } else if (timers.team.time === 0) {
                    teamStatus.textContent = 'TEMPS ÉCOULÉ!';
                    teamStatus.className = 'team-status status-paused';
                } else if (timers.team.time === timers.team.initial) {
                    teamStatus.textContent = 'PRÊT';
                    teamStatus.className = 'team-status status-stopped';
                } else {
                    teamStatus.textContent = 'PAUSE';
                    teamStatus.className = 'team-status status-paused';
                }
            } else {
                // Person timers
                const timeEl = document.getElementById(`time-${timerId}`);
                const statusEl = document.getElementById(`status-${timerId}`);
                const cardEl = document.getElementById(`card-${timerId}`);

                if (!timeEl || !statusEl || !cardEl) return;

                const timer = timers[timerId];

                timeEl.textContent = formatTime(timer.time);

                timeEl.classList.remove('warning', 'danger', 'zero');
                cardEl.classList.remove('warning', 'danger');

                if (timer.time === 0) {
                    timeEl.classList.add('zero');
                    cardEl.classList.add('danger');
                } else if (timer.time <= 30) {
                    timeEl.classList.add('danger');
                    cardEl.classList.add('danger');
                } else if (timer.time <= 60) {
                    timeEl.classList.add('warning');
                    cardEl.classList.add('warning');
                }

                if (timer.running) {
                    statusEl.textContent = 'EN COURS';
                    statusEl.className = 'person-status status-running';
                    cardEl.classList.add('running');
                } else if (timer.time === 0) {
                    statusEl.textContent = 'TERMINÉ';
                    statusEl.className = 'person-status status-paused';
                    cardEl.classList.remove('running');
                } else if (timer.time === timer.initial) {
                    statusEl.textContent = 'PRÊT';
                    statusEl.className = 'person-status status-stopped';
                    cardEl.classList.remove('running');
                } else {
                    statusEl.textContent = 'PAUSE';
                    statusEl.className = 'person-status status-paused';
                    cardEl.classList.remove('running');
                }
            }
        }

        // ---- GLITCH EFFECT ----
        function triggerGlitch(element, intense = false) {
            if (!element) return;

            // Set data-text attribute for pseudo-element content
            element.setAttribute('data-text', element.textContent);

            // Add glitch class
            element.classList.add('glitch');
            if (intense) {
                element.classList.add('glitch-intense');
            }

            // Remove glitch class after animation completes
            setTimeout(() => {
                element.classList.remove('glitch', 'glitch-intense');
            }, intense ? 500 : 300);
        }

        function randomGlitch() {
            // Elements that can glitch
            const glitchTargets = [
                document.getElementById('team-time'),
                document.querySelector('.team-title'),
                ...document.querySelectorAll('.person-time'),
                ...document.querySelectorAll('.person-name')
            ].filter(el => el !== null);

            if (glitchTargets.length === 0) return;

            // Pick 1-3 random elements to glitch
            const numGlitches = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < numGlitches; i++) {
                const randomIndex = Math.floor(Math.random() * glitchTargets.length);
                const target = glitchTargets[randomIndex];

                // 20% chance for intense glitch
                const isIntense = Math.random() < 0.2;

                // Stagger the glitches slightly
                setTimeout(() => {
                    triggerGlitch(target, isIntense);
                }, i * 100);
            }
        }

        function startGlitchLoop() {
            // Random interval between 3-8 seconds
            const scheduleNextGlitch = () => {
                const delay = 3000 + Math.random() * 5000;
                setTimeout(() => {
                    randomGlitch();
                    scheduleNextGlitch();
                }, delay);
            };

            // Start the loop after initial delay
            setTimeout(scheduleNextGlitch, 2000);
        }

        // ---- APPLY ANIMATION (BroadcastChannel from control) ----
        const broadcastChannel = new BroadcastChannel('theroomchrono');
        broadcastChannel.onmessage = async (event) => {
            if (event.data.type === 'apply-animation') {
                await playAdjustAnimation(event.data);
            }
        };

        async function playAdjustAnimation({ adjustments, oldValues, newValues }) {
            const order = ['person1', 'person2', 'person3', 'person4', 'person5', 'team'];

            // Freeze ALL affected timers immediately so API polling doesn't update them
            for (const timerId of order) {
                if (!adjustments[timerId]) continue;
                timers[timerId].animating = true;
                stopLocalCountdown(timerId);
                const timeEl = timerId === 'team'
                    ? document.getElementById('team-time')
                    : document.getElementById(`time-${timerId}`);
                if (timeEl) timeEl.textContent = formatTime(oldValues[timerId]);
            }

            // Then animate one by one
            for (const timerId of order) {
                const delta = adjustments[timerId];
                if (!delta) continue;
                await animateTimerChange(timerId, delta, oldValues[timerId], newValues[timerId]);
            }
        }

        function animateTimerChange(timerId, delta, fromValue, toValue) {
            return new Promise(resolve => {
                const isTeam = timerId === 'team';
                const cardEl = isTeam
                    ? document.getElementById('team-section')
                    : document.getElementById(`card-${timerId}`);
                const timeEl = isTeam
                    ? document.getElementById('team-time')
                    : document.getElementById(`time-${timerId}`);

                if (!cardEl || !timeEl) { resolve(); return; }

                // Freeze normal display updates for this timer
                timers[timerId].animating = true;
                stopLocalCountdown(timerId);

                // Glow the card
                const animClass = delta > 0 ? 'timer-anim-add' : 'timer-anim-sub';
                cardEl.classList.add(animClass);

                // Floating delta label
                const overlay = document.createElement('div');
                overlay.className = `adjust-overlay ${delta > 0 ? 'adjust-add' : 'adjust-sub'}`;
                overlay.textContent = (delta > 0 ? '+' : '') + delta + 's';
                cardEl.appendChild(overlay);

                // Count the timer number from fromValue to toValue
                const duration = 2000;
                const startTime = performance.now();

                function step(now) {
                    const t = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
                    timeEl.textContent = formatTime(Math.round(fromValue + (toValue - fromValue) * eased));

                    if (t < 1) {
                        requestAnimationFrame(step);
                    } else {
                        timeEl.textContent = formatTime(toValue);
                        timers[timerId].time = toValue;
                        timers[timerId].animating = false;
                        overlay.remove();
                        cardEl.classList.remove(animClass);
                        if (timers[timerId].running) startLocalCountdown(timerId);
                        resolve();
                    }
                }

                requestAnimationFrame(step);
            });
        }

        // Poll l'API toutes les 500ms
        console.log('🚀 Starting timer display...');
        setInterval(fetchTimers, 500);
        fetchTimers();

        // Start the glitch effect loop
        startGlitchLoop();
        console.log('✨ Glitch effect enabled');
