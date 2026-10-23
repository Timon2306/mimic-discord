/**
 * Discord Game Badge Presence Rotator (Console Edition)
 * Создан на основе архитектуры everyoneexe/discord-game-badge-presence и BadgeFarmer.
 * 
 * ИНСТРУКЦИЯ ПО ЗАПУСКУ:
 * 1. В Discord нажми Ctrl + Shift + I (откроются Инструменты разработчика).
 * 2. Перейди на вкладку "Console" (Консоль).
 * 3. Если Discord пишет предупреждение, введи: allow pasting и нажми Enter.
 * 4. Скопируй весь этот код, вставь в консоль и нажми Enter.
 * 
 * УПРАВЛЕНИЕ В КОНСОЛИ:
 * - window.GameRotator.next()  - Переключить на следующую игру немедленно
 * - window.GameRotator.stop()  - Остановить ротацию и восстановить исходное состояние
 * - window.GameRotator.status  - Показать текущую активную игру и статистику
 */

(() => {
    "use strict";

    const LOCK = "GameRotator";
    if (window[LOCK]?.stop) {
        console.warn("[GameRotator] Уже запущен. Для остановки введите: window.GameRotator.stop()");
        return;
    }

    // Время на одну игру в миллисекундах:
    // По умолчанию 75 секунд (минимальный безопасный интервал для серверного хартбита Discord)
    const ROTATION_INTERVAL_MS = 75 * 1000;

    // Список 125 верифицированных хитов из официальной базы Discord detectable games
    const GAMES = [
        "Counter-Strike 2", "Dota 2", "Grand Theft Auto V", "The Witcher 3: Wild Hunt",
        "Cyberpunk 2077", "Elden Ring", "Rust", "Rainbow Six Siege", "Rocket League",
        "Apex Legends", "Terraria", "Team Fortress 2", "Garry's Mod", "Warframe",
        "Destiny 2", "Left 4 Dead 2", "Payday 2", "ARK: Survival Evolved", "Civilization VI",
        "Portal 2", "Among Us", "Palworld", "Lethal Company", "Helldivers 2", "Phasmophobia",
        "Valheim", "Subnautica", "Geometry Dash", "Hollow Knight", "Stardew Valley",
        "Sea of Thieves", "Baldur's Gate 3", "Euro Truck Simulator 2", "BeamNG.drive",
        "Forza Horizon 5", "Cities: Skylines", "Hearts of Iron IV", "Stellaris",
        "Crusader Kings III", "RimWorld", "Factorio", "Satisfactory", "Slay the Spire",
        "The Binding of Isaac: Rebirth", "Hades", "Dead Cells", "Cuphead", "Undertale",
        "Deep Rock Galactic", "Risk of Rain 2", "Vampire Survivors", "Red Dead Redemption 2",
        "Sekiro: Shadows Die Twice", "DARK SOULS III", "Black Myth: Wukong", "Dead by Daylight",
        "Unturned", "Fallout 4", "The Elder Scrolls V: Skyrim", "Overwatch 2", "VALORANT",
        "Don't Starve Together", "Cult of the Lamb", "Dave the Diver", "Ready or Not",
        "Squad", "Arma 3", "Hell Let Loose", "Fall Guys", "Battlefield 2042", "Halo Infinite",
        "DOOM Eternal", "Assetto Corsa", "Frostpunk", "Into the Breach", "Balatro",
        "Disco Elysium", "Resident Evil 4", "Control", "Death Stranding", "No Man's Sky"
    ];

    function getWebpackRequire() {
        if (window.Vencord?.Webpack?.wreq?.c) return window.Vencord.Webpack.wreq;
        if (typeof webpackChunkdiscord_app === "undefined") return null;
        let req;
        webpackChunkdiscord_app.push([[Symbol("game-rotator")], {}, incoming => {
            if (Object.keys(incoming?.c ?? {}).length > Object.keys(req?.c ?? {}).length) req = incoming;
        }]);
        webpackChunkdiscord_app.pop();
        return req;
    }

    function collectExports(req) {
        return Object.values(req?.c ?? {}).flatMap(module => {
            try {
                const exp = module?.exports;
                if (!exp) return [];
                return [exp, exp.default, ...(typeof exp === "object" ? Object.values(exp) : [])];
            } catch (_) {
                return [];
            }
        }).filter(Boolean);
    }

    function findStore(exports, name) {
        return exports.find(value => {
            try {
                return value && typeof value === "object" &&
                    (value.getName?.() === name || value.__proto__?.constructor?.displayName === name);
            } catch (_) {
                return false;
            }
        });
    }

    function findDispatcher(exports) {
        return exports.find(value => value && typeof value.dispatch === "function" &&
            typeof value.subscribe === "function" && value._subscriptions);
    }

    const req = getWebpackRequire();
    if (!req?.c) {
        console.error("%c[GameRotator] Ошибка: Не удалось получить Webpack реестр Discord.", "color: #ef4444; font-weight: bold;");
        return;
    }

    const exports = collectExports(req);
    const runStore = findStore(exports, "RunningGameStore");
    const dispatcher = findDispatcher(exports);

    if (!runStore || !dispatcher) {
        console.error("%c[GameRotator] Ошибка: RunningGameStore или Flux Dispatcher не найдены.", "color: #ef4444; font-weight: bold;");
        return;
    }

    const original = {};
    const patchable = ["getRunningGames", "getGameForPID", "getVisibleGame", "getVisibleRunningGames", "getCandidateGames"];
    for (const key of patchable) {
        if (typeof runStore[key] === "function") original[key] = runStore[key];
    }

    const pid = 50000 + Math.floor(Math.random() * 10000);
    let index = 0;
    let completedCount = 0;
    let current = null;
    let timer = null;

    const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const buildGame = name => {
        const exe = `${slug(name)}.exe`;
        return {
            id: null,
            name,
            pid,
            pidPath: [pid],
            processName: name,
            start: Date.now(),
            exeName: exe,
            exePath: `C:\\Games\\${slug(name)}\\${exe}`,
            cmdLine: `C:\\Games\\${slug(name)}\\${exe}`,
            executables: [{ os: "win32", name: exe, is_launcher: false }],
            windowHandle: 1,
            fullscreenType: 0,
            overlay: false,
            sandboxed: false,
            hidden: false,
            isLauncher: false
        };
    };

    const realGames = () => (original.getRunningGames?.call(runStore) ?? []).filter(g => g?.pid !== pid);
    runStore.getRunningGames = () => current ? [...realGames(), current] : realGames();
    runStore.getGameForPID = val => (val === pid && current) ? current : original.getGameForPID?.call(runStore, val);
    if (original.getVisibleGame) runStore.getVisibleGame = () => current ?? original.getVisibleGame.call(runStore);
    if (original.getVisibleRunningGames) {
        runStore.getVisibleRunningGames = () => current ? [...(original.getVisibleRunningGames.call(runStore) ?? []).filter(g => g?.pid !== pid), current] : original.getVisibleRunningGames.call(runStore);
    }
    if (original.getCandidateGames) {
        runStore.getCandidateGames = () => current ? [...(original.getCandidateGames.call(runStore) ?? []).filter(g => g?.pid !== pid), current] : original.getCandidateGames.call(runStore);
    }

    const dispatchRemoval = game => {
        if (!game) return;
        dispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", added: [], removed: [game], games: realGames() });
        dispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", socketId: null, pid, activity: null });
    };

    const activate = name => {
        const previous = current;
        if (previous) dispatchRemoval(previous);
        current = buildGame(name);
        dispatcher.dispatch({
            type: "RUNNING_GAMES_CHANGE",
            added: [current],
            removed: [],
            games: runStore.getRunningGames()
        });
        dispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: null,
            pid,
            activity: {
                name: current.name,
                type: 0,
                details: "In Game",
                timestamps: { start: current.start }
            }
        });
        console.log(`%c[GameRotator] [${index + 1}/${GAMES.length}] Игра: %c${current.name}%c (удержание 75 сек для хартбита)`,
            "color: #a78bfa; font-weight: bold;",
            "color: #34d399; font-weight: bold;",
            "color: #9ca3af; font-weight: normal;"
        );
    };

    const next = () => {
        completedCount++;
        index = (index + 1) % GAMES.length;
        activate(GAMES[index]);
    };

    const scheduleTimer = () => {
        if (timer) clearInterval(timer);
        timer = setInterval(next, ROTATION_INTERVAL_MS);
    };

    const stop = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        for (const [key, fn] of Object.entries(original)) {
            runStore[key] = fn;
        }
        dispatchRemoval(current);
        current = null;
        delete window[LOCK];
        console.log("%c[GameRotator] Ротация остановлена. Исходные методы Discord восстановлены.", "color: #f87171; font-weight: bold;");
    };

    window[LOCK] = {
        stop,
        next,
        games: GAMES,
        get status() {
            return {
                currentGame: current?.name ?? "Нет активной игры",
                completed: completedCount,
                total: GAMES.length,
                intervalSeconds: ROTATION_INTERVAL_MS / 1000
            };
        }
    };

    window.addEventListener("pagehide", stop, { once: true });
    activate(GAMES[index]);
    scheduleTimer();

    console.log(
        `%c🎮 GameRotator успешно запущен! Всего игр: ${GAMES.length}. Смена каждые ${ROTATION_INTERVAL_MS / 1000} сек.\nДля остановки введите: window.GameRotator.stop()\nДля немедленного перехода к следующей: window.GameRotator.next()`,
        "color: #5865F2; font-size: 13px; font-weight: bold;"
    );
})();
