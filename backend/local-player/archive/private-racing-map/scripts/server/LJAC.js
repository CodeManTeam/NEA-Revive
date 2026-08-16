const Canopy = (() => {
    const VERSION = "2.1.0";
    const PREFIX = "[Canopy]";

    const ViolationType = Object.freeze({
        SPEED_VIOLATION: "SPEED_VIOLATION",
        FLIGHT_ANOMALY: "FLIGHT_ANOMALY",
        FLIGHT_HOVER: "FLIGHT_HOVER",
        FLIGHT_ASCEND: "FLIGHT_ASCEND",
        FLIGHT_ZERO_G: "FLIGHT_ZERO_G",
        FLIGHT_AIR_SPEED: "FLIGHT_AIR_SPEED",
        FLIGHT_HIGH_HOVER: "FLIGHT_HIGH_HOVER",
        FLIGHT_VY_LOCK: "FLIGHT_VY_LOCK",
        TELEPORT_ANOMALY: "TELEPORT_ANOMALY",
        FALL_INTERRUPT: "FALL_INTERRUPT",
        VELOCITY_OVERFLOW: "VELOCITY_OVERFLOW",
        CLICK_AUTOMATION: "CLICK_AUTOMATION",
        RAYCAST_MANIPULATION: "RAYCAST_MANIPULATION",
        AIR_JUMP: "AIR_JUMP",
    });

    const ViolationDisplay = Object.freeze({
        [ViolationType.SPEED_VIOLATION]: "速度越限",
        [ViolationType.FLIGHT_ANOMALY]: "飞行异常",
        [ViolationType.FLIGHT_HOVER]: "悬浮滞空",
        [ViolationType.FLIGHT_ASCEND]: "逆重力上升",
        [ViolationType.FLIGHT_ZERO_G]: "失重下落",
        [ViolationType.FLIGHT_AIR_SPEED]: "空中越速",
        [ViolationType.FLIGHT_HIGH_HOVER]: "高空悬浮",
        [ViolationType.FLIGHT_VY_LOCK]: "纵速锁定",
        [ViolationType.TELEPORT_ANOMALY]: "瞬移异常",
        [ViolationType.FALL_INTERRUPT]: "坠落中断",
        [ViolationType.VELOCITY_OVERFLOW]: "速度溢出",
        [ViolationType.CLICK_AUTOMATION]: "自动点击",
        [ViolationType.RAYCAST_MANIPULATION]: "射线偏移",
        [ViolationType.AIR_JUMP]: "空中连跳",
    });

    const ExemptReason = Object.freeze({
        DAMAGE_KNOCKBACK: "DAMAGE_KNOCKBACK",
        VEHICLE: "VEHICLE",
        RESPAWN: "RESPAWN",
        JOIN: "JOIN",
        PLATFORM_MOVEMENT: "PLATFORM_MOVEMENT",
        SWIM: "SWIM",
        TELEPORT_SCRIPT: "TELEPORT_SCRIPT",
    });

    const ExemptReasonDisplay = Object.freeze({
        [ExemptReason.DAMAGE_KNOCKBACK]: "受击击退保护期",
        [ExemptReason.VEHICLE]: "载具乘骑保护期",
        [ExemptReason.RESPAWN]: "重生状态保护期",
        [ExemptReason.JOIN]: "上线初始化保护期",
        [ExemptReason.PLATFORM_MOVEMENT]: "平台运动保护期",
        [ExemptReason.SWIM]: "涉水状态保护期",
        [ExemptReason.TELEPORT_SCRIPT]: "脚本传送保护期",
    });

    const ActionLevel = Object.freeze({ WARN: 0, KICK: 1, BAN: 2 });

    let _config = {
        sampleWindowSize: 10,
        violationDecayMs: 300000,
        violationCooldownMs: 10,
        violationGradualDecay: true,
        violationDecayRate: 1,
        thresholdWarn: 3,
        thresholdKick: 5,
        thresholdBan: 10,
        speedTolerance: 2.5,
        speedBurstTicks: 5,
        flyMinHoverTicks: 5,
        flyVyThreshold: 0.05,
        flyHSpeedThreshold: 0.03,
        teleportDistance: 20,
        teleportSpeedMultiplier: 3.0,
        antiFallThreshold: 10,
        impossibleVelocityMax: 30,
        reportIntervalMs: 3000,
        enableSpeedCheck: true,
        enableFlyCheck: true,
        enableTeleportAnomalyCheck: true,
        enableFallInterruptCheck: true,
        enableVelocityOverflowCheck: true,
        exemptKnockbackTicks: 10,
        exemptRespawnTicks: 6,
        exemptJoinTicks: 128,
        exemptPlatformHistorySize: 5,
        exemptPlatformVelocityThreshold: 0.2,
        physicsHoverMinTicks: 15,
        physicsRisingMinTicks: 8,
        physicsNoGravityMinTicks: 5,
        physicsAirSpeedMinTicks: 6,
        physicsHoverVyTolerance: 0.03,
        physicsRisingVyMin: 0.15,
        physicsNoGravityVyMax: 0.03,
        physicsAirSpeedMultiplier: 1.3,
        physicsYHistorySize: 30,
        physicsHoverHighVyMin: 0.4,
        physicsHoverHighMinTicks: 6,
        physicsVyStableWindow: 10,
        physicsVyStableVariance: 0.01,
        physicsVyStableMinTicks: 5,
        physicsVyStableVyMin: 0.15,
        enableAutoClickCheck: true,
        autoClickMaxPerSecond: 35,
        autoClickDecayIntervalMs: 1000,
        enableRaycastOffsetCheck: true,
        raycastOffsetDistanceTolerance: 2,
        raycastOffsetMaxViolations: 5,
        raycastOffsetDecayMs: 30000,
        lagSuppressionMs: 80,
        enableLagSuppression: true,
        enableVoxelGroundCheck: true,
        voxelGroundCheckRange: 3,
        enableEnforcement: true,
        bannedList: [],
        enableAirJumpCheck: true,
        airJumpMinBoosts: 3,
        airJumpVyBoostThreshold: 0.25,
        enableAntiFallEnhanced: false,
        antiFallVyDecelMin: 0.05,
    };

    const configure = (overrides) => { Object.assign(_config, overrides); };

    const _playerStates = new Map();
    let _maxElapsedMs = 0;
    const _banned = new Set(_config.bannedList);
    let _globalTickCounter = 0;

    const _getPlayerState = (entity) => {
        let state = _playerStates.get(entity);
        if (!state) {
            state = {
                entity,
                violations: new Map(),
                positionHistory: [],
                velocityHistory: [],
                hoverTicks: 0,
                wasJumping: false,
                lastSafeY: entity.position.y,
                lastViolationTick: new Map(),
                speedBurstCount: 0,
                lastWalkState: entity.player.walkState,
                walkStateChangeTick: 0,
                gameTick: 0,
                tickDelta: 1,
                lastElapsedTimeMS: 64,
                skipFrame: false,
                exemptReasons: new Map(),
                exemptLog: [],
                lastDamageTick: -999,
                lastRespawnTick: -999,
                joinTick: 0,
                physicsHoverTicks: 0,
                physicsRisingTicks: 0,
                physicsNoGravityTicks: 0,
                physicsAirSpeedTicks: 0,
                physicsHoverHighTicks: 0,
                physicsVyStableTicks: 0,
                vyHistory: [],
                yPositionHistory: [],
                lastGroundY: entity.position.y,
                lastGroundTick: 0,
                airTicks: 0,
                prevPos: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
                autoClickCount: 0,
                autoClickLastReset: Date.now(),
                raycastOffsetViolations: 0,
                raycastOffsetLastViolation: 0,
                airJumpBoostCount: 0,
                lastJump2Vy: 0,
                inJump2State: false,
                jump2StartTick: 0,
                fallVyHistory: [],
                lastFallVy: 0,
            };
            _playerStates.set(entity, state);
        }
        return state;
    };

    const _grantExempt = (state, reason, durationTicks) => {
        const until = state.gameTick + durationTicks;
        const existing = state.exemptReasons.get(reason);
        if (!existing || until > existing) {
            state.exemptReasons.set(reason, until);
        }
        const retroactiveMs = (durationTicks / 2) * (state.lastElapsedTimeMS || 64);
        const now = Date.now();
        const exemptMap = {
            [ExemptReason.DAMAGE_KNOCKBACK]: [ViolationType.SPEED_VIOLATION, ViolationType.FLIGHT_ANOMALY, ViolationType.FLIGHT_HOVER, ViolationType.FLIGHT_ASCEND, ViolationType.FLIGHT_ZERO_G, ViolationType.FLIGHT_AIR_SPEED, ViolationType.FLIGHT_HOVER_HIGH, ViolationType.FLIGHT_VY_LOCK, ViolationType.TELEPORT_ANOMALY, ViolationType.FALL_INTERRUPT, ViolationType.VELOCITY_OVERFLOW, ViolationType.CLICK_AUTOMATION, ViolationType.RAYCAST_MANIPULATION, ViolationType.AIR_JUMP],
            [ExemptReason.VEHICLE]: [ViolationType.SPEED_VIOLATION, ViolationType.FLIGHT_ANOMALY, ViolationType.FLIGHT_HOVER, ViolationType.FLIGHT_ASCEND, ViolationType.FLIGHT_ZERO_G, ViolationType.FLIGHT_AIR_SPEED, ViolationType.FLIGHT_HOVER_HIGH, ViolationType.FLIGHT_VY_LOCK, ViolationType.TELEPORT_ANOMALY, ViolationType.FALL_INTERRUPT, ViolationType.VELOCITY_OVERFLOW, ViolationType.CLICK_AUTOMATION, ViolationType.RAYCAST_MANIPULATION, ViolationType.AIR_JUMP],
            [ExemptReason.RESPAWN]: [ViolationType.SPEED_VIOLATION, ViolationType.FLIGHT_ANOMALY, ViolationType.FLIGHT_HOVER, ViolationType.FLIGHT_ASCEND, ViolationType.FLIGHT_ZERO_G, ViolationType.FLIGHT_AIR_SPEED, ViolationType.FLIGHT_HOVER_HIGH, ViolationType.FLIGHT_VY_LOCK, ViolationType.TELEPORT_ANOMALY, ViolationType.FALL_INTERRUPT, ViolationType.VELOCITY_OVERFLOW, ViolationType.CLICK_AUTOMATION, ViolationType.RAYCAST_MANIPULATION, ViolationType.AIR_JUMP],
            [ExemptReason.JOIN]: [ViolationType.SPEED_VIOLATION, ViolationType.FLIGHT_ANOMALY, ViolationType.FLIGHT_HOVER, ViolationType.FLIGHT_ASCEND, ViolationType.FLIGHT_ZERO_G, ViolationType.FLIGHT_AIR_SPEED, ViolationType.FLIGHT_HOVER_HIGH, ViolationType.FLIGHT_VY_LOCK, ViolationType.TELEPORT_ANOMALY, ViolationType.FALL_INTERRUPT, ViolationType.VELOCITY_OVERFLOW, ViolationType.CLICK_AUTOMATION, ViolationType.RAYCAST_MANIPULATION, ViolationType.AIR_JUMP],
            [ExemptReason.PLATFORM_MOVEMENT]: [ViolationType.SPEED_VIOLATION, ViolationType.FLIGHT_ANOMALY, ViolationType.FLIGHT_HOVER, ViolationType.FLIGHT_ASCEND, ViolationType.FLIGHT_ZERO_G, ViolationType.FLIGHT_AIR_SPEED, ViolationType.FLIGHT_HOVER_HIGH, ViolationType.FLIGHT_VY_LOCK, ViolationType.FALL_INTERRUPT],
            [ExemptReason.SWIM]: [ViolationType.FLIGHT_ANOMALY, ViolationType.FLIGHT_HOVER],
            [ExemptReason.TELEPORT_SCRIPT]: [ViolationType.TELEPORT_ANOMALY],
        };
        const affectedTypes = exemptMap[reason] || [];
        for (const vType of affectedTypes) {
            const entry = state.violations.get(vType);
            if (entry && entry.count > 0 && (now - entry.lastTick) < retroactiveMs) {
                const removed = entry.count;
                state.violations.delete(vType);
                console.log(`${PREFIX} ${state.entity.player.name} 回溯保护 => ${vType} x${removed} [${ExemptReasonDisplay[reason]}] retro=${(retroactiveMs / 1000).toFixed(1)}s`);
            }
        }
    };

    const _isExempt = (state, violationType) => {
        const tick = state.gameTick;
        const exemptMap = {
            [ViolationType.SPEED_VIOLATION]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.FLIGHT_ANOMALY]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT, ExemptReason.SWIM],
            [ViolationType.FLIGHT_HOVER]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT, ExemptReason.SWIM],
            [ViolationType.FLIGHT_ASCEND]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.FLIGHT_ZERO_G]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.FLIGHT_AIR_SPEED]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.FLIGHT_HOVER_HIGH]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.FLIGHT_VY_LOCK]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.TELEPORT_ANOMALY]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.TELEPORT_SCRIPT],
            [ViolationType.FALL_INTERRUPT]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN, ExemptReason.PLATFORM_MOVEMENT],
            [ViolationType.VELOCITY_OVERFLOW]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN],
            [ViolationType.CLICK_AUTOMATION]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN],
            [ViolationType.RAYCAST_MANIPULATION]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN],
            [ViolationType.AIR_JUMP]: [ExemptReason.DAMAGE_KNOCKBACK, ExemptReason.VEHICLE, ExemptReason.RESPAWN, ExemptReason.JOIN],
        };
        const allowed = exemptMap[violationType] || [];
        for (const [reason, until] of state.exemptReasons) {
            if (tick < until && allowed.includes(reason)) {
                return reason;
            }
        }
        return null;
    };

    const _addViolation = (state, type, detail) => {
        const exemptReason = _isExempt(state, type);
        if (exemptReason) {
            const now = Date.now();
            const lastLog = state.exemptLog[state.exemptLog.length - 1];
            if (!lastLog || lastLog.type !== type || now - lastLog.time > 2000) {
                state.exemptLog.push({ type, reason: exemptReason, time: now });
                if (state.exemptLog.length > 20) state.exemptLog.shift();
                console.log(`${PREFIX} ${state.entity.player.name} ${type} 处于保护期，跳过判定 [${ExemptReasonDisplay[exemptReason]}] ${detail || ""}`);
            }
            return;
        }
        const now = Date.now();
        const lastTick = state.lastViolationTick.get(type) || 0;
        if (now - lastTick < _config.violationCooldownMs) return;
        state.lastViolationTick.set(type, now);
        let entry = state.violations.get(type);
        if (!entry) {
            entry = { timestamps: [], lastTick: 0, firstTick: now };
            state.violations.set(type, entry);
        }
        if (_config.violationGradualDecay) {
            entry.timestamps = entry.timestamps.filter(t => now - t < _config.violationDecayMs);
        } else {
            if (now - entry.lastTick > _config.violationDecayMs) {
                entry.timestamps = [];
                entry.firstTick = now;
            }
        }
        entry.timestamps.push(now);
        entry.lastTick = now;
        const count = entry.timestamps.length;
        const capturedEntry = entry;
        setTimeout(() => {
            if (state.violations.has(type) && state.violations.get(type) === capturedEntry && capturedEntry.timestamps.length > 0) {
                UI.toastAll(`${PREFIX} ${state.entity.player.name} => ${type}/${ViolationDisplay[type]} [${capturedEntry.timestamps.length}] ${detail || ""}`, "warn");
            }
        }, 1000);
    };

    const _getViolationScore = (state) => {
        const now = Date.now();
        let score = 0;
        for (const [, entry] of state.violations) {
            if (_config.violationGradualDecay) {
                const validTimestamps = entry.timestamps.filter(t => now - t < _config.violationDecayMs);
                score += validTimestamps.length;
            } else {
                if (now - entry.lastTick < _config.violationDecayMs) score += entry.timestamps.length;
            }
        }
        return score;
    };

    const _getViolationSummary = (state) => {
        const now = Date.now();
        const lines = [];
        for (const [type, entry] of state.violations) {
            let count;
            if (_config.violationGradualDecay) {
                count = entry.timestamps.filter(t => now - t < _config.violationDecayMs).length;
            } else {
                count = now - entry.lastTick < _config.violationDecayMs ? entry.timestamps.length : 0;
            }
            if (count > 0) {
                lines.push(`  ${type}/${ViolationDisplay[type]} x${count}`);
            }
        }
        return lines;
    };


    const _horizontalSpeed = (v) => Math.sqrt(v.x * v.x + v.z * v.z);
    const _distance3d = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    const _isOnGround = (ms) => ms === GamePlayerMoveState.GROUND;
    const _isInAir = (ms) => ms === GamePlayerMoveState.FALL || ms === GamePlayerMoveState.JUMP || ms === GamePlayerMoveState.DOUBLE_JUMP || ms === GamePlayerMoveState.FLYING;

    const _detectExemptions = (state) => {
        const entity = state.entity;
        if (entity.player.moveState === GamePlayerMoveState.SWIM) {
            _grantExempt(state, ExemptReason.SWIM, 5);
        }
        const vh = state.velocityHistory;
        if (vh.length >= _config.exemptPlatformHistorySize) {
            const recent = vh.slice(-_config.exemptPlatformHistorySize);
            let allMovingUp = true;
            for (let i = 1; i < recent.length; i++) {
                if (recent[i].y <= recent[i - 1].y + _config.exemptPlatformVelocityThreshold) {
                    allMovingUp = false;
                    break;
                }
            }
            if (allMovingUp && _isOnGround(entity.player.moveState)) {
                _grantExempt(state, ExemptReason.PLATFORM_MOVEMENT, 10);
            }
        }
    };

    const _checkSpeed = (state) => {
        if (!_config.enableSpeedCheck) return;
        const entity = state.entity;
        const player = entity.player;
        if (player.spectator) return;
        const delta = state.tickDelta || 1;
        const hSpeed = _horizontalSpeed(entity.velocity) / delta;
        if (player.walkState !== state.lastWalkState) {
            state.lastWalkState = player.walkState;
            state.walkStateChangeTick = state.gameTick;
            state.speedBurstCount = 0;
        }
        if (state.gameTick - state.walkStateChangeTick < _config.speedBurstTicks) return;
        let maxAllowed;
        switch (player.walkState) {
            case GamePlayerWalkState.CROUCH: maxAllowed = player.crouchSpeed * _config.speedTolerance + 0.1; break;
            case GamePlayerWalkState.WALK: maxAllowed = player.walkSpeed * _config.speedTolerance + 0.1; break;
            case GamePlayerWalkState.RUN: maxAllowed = player.runSpeed * _config.speedTolerance + 0.1; break;
            default: maxAllowed = player.runSpeed * _config.speedTolerance + 0.1;
        }
        if (hSpeed > maxAllowed) {
            state.speedBurstCount++;
            if (state.speedBurstCount >= _config.speedBurstTicks) {
                _addViolation(state, ViolationType.SPEED_VIOLATION, `hSpeed=${hSpeed.toFixed(3)} max=${maxAllowed.toFixed(3)}`);
            }
        } else {
            state.speedBurstCount = 0;
        }
    };

    const _checkFly = (state) => {
        if (!_config.enableFlyCheck) return;
        const entity = state.entity;
        const player = entity.player;
        if (player.spectator) return;
        const moveState = player.moveState;
        const velocity = entity.velocity;
        const vy = velocity.y;
        const delta = state.tickDelta || 1;
        const hSpeed = _horizontalSpeed(velocity) / delta;

        if (player.canFly) {
            state.hoverTicks = 0;
            state.wasJumping = false;
            state.physicsHoverTicks = 0;
            state.physicsRisingTicks = 0;
            state.physicsNoGravityTicks = 0;
            state.physicsAirSpeedTicks = 0;
            state.physicsHoverHighTicks = 0;
            state.physicsVyStableTicks = 0;
            state.airTicks = 0;
            state.vyHistory = [];
            return;
        }

        const pos = entity.position;
        state.yPositionHistory.push(pos.y);
        if (state.yPositionHistory.length > _config.physicsYHistorySize) {
            state.yPositionHistory.shift();
        }

        state.vyHistory.push(vy);
        if (state.vyHistory.length > _config.physicsVyStableWindow) {
            state.vyHistory.shift();
        }

        const onGround = _isOnGround(moveState);
        const inSwim = moveState === GamePlayerMoveState.SWIM;

        if (onGround || inSwim) {
            state.lastGroundY = pos.y;
            state.lastGroundTick = state.gameTick;
            state.airTicks = 0;
            state.physicsHoverTicks = 0;
            state.physicsRisingTicks = 0;
            state.physicsNoGravityTicks = 0;
            state.physicsAirSpeedTicks = 0;
            state.physicsHoverHighTicks = 0;
            state.physicsVyStableTicks = 0;
            state.hoverTicks = 0;
            state.wasJumping = false;
            state.vyHistory = [];
            return;
        }

        state.airTicks += (state.tickDelta || 1);

        if (moveState === GamePlayerMoveState.JUMP || moveState === GamePlayerMoveState.DOUBLE_JUMP) {
            state.wasJumping = true;
            state.physicsHoverTicks = 0;
            state.physicsRisingTicks = 0;
            state.physicsNoGravityTicks = 0;
            state.physicsHoverHighTicks = 0;
            return;
        }

        const gravity = Math.abs(world.gravity || 0.1);
        const airFriction = world.airFriction || 0.01;
        const maxAirHSpeed = player.flySpeed * _config.physicsAirSpeedMultiplier;
        const isNormalAir = state.wasJumping && state.airTicks < 60;
        const yh = state.yPositionHistory;

        if (Math.abs(vy) < _config.physicsHoverVyTolerance && hSpeed > _config.flyHSpeedThreshold) {
            if (!isNormalAir && state.airTicks > 10) {
                state.physicsHoverTicks++;
                if (state.physicsHoverTicks >= _config.physicsHoverMinTicks) {
                    _addViolation(state, ViolationType.FLIGHT_HOVER, `hover=${state.physicsHoverTicks} vy=${vy.toFixed(3)} hSpeed=${hSpeed.toFixed(3)} airTicks=${state.airTicks}`);
                }
            }
        } else {
            state.physicsHoverTicks = Math.max(0, state.physicsHoverTicks - 1);
        }

        if (vy > _config.physicsHoverHighVyMin && state.airTicks > 10) {
            state.physicsHoverHighTicks++;
            if (state.physicsHoverHighTicks >= _config.physicsHoverHighMinTicks) {
                _addViolation(state, ViolationType.FLIGHT_HOVER_HIGH, `vy=${vy.toFixed(3)} ticks=${state.physicsHoverHighTicks} airTicks=${state.airTicks}`);
            }
        } else {
            state.physicsHoverHighTicks = Math.max(0, state.physicsHoverHighTicks - 1);
        }

        if (state.vyHistory.length >= _config.physicsVyStableWindow && Math.abs(vy) > _config.physicsVyStableVyMin) {
            const recentVy = state.vyHistory;
            const vyMean = recentVy.reduce((a, b) => a + b, 0) / recentVy.length;
            const vyVariance = recentVy.reduce((a, b) => a + (b - vyMean) ** 2, 0) / recentVy.length;
            if (vyVariance < _config.physicsVyStableVariance) {
                state.physicsVyStableTicks++;
                if (state.physicsVyStableTicks >= _config.physicsVyStableMinTicks) {
                    _addViolation(state, ViolationType.FLIGHT_VY_LOCK, `vyMean=${vyMean.toFixed(3)} variance=${vyVariance.toFixed(6)} ticks=${state.physicsVyStableTicks}`);
                }
            } else {
                state.physicsVyStableTicks = Math.max(0, state.physicsVyStableTicks - 1);
            }
        } else {
            state.physicsVyStableTicks = Math.max(0, state.physicsVyStableTicks - 1);
        }

        let positionRising = false;
        if (yh.length >= 10) {
            const recentY = yh.slice(-10);
            const oldestY = recentY[0];
            const newestY = recentY[recentY.length - 1];
            if (newestY - oldestY > 0.5) {
                let allRising = true;
                for (let i = 1; i < recentY.length; i++) {
                    if (recentY[i] < recentY[i - 1] - 0.1) {
                        allRising = false;
                        break;
                    }
                }
                positionRising = allRising;
            }
        }

        if (positionRising && moveState === GamePlayerMoveState.FALL) {
            state.physicsRisingTicks++;
            if (state.physicsRisingTicks >= _config.physicsRisingMinTicks) {
                _addViolation(state, ViolationType.FLIGHT_ASCEND, `posRising while FALL yDelta=${(yh[yh.length-1] - yh[Math.max(0,yh.length-10)]).toFixed(2)} ticks=${state.physicsRisingTicks}`);
            }
        } else if (vy > _config.physicsRisingVyMin && moveState === GamePlayerMoveState.FALL) {
            state.physicsRisingTicks++;
            if (state.physicsRisingTicks >= _config.physicsRisingMinTicks) {
                _addViolation(state, ViolationType.FLIGHT_ASCEND, `vy=${vy.toFixed(3)} while FALL state ticks=${state.physicsRisingTicks}`);
            }
        } else if ((positionRising || vy > _config.physicsRisingVyMin) && !state.wasJumping && state.airTicks > 30) {
            state.physicsRisingTicks++;
            if (state.physicsRisingTicks >= _config.physicsRisingMinTicks) {
                _addViolation(state, ViolationType.FLIGHT_ASCEND, `${positionRising ? 'posRising' : 'vy=' + vy.toFixed(3)} no jump source ticks=${state.physicsRisingTicks}`);
            }
        } else {
            state.physicsRisingTicks = Math.max(0, state.physicsRisingTicks - 1);
        }

        if (Math.abs(vy) < _config.physicsNoGravityVyMax && state.airTicks > 40 && !isNormalAir) {
            let positionNotFalling = true;
            if (yh.length >= 10) {
                const recentY = yh.slice(-10);
                const totalDrop = recentY[0] - recentY[recentY.length - 1];
                const expectedDrop = gravity * (1 - airFriction) * 10;
                if (totalDrop > expectedDrop * 0.3) {
                    positionNotFalling = false;
                }
            }
            if (positionNotFalling) {
                state.physicsNoGravityTicks++;
                if (state.physicsNoGravityTicks >= _config.physicsNoGravityMinTicks) {
                    const expectedFallSpeed = gravity * (1 - airFriction) * state.physicsNoGravityTicks;
                    _addViolation(state, ViolationType.FLIGHT_ZERO_G, `vy=${vy.toFixed(3)} expectedFall>=${expectedFallSpeed.toFixed(3)} ticks=${state.physicsNoGravityTicks} airTicks=${state.airTicks}`);
                }
            } else {
                state.physicsNoGravityTicks = Math.max(0, state.physicsNoGravityTicks - 1);
            }
        } else {
            state.physicsNoGravityTicks = Math.max(0, state.physicsNoGravityTicks - 1);
        }

        if (hSpeed > maxAirHSpeed && state.airTicks > 20 && !isNormalAir) {
            state.physicsAirSpeedTicks++;
            if (state.physicsAirSpeedTicks >= _config.physicsAirSpeedMinTicks) {
                _addViolation(state, ViolationType.FLIGHT_AIR_SPEED, `hSpeed=${hSpeed.toFixed(3)} max=${maxAirHSpeed.toFixed(3)} flySpeed=${player.flySpeed.toFixed(3)}`);
            }
        } else {
            state.physicsAirSpeedTicks = Math.max(0, state.physicsAirSpeedTicks - 1);
        }

        if (moveState === GamePlayerMoveState.FALL) {
            if (Math.abs(vy) < _config.flyVyThreshold && hSpeed > _config.flyHSpeedThreshold) {
                state.hoverTicks++;
                if (state.hoverTicks >= _config.flyMinHoverTicks) {
                    _addViolation(state, ViolationType.FLIGHT_ANOMALY, `hover=${state.hoverTicks} vy=${vy.toFixed(3)}`);
                }
            } else {
                state.hoverTicks = 0;
                if (state.wasJumping && vy < -0.5) state.wasJumping = false;
            }
        }

        if (_config.enableAirJumpCheck) {
            if (moveState === GamePlayerMoveState.DOUBLE_JUMP) {
                if (!state.inJump2State) {
                    state.inJump2State = true;
                    state.jump2StartTick = state.gameTick;
                    state.airJumpBoostCount = 0;
                    state.lastJump2Vy = vy;
                } else {
                    if (state.lastJump2Vy < -_config.airJumpVyBoostThreshold && vy > _config.airJumpVyBoostThreshold) {
                        state.airJumpBoostCount++;
                        if (state.airJumpBoostCount >= _config.airJumpMinBoosts) {
                            _addViolation(state, ViolationType.AIR_JUMP, `boosts=${state.airJumpBoostCount} prevVy=${state.lastJump2Vy.toFixed(3)} vy=${vy.toFixed(3)} jump2Ticks=${state.gameTick - state.jump2StartTick}`);
                        }
                    }
                    state.lastJump2Vy = vy;
                }
            } else if (state.inJump2State && moveState !== GamePlayerMoveState.DOUBLE_JUMP) {
                state.inJump2State = false;
                state.airJumpBoostCount = 0;
            }
        }
    };

    const _horizontalDist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);

    const _checkTeleport = (state) => {
        if (!_config.enableTeleportAnomalyCheck) return;
        const entity = state.entity;
        if (entity.player.spectator) return;
        const pos = entity.position;
        const prev = state.prevPos;
        const dist3d = _distance3d(pos, prev);
        if (dist3d > 16) {
            _addViolation(state, ViolationType.TELEPORT_ANOMALY, `dist3d=${dist3d.toFixed(2)}`);
        }
        state.prevPos = { x: pos.x, y: pos.y, z: pos.z };
    };

    const _checkAntiFall = (state) => {
        if (!_config.enableFallInterruptCheck) return;
        const entity = state.entity;
        if (entity.player.spectator) return;
        const moveState = entity.player.moveState;
        const vy = entity.velocity.y;
        const delta = state.tickDelta || 1;
        if (_isOnGround(moveState) || moveState === GamePlayerMoveState.SWIM) {
            state.lastSafeY = entity.position.y;
            state.wasFalling = false;
            return;
        }
        if (moveState === GamePlayerMoveState.JUMP || moveState === GamePlayerMoveState.DOUBLE_JUMP) {
            state.lastSafeY = entity.position.y;
            state.wasFalling = false;
            return;
        }
        if (Math.abs(vy) < 0.15) state.lastSafeY = entity.position.y;
        if (moveState === GamePlayerMoveState.FALL) {
            state.wasFalling = true;
            const drop = state.lastSafeY - entity.position.y;
            const normalizedThreshold = _config.antiFallThreshold * delta;
            if (drop > normalizedThreshold && vy > 0.3 && state.airTicks > 10) {
                _addViolation(state, ViolationType.FALL_INTERRUPT, `drop=${drop.toFixed(2)} normThreshold=${normalizedThreshold.toFixed(2)} delta=${delta} vy=${vy.toFixed(3)}`);
            }
            if (_config.enableAntiFallEnhanced) {
                if (state.lastFallVy < -0.5 && vy > 0.1) {
                    _addViolation(state, ViolationType.FALL_INTERRUPT, `fallBoost: prevVy=${state.lastFallVy.toFixed(3)} vy=${vy.toFixed(3)} drop=${drop.toFixed(2)}`);
                }
            }
            state.lastFallVy = vy;
        } else {
            state.lastFallVy = 0;
            state.fallVyHistory = [];
        }
    };

    const _checkImpossibleVelocity = (state) => {
        if (!_config.enableVelocityOverflowCheck) return;
        if (state.entity.player.spectator) return;
        const v = state.entity.velocity;
        const delta = state.tickDelta || 1;
        const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) / delta;
        if (mag > _config.impossibleVelocityMax) {
            _addViolation(state, ViolationType.VELOCITY_OVERFLOW, `mag=${mag.toFixed(2)} delta=${delta}`);
        }
    };

    const _checkAutoClick = (state) => {
        if (!_config.enableAutoClickCheck) return;
        const now = Date.now();
        if (now - state.autoClickLastReset >= _config.autoClickDecayIntervalMs) {
            state.autoClickCount = 0;
            state.autoClickLastReset = now;
        }
        if (state.autoClickCount > _config.autoClickMaxPerSecond) {
            _addViolation(state, ViolationType.CLICK_AUTOMATION, `autoClick=${state.autoClickCount} max=${_config.autoClickMaxPerSecond}`);
        }
    };

    const _onPress = (event) => {
        const { entity, raycast } = event;
        if (entity.destroyed) return;
        const state = _playerStates.get(entity);
        if (!state) return;
        state.autoClickCount++;
        _checkAutoClick(state);
        if (_config.enableRaycastOffsetCheck && raycast) {
            if (!raycast.hit || raycast.distance === Infinity) return;
            if (entity.player.cameraMode !== 'fps') return;
            if (_isLagging()) return;
            const actualDist = _distance3d(raycast.hitPosition, entity.position);
            const diff = Math.abs(actualDist - raycast.distance);
            if (diff > _config.raycastOffsetDistanceTolerance) {
                const now = Date.now();
                state.raycastOffsetViolations++;
                state.raycastOffsetLastViolation = now;
                _addViolation(state, ViolationType.RAYCAST_MANIPULATION, `diff=${diff.toFixed(2)} actualDist=${actualDist.toFixed(2)} rayDist=${raycast.distance.toFixed(2)} violations=${state.raycastOffsetViolations}`);
            }
        }
    };

    const _isLagging = () => {
        if (!_config.enableLagSuppression) return false;
        return _maxElapsedMs > _config.lagSuppressionMs;
    };

    const _hasVoxelGroundBelow = (entity) => {
        if (!_config.enableVoxelGroundCheck) return true;
        const px = entity.position.x;
        const py = entity.position.y;
        const pz = entity.position.z;
        for (let i = 1; i <= _config.voxelGroundCheckRange; i++) {
            if (voxels.getVoxelId(px, py - i - 0.8, pz)) return true;
            if (voxels.getVoxelId(px, py - i - 0.8, pz + 1)) return true;
            if (voxels.getVoxelId(px + 1, py - i - 0.8, pz)) return true;
            if (voxels.getVoxelId(px + 1, py - i - 0.8, pz + 1)) return true;
        }
        return false;
    };

    const _executeAction = (state) => {
        const score = _getViolationScore(state);
        if (score >= _config.thresholdBan) { _reportViolations(state, ActionLevel.BAN); return; }
        if (score >= _config.thresholdKick) { _reportViolations(state, ActionLevel.KICK); return; }
        if (score >= _config.thresholdWarn) _reportViolations(state, ActionLevel.WARN);
    };

    const _reportViolations = (state, level) => {
        const summary = _getViolationSummary(state);
        if (summary.length === 0) return;
        const levelName = level === ActionLevel.BAN ? "BAN" : level === ActionLevel.KICK ? "KICK" : "WARN";
        const playerName = state.entity.player.name;
        const entity = state.entity;
        UI.dialog(state.entity, {
            type: DialogType.SELECT,
            title: `Canopy 灵境天幕 [${levelName}]`,
            content: `玩家 ${playerName} 存在异常行为模式，以下检测项触发违规:\n${summary.join("\n")}\n\n累计违规评分: ${_getViolationScore(state)}`,
            options: ["Confirm"]
        });
        if (level >= ActionLevel.KICK) console.error(`${PREFIX} [${levelName}] ${playerName} - score=${_getViolationScore(state)}`);
        if (!_config.enableEnforcement) return;
        if (level === ActionLevel.BAN) {
            _banned.add(entity.player.userId);
            UI.ban(entity);
            UI.toastAll(`${PREFIX} ${playerName} 累计违规评分已达封禁阈值，已执行封禁并移除出局`, "error");
        } else if (level === ActionLevel.KICK) {
            UI.ban(entity);
            UI.toastAll(`${PREFIX} ${playerName} 累计违规评分已达踢出阈值，已执行移除出局`, "error");
        }
    };

    const _onTick = (event) => {
        const { tick, prevTick, skip, elapsedTimeMS } = event;
        const tickDelta = tick - prevTick;
        const normalizedDelta = Math.max(1, tickDelta);
        if (tick % 16 === 0) _maxElapsedMs = 0;
        _maxElapsedMs = Math.max(_maxElapsedMs, elapsedTimeMS);
        const lagging = _isLagging();
        _globalTickCounter++;
        for (const [, state] of _playerStates) {
            const entity = state.entity;
            if (entity.destroyed) { _playerStates.delete(entity); continue; }
            state.gameTick = tick;
            state.tickDelta = normalizedDelta;
            state.lastElapsedTimeMS = elapsedTimeMS;
            state.skipFrame = skip;
            if (skip || lagging) {
                state.prevPos = { x: entity.position.x, y: entity.position.y, z: entity.position.z };
                continue;
            }
            const pos = entity.position;
            const vel = entity.velocity;
            state.positionHistory.push({ x: pos.x, y: pos.y, z: pos.z });
            if (state.positionHistory.length > _config.sampleWindowSize) state.positionHistory.shift();
            state.velocityHistory.push({ x: vel.x, y: vel.y, z: vel.z });
            if (state.velocityHistory.length > _config.exemptPlatformHistorySize + 2) state.velocityHistory.shift();
            _detectExemptions(state);
            _checkSpeed(state);
            _checkFly(state);
            _checkTeleport(state);
            _checkAntiFall(state);
            _checkImpossibleVelocity(state);
            if (_globalTickCounter % 60 === 0) {
                state.raycastOffsetViolations = 0;
            }
        }
    };

    const _reportLoop = () => {
        for (const [, state] of _playerStates) {
            if (!state.entity.destroyed) _executeAction(state);
        }
    };

    const _handleRespawn = (entity) => {
        const state = _playerStates.get(entity);
        if (!state) return;
        state.lastRespawnTick = state.gameTick;
        state.hoverTicks = 0;
        state.wasJumping = false;
        state.speedBurstCount = 0;
        state.positionHistory = [];
        state.velocityHistory = [];
        state.physicsHoverTicks = 0;
        state.physicsRisingTicks = 0;
        state.physicsNoGravityTicks = 0;
        state.physicsAirSpeedTicks = 0;
        state.physicsHoverHighTicks = 0;
        state.physicsVyStableTicks = 0;
        state.vyHistory = [];
        state.yPositionHistory = [];
        state.airTicks = 0;
        const pos = entity.position;
        state.prevPos = { x: pos.x, y: pos.y, z: pos.z };
        _grantExempt(state, ExemptReason.RESPAWN, _config.exemptRespawnTicks);
        console.log(`${PREFIX} ${entity.player.name} 重生 => ${ExemptReasonDisplay[ExemptReason.RESPAWN]} (${_config.exemptRespawnTicks}t)`);
    };

    let _tickHandle = null;
    let _reportHandle = null;
    let _joinHandle = null;
    let _damageHandle = null;
    let _worldRespawnHandle = null;
    let _pressHandle = null;
    let _notifyHandle = null;
    const _playerRespawnHandles = new Map();

    const install = () => {
        _joinHandle = world.onPlayerJoin(({ entity }) => {
            const state = _getPlayerState(entity);
            state.joinTick = state.gameTick;
            _grantExempt(state, ExemptReason.JOIN, _config.exemptJoinTicks);
            console.log(`${PREFIX} ${entity.player.name} 加入 => ${ExemptReasonDisplay[ExemptReason.JOIN]} (${_config.exemptJoinTicks}t)`);
            if (!_playerRespawnHandles.has(entity)) {
                _playerRespawnHandles.set(entity, entity.player.onRespawn(() => _handleRespawn(entity)));
            }
            if (_banned.has(entity.player.userId)) {
                // entity.player.kick();
                UI.ban(entity);
                console.log(`${PREFIX} ${entity.player.name} 在封禁名单中，已执行踢出`);
            }
        });
        _damageHandle = world.onTakeDamage(({ entity }) => {
            const pe = entity.isPlayer ? entity : null;
            if (!pe) return;
            const state = _playerStates.get(pe);
            if (!state) return;
            state.lastDamageTick = state.gameTick;
            _grantExempt(state, ExemptReason.DAMAGE_KNOCKBACK, _config.exemptKnockbackTicks);
            console.log(`${PREFIX} ${pe.player.name} 受击 => ${ExemptReasonDisplay[ExemptReason.DAMAGE_KNOCKBACK]} (${_config.exemptKnockbackTicks}t)`);
        });
        _worldRespawnHandle = world.onRespawn(({ entity }) => {
            if (entity.isPlayer) _handleRespawn(entity);
        });
        _pressHandle = world.onPress(_onPress);
        _tickHandle = world.onTick(_onTick);
        _reportHandle = setInterval(_reportLoop, _config.reportIntervalMs);
        UI.toastAll(`${PREFIX} LIJ-Anti [Canopy] v${VERSION} 灵境天幕反作弊系统已就绪`, "info");
    };

    const uninstall = () => {
        if (_tickHandle) { _tickHandle.unsub?.(); _tickHandle = null; }
        if (_reportHandle) { clearInterval(_reportHandle); _reportHandle = null; }
        if (_joinHandle) { _joinHandle.unsub?.(); _joinHandle = null; }
        if (_damageHandle) { _damageHandle.unsub?.(); _damageHandle = null; }
        if (_worldRespawnHandle) { _worldRespawnHandle.unsub?.(); _worldRespawnHandle = null; }
        if (_pressHandle) { _pressHandle.unsub?.(); _pressHandle = null; }
        if (_notifyHandle) { clearInterval(_notifyHandle); _notifyHandle = null; }
        for (const [, h] of _playerRespawnHandles) { h.unsub?.(); }
        _playerRespawnHandles.clear();
        _playerStates.clear();
        console.log(`${PREFIX} Canopy 已卸载`);
    };

    const getStats = () => {
        const stats = {};
        for (const [entity, state] of _playerStates) {
            const name = entity.player?.name || "unknown";
            const activeExempts = [];
            for (const [reason, until] of state.exemptReasons) {
                const remaining = until - state.gameTick;
                if (remaining > 0) activeExempts.push({ reason, display: ExemptReasonDisplay[reason], remaining });
            }
            stats[name] = {
                score: _getViolationScore(state),
                gameTick: state.gameTick,
                tickDelta: state.tickDelta,
                lastElapsedTimeMS: state.lastElapsedTimeMS,
                skipFrame: state.skipFrame,
                lagging: _isLagging(),
                maxElapsedMs: _maxElapsedMs,
                exempt: activeExempts,
                exemptLog: state.exemptLog.slice(-5),
                violations: Object.fromEntries([...state.violations].map(([type, entry]) => [type, entry.count])),
                autoClickCount: state.autoClickCount,
                raycastOffsetViolations: state.raycastOffsetViolations,
            };
        }
        stats._banned = [..._banned];
        return stats;
    };

    const grantProtection = (entity, reason, durationTicks) => {
        const state = _playerStates.get(entity);
        if (!state) return;
        _grantExempt(state, reason, durationTicks);
        console.log(`${PREFIX} ${entity.player.name} 手动授予保护 => ${ExemptReasonDisplay[reason] || reason} (${durationTicks}t)`);
    };

    const ban = (userId) => {
        _banned.add(userId);
        console.log(`${PREFIX} userId=${userId} 已加入封禁列表`);
    };

    const unban = (userId) => {
        _banned.delete(userId);
        console.log(`${PREFIX} userId=${userId} 已从封禁列表移除`);
    };

    const isBanned = (userId) => _banned.has(userId);

    return Object.freeze({
        VERSION, ViolationType, ViolationDisplay, ExemptReason, ExemptReasonDisplay, ActionLevel,
        configure, install, uninstall, getStats, grantProtection, ban, unban, isBanned,
    });
})();

Canopy.install;

module.exports = { Canopy };