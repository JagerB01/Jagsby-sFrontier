// Villager Guards v1.4.9 behavior script from the supplied addon.
// Frontier keeps its entity IDs and Charter spawn limits. The healer and
// camel variants are excluded. Core combat, defense and riding use the original logic.
export function startVillagerGuards(world, system, ItemStack, {inCharter, onReplacement}) {
    if (!world.afterEvents.dataDrivenEntityTrigger) return;

    // ---- Configuracao ---------------------------------------------------------
    const LANCER_TYPE = "jagsby_frontier:lancer";
    const HORSE_LANCER_TYPE = "jagsby_frontier:horse_lancer";   // lanceiro do cavalo (recua; o lanceiro comum nao muda)
    const JUGGERNAUT_TYPE = "jagsby_frontier:juggernaut"; // Baluarte
    // Guardas de vila, na ordem de GUARD_QUOTA. Disposicao de uma vila cheia (12): 4 espadistas, 3 arbalistas,
    // 2 lanceiros e 3 baluartes. Nasce o tipo mais "atrasado" em relacao a sua cota (em proporcao); empate = sorteio.
    const GUARD_TYPES = ["jagsby_frontier:swordsman", "jagsby_frontier:arbalist", LANCER_TYPE, JUGGERNAUT_TYPE];
    const TOWN_LANCER = "jagsby_frontier:town_lancer";
    const TOWN_HORSE_LANCER = "jagsby_frontier:town_horse_lancer";
    const MOUNTED_LANCERS = [HORSE_LANCER_TYPE, TOWN_HORSE_LANCER];
    const JUGGERNAUTS = [JUGGERNAUT_TYPE, "jagsby_frontier:town_juggernaut"];
    const BASE_DEFENDERS = [...GUARD_TYPES, HORSE_LANCER_TYPE];
    const DEFENDERS = [...BASE_DEFENDERS, ...BASE_DEFENDERS.map(type => type.replace(":", ":town_"))];
    const GUARD_QUOTA = [4, 3, 2, 3];
    const GUARD_FAMILY = "frontier_guard";
    const MAX_GUARDS_PER_VILLAGE = 12;   // limite de guardas ao redor
    const VILLAGE_RADIUS = 48;          // raio usado para "contar" a vila
    const SPAWN_SPREAD = 8;             // distancia maxima do aldeao
    const SPAWN_ATTEMPTS = 20;
    const SPAWN_DELAY_TICKS = 40;       // espera os chunks vizinhos carregarem
    const SPAWN_RETRY_TICKS = 100;      // se o chunk ainda nao estiver ativo, tenta de novo depois
    const SPAWN_MAX_RETRIES = 12;

    // Blocos onde o guarda nao deve nascer (cama prende a cabeca no teto)
    const UNSAFE_BLOCKS = ["bed", "carpet", "slab"];

    const isUnsafe = (block) =>
        !block || UNSAFE_BLOCKS.some((k) => block.typeId.includes(k));

    const isFree = (block) =>
        !!block && (block.isAir || block.typeId === "minecraft:light_block");

    function findSpawnPoint(dimension, origin) {
        for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
            const x = Math.floor(origin.x + (Math.random() * 2 - 1) * SPAWN_SPREAD) + 0.5;
            const z = Math.floor(origin.z + (Math.random() * 2 - 1) * SPAWN_SPREAD) + 0.5;
            const y = Math.floor(origin.y);

            let feet, head, ground;
            try {
                feet = dimension.getBlock({ x, y, z });
                head = dimension.getBlock({ x, y: y + 1, z });
                ground = dimension.getBlock({ x, y: y - 1, z });
            } catch {
                continue; // chunk nao carregado
            }

            if (isFree(feet) && isFree(head) && ground?.isSolid &&
                !isUnsafe(ground) && !isUnsafe(feet)) {
                return { x, y, z };
            }
        }
        return undefined;
    }

    // ---- Onde a montaria do lanceiro pode nascer -----------------------------------------------
    // A montaria e grande (1,4 x 1,6), entao so nasce a ceu aberto, em area livre 3x3, de preferencia
    // perto de um sino. Sem lugar adequado, o lanceiro nasce a pe (nunca preso dentro de uma casa).
    const BELL_TYPE = "minecraft:bell";
    const BELL_SCAN_RADIUS = 32;        // raio horizontal da busca por sinos
    const BELL_SCAN_HALF_HEIGHT = 12;
    const BELL_NEAR_MIN = 3;            // distancia do sino onde o lanceiro pode nascer
    const BELL_NEAR_MAX = 10;
    const MOUNT_SPAWN_TRIES = 60;
    const knownBells = [];              // sinos ja encontrados { dim, x, y, z }
    const noBellUntil = new Map();      // regiao -> tick ate quando nao vale a pena buscar de novo
    const PLANT_RE = /(short_grass|tall_grass|^minecraft:fern|large_fern|flower|dandelion|poppy|tulip|orchid|allium|azure_bluet|cornflower|lily_of_the_valley|bush|sapling|dead_bush|snow_layer|vine)$/;

    const isPassable = (block) =>
        !!block && (block.isAir || block.typeId === "minecraft:light_block" || PLANT_RE.test(block.typeId));

    function findBell(dimension, origin) {
        const near = (b) => b.dim === dimension.id && Math.hypot(b.x - origin.x, b.z - origin.z) <= BELL_SCAN_RADIUS + 8;
        const known = knownBells.filter(near).sort(
            (a, b) => Math.hypot(a.x - origin.x, a.z - origin.z) - Math.hypot(b.x - origin.x, b.z - origin.z));
        for (const b of known) {
            let still = false;
            try { still = dimension.getBlock({ x: b.x, y: b.y, z: b.z })?.typeId === BELL_TYPE; } catch { still = true; }
            if (still) return b;
            knownBells.splice(knownBells.indexOf(b), 1); // sino destruido
        }

        const region = `${dimension.id}:${Math.floor(origin.x / 32)}:${Math.floor(origin.z / 32)}`;
        if (system.currentTick < (noBellUntil.get(region) ?? 0)) return undefined;

        const ox = Math.floor(origin.x), oy = Math.floor(origin.y), oz = Math.floor(origin.z);
        const volume = new BlockVolume(
            { x: ox - BELL_SCAN_RADIUS, y: Math.max(-64, oy - BELL_SCAN_HALF_HEIGHT), z: oz - BELL_SCAN_RADIUS },
            { x: ox + BELL_SCAN_RADIUS, y: Math.min(319, oy + BELL_SCAN_HALF_HEIGHT), z: oz + BELL_SCAN_RADIUS });
        let best;
        const found = dimension.getBlocks(volume, { includeTypes: [BELL_TYPE] }, true);
        for (const loc of found.getBlockLocationIterator()) {
            const d = Math.hypot(loc.x - origin.x, loc.z - origin.z);
            if (!best || d < best.d) best = { d, loc };
        }
        if (!best) {
            noBellUntil.set(region, system.currentTick + 1200);
            return undefined;
        }
        const bell = { dim: dimension.id, x: best.loc.x, y: best.loc.y, z: best.loc.z };
        knownBells.push(bell);
        return bell;
    }

    // Chao valido: bloco cheio qualquer (sem depender de propriedades da API), fora agua/lava/folhas/camas/lajes
    const isLiquidType = (b) => /water|lava/.test(b.typeId);
    const isGoodGround = (b) =>
        !!b && !b.isAir && !isLiquidType(b) && !isPassable(b) && !isUnsafe(b) &&
        !/leaves|fence|wall|glass_pane|rail|ladder|vine|sign|torch|lantern|pot|crop|wheat|carrot|potato|beetroot|sweet_berry/.test(b.typeId);

    const mountStats = { top: 0, ground: 0, height: 0, space: 0, errors: 0, lastError: "" };
    let mountWarnings = 0;

    // Sorteia pontos em um anel ao redor de "center" e devolve o primeiro a ceu aberto e com espaco livre
    function sampleOpenSpot(dimension, center, minR, maxR, below, above) {
        let unloaded = false;
        for (let i = 0; i < MOUNT_SPAWN_TRIES; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = minR + Math.random() * (maxR - minR);
            const x = Math.floor(center.x + Math.cos(ang) * r);
            const z = Math.floor(center.z + Math.sin(ang) * r);
            try {
                // topmost = bloco mais alto da coluna: se o chao e ele, nao ha teto em cima
                let ground = dimension.getTopmostBlock({ x, z });
                if (!ground) { mountStats.top++; continue; }
                for (let k = 0; k < 2 && isPassable(ground) && !ground.isAir; k++) ground = ground.below();
                if (!isGoodGround(ground)) { mountStats.ground++; continue; }
                const y = ground.location.y + 1;
                if (y < center.y - below || y > center.y + above) { mountStats.height++; continue; } // evita telhados e poroes

                // area livre: o ponto central e os 4 vizinhos (a montaria tem ~1,4 de largura)
                let ok = true;
                for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const feet = dimension.getBlock({ x: x + dx, y, z: z + dz });
                    const head = dimension.getBlock({ x: x + dx, y: y + 1, z: z + dz });
                    if (!isPassable(feet) || !isPassable(head)) { ok = false; break; }
                }
                if (!ok) { mountStats.space++; continue; }
                return { point: { x: x + 0.5, y, z: z + 0.5 } };
            } catch (e) {
                if (String(e).includes("UnloadedChunk")) unloaded = true;
                else { mountStats.errors++; mountStats.lastError = String(e); }
            }
        }
        return unloaded ? { unloaded: true } : {};
    }

    // -> { point } se achou lugar, { unloaded: true } se faltou chunk (tentar depois), {} se nao ha lugar
    function findMountSpawn(dimension, villagerLoc) {
        if (dimension.id !== "minecraft:overworld") return {};
        let bell;
        try { bell = findBell(dimension, villagerLoc); } catch (e) {
            console.warn(`[Villager_Guards] nao consegui procurar sinos: ${e}`);
        }
        let result = {};
        if (bell) {
            result = sampleOpenSpot(dimension, bell, BELL_NEAR_MIN, BELL_NEAR_MAX, 5, 2);
            if (result.point) return result;
        }
        const fallback = sampleOpenSpot(dimension, villagerLoc, 2, 20, 4, 4);
        const final = fallback.point ? fallback : (result.unloaded ? result : fallback);
        if (!final.point && !final.unloaded && mountWarnings < 8) {
            mountWarnings++;
            console.warn(`[Villager_Guards] sem ponto aberto para montado (sino: ${bell ? "sim" : "nao"}); ` +
                `motivos: ${JSON.stringify(mountStats)}`);
        }
        return final;
    }

    // Garante os cavaleiros: se o jogo nao criou o lanceiro em cima da montaria (addrider), cria na mao.
    function ensureRider(mount) {
        system.runTimeout(() => {
            try {
                if (!mount.isValid) return;
                const rideable = mount.getComponent("minecraft:rideable");
                const riders = rideable?.getRiders() ?? [];
                if (riders.length === 0) {
                    const rider = mount.dimension.spawnEntity(HORSE_LANCER_TYPE, mount.location);
                    if (!rideable?.addRider(rider)) {
                        console.warn("[Villager_Guards] nao consegui montar o lanceiro; ele ficara a pe");
                        mount.remove();
                    }
                }
            } catch (e) {
                console.warn(`[Villager_Guards] erro ao garantir os cavaleiros: ${e}`);
            }
        }, 20);
    }

    function trySpawnGuard(villager) {
        if (!villager.isValid) return;

        const { dimension, location } = villager;

        if (inCharter(dimension, location)) return;

        // Montarias recem-criadas cujo cavaleiro ainda nao apareceu contam como lanceiros
        // (evita passar do limite / desequilibrar quando varios aldeoes geram guardas no mesmo tick)
        let pendingMounts = 0;   // lanceiros que ainda vao aparecer
        try {
            const empty = dimension.getEntities({
                families: [MOUNT_FAMILY],
                location,
                maxDistance: VILLAGE_RADIUS,
            }).filter((h) => (h.getComponent("minecraft:rideable")?.getRiders().length ?? 0) === 0);
            pendingMounts = empty.length;
        } catch { /* ignore */ }

        // Limite por vila: conta os guardas que ja existem por perto
        const nearby = dimension.getEntities({
            families: [GUARD_FAMILY],
            location,
            maxDistance: VILLAGE_RADIUS,
        });
        if (nearby.length + pendingMounts >= MAX_GUARDS_PER_VILLAGE) return;

        const counts = GUARD_TYPES.map((t) => nearby.filter((g) => g.typeId === t || (t === LANCER_TYPE && g.typeId === HORSE_LANCER_TYPE)).length);
        counts[2] += pendingMounts;
        // Falta relativa a cota (0 = cheia, 1 = vazia): todos os tipos comecam empatados e se enchem em paralelo,
        // entao ate uma vila pequena recebe lanceiros e baluartes, nao so espadistas.
        const lack = counts.map((n, i) => Math.max(0, GUARD_QUOTA[i] - n) / GUARD_QUOTA[i]);
        const biggest = Math.max(...lack);
        if (biggest <= 0) return;   // todas as cotas cheias
        const candidates = GUARD_TYPES.filter((_, i) => lack[i] === biggest);
        const type = candidates[Math.floor(Math.random() * candidates.length)];

        const point = findSpawnPoint(dimension, location) ?? location;
        try {
            if (type === LANCER_TYPE && ENABLE_MOUNT && Math.random() < MOUNT_CHANCE) {
                {
                    const spot = findMountSpawn(dimension, location);
                    if (spot.point && !inCharter(dimension, spot.point)) {
                        const mount = dimension.spawnEntity(MOUNT_TYPE, spot.point, { spawnEvent: "mn:spawn_with_rider" });
                        ensureRider(mount);
                        return;
                    }
                    if (spot.unloaded) return "retry"; // chunk ainda nao esta ativo
                }
            }
            if (!inCharter(dimension, point)) dimension.spawnEntity(type, point);
        } catch (e) {
            if (String(e).includes("UnloadedChunk")) return "retry"; // chunk ainda nao esta ativo
            console.warn(`[Villager_Guards] falha ao spawnar ${type}: ${e}`);
        }
    }

    // O villager vanilla dispara este evento quando e gerado junto com a vila
    function scheduleSpawn(villager, attempt) {
        system.runTimeout(() => {
            try {
                const result = trySpawnGuard(villager);
                if (result === "retry" && attempt < SPAWN_MAX_RETRIES) scheduleSpawn(villager, attempt + 1);
            } catch (e) {
                console.warn(`[Villager_Guards] erro: ${e}`);
            }
        }, attempt === 0 ? SPAWN_DELAY_TICKS : SPAWN_RETRY_TICKS);
    }

    world.afterEvents.dataDrivenEntityTrigger.subscribe(
        ({ entity }) => scheduleSpawn(entity, 0),
        {
            entityTypes: ["minecraft:villager_v2"],
            eventTypes: ["minecraft:spawn_from_village"],
        }
    );

    // ---- Defesa de aldeoes (vale para qualquer guarda, inclusive ovo / comando) ------------
    // de alvo que ataca qualquer entidade com essa tag.
    const THREAT_TAG = "mn_threat";
    const THREAT_TICKS = 480;           // 24 s
    const THREAT_RADIUS = 20;           // so marca o agressor se houver guarda ate esta distancia (blocos)
    const threats = new Map();          // id da entidade -> tick em que expira
    const DIMENSIONS = ["overworld", "nether", "the_end"];

    // Quem nunca ganha a tag mn_threat: aldeoes, iron golems e guardas
    const isFriendly = (e) => {
        if (e.typeId === "minecraft:iron_golem" || e.typeId === "minecraft:villager_v2" || e.typeId === "minecraft:villager") return true;
        const fam = e.getComponent("minecraft:type_family");
        return !!fam && (fam.hasTypeFamily("villager_guard") || fam.hasTypeFamily("villager") || fam.hasTypeFamily("irongolem"));
    };

    const hasHero = (e) => {
        try { return e.typeId === "minecraft:player" && !!e.getEffect("village_hero"); } catch { return false; }
    };

    const isCreative = (e) => {
        if (e.typeId !== "minecraft:player") return false;
        try {
            const gm = typeof e.getGameMode === "function" ? e.getGameMode() : e.gameMode;
            return String(gm).toLowerCase() === "creative";
        } catch { return false; }
    };

    function markAggressor(attacker, hurtEntity) {
            try {
                if (!attacker?.isValid || isFriendly(attacker)) return;
                // Monstros ja sao alvo normal dos guardas, nao precisam da tag
                const fam = attacker.getComponent("minecraft:type_family");
                if (fam?.hasTypeFamily("monster")) return;
                // Jogador no criativo nao vira ameaca
                if (isCreative(attacker)) return;
                // Heroi da Vila: os guardas nao o atacam nem revidam
                if (hasHero(attacker)) return;
                const defenders = DEFENDERS;
                let near = false;
                for (const t of defenders) {
                    const found = attacker.dimension.getEntities({ type: t, location: attacker.location, maxDistance: THREAT_RADIUS });
                    if (found.some((d) => d.id !== hurtEntity?.id)) { near = true; break; }
                }
                if (!near) return;
                attacker.addTag(THREAT_TAG);
                threats.set(attacker.id, system.currentTick + THREAT_TICKS);
            } catch (e) {
                console.warn(`[Villager_Guards] erro ao marcar agressor: ${e}`);
            }
    }

    world.afterEvents.entityHurt.subscribe(
        ({ damageSource, hurtEntity }) => markAggressor(damageSource.damagingEntity, hurtEntity),
        { entityTypes: ["minecraft:villager_v2", ...DEFENDERS] }
    );

    // Se o agressor morre (ou o jogador renasce), a tag some na hora
    function clearThreat(entity) {
        try {
            threats.delete(entity.id);
            if (entity.hasTag(THREAT_TAG)) entity.removeTag(THREAT_TAG);
        } catch { /* entidade invalida */ }
    }
    world.afterEvents.entityDie.subscribe(({ deadEntity }) => clearThreat(deadEntity));
    world.afterEvents.playerSpawn.subscribe(({ player }) => clearThreat(player));

    // Remove tags expiradas e tags orfas deixadas por uma sessao anterior
    system.runInterval(() => {
        // Limpa entradas expiradas mesmo que a entidade tenha morrido / sido descarregada
        for (const [id, until] of threats) {
            if (system.currentTick >= until) threats.delete(id);
        }
        for (const name of DIMENSIONS) {
            let list = [];
            try {
                list = world.getDimension(name).getEntities({ tags: [THREAT_TAG] });
            } catch { continue; }
            for (const e of list) {
                const until = threats.get(e.id);
                if (until === undefined || system.currentTick >= until || isCreative(e) || hasHero(e)) {
                    try { e.removeTag(THREAT_TAG); } catch { /* entidade descarregada */ }
                    threats.delete(e.id);
                }
            }
        }
    }, 40);

    // ---- Esquecer o alvo ------------------------------------------------------------------
    // Entity.target e somente leitura na API de scripts, entao nao da para soltar o alvo por aqui.
    // Isso e feito por dados: "reevaluate_description" + "must_see_forget_duration" na regra de alvo
    // de cada guarda (o alvo e solto quando deixa de valer, p.ex. a tag mn_threat expira).

    // ---- Converter aldeao em guarda ----------------------------------------------------------
    // Interagir com um aldeao ADULTO desempregado (sem profissao) segurando uma espada de
    // ferro (espadista), uma lanca de ferro (lanceiro), um machado de ferro (Baluarte) ou uma besta (arbalista)
    // o transforma em um guarda comum,
    // igual aos gerados pela vila: sem dono, sem seguir o jogador.
    const RECRUIT_ITEMS = {
        "minecraft:iron_sword": "jagsby_frontier:swordsman",
        "minecraft:iron_spear": LANCER_TYPE,
        "minecraft:crossbow": "jagsby_frontier:arbalist",
        "minecraft:iron_axe": JUGGERNAUT_TYPE,   // Baluarte
    };

    const RECRUITABLE_VARIANTS = [0];



    // Itens encantados nao podem ser usados para contratar guardas.
    function isEnchanted(item) {
        try {
            const ench = item?.getComponent("minecraft:enchantable");
            return !!ench && ench.getEnchantments().length > 0;
        } catch {
            return false;
        }
    }

    function readVillager(v) {
        const info = { baby: false, markVariant: undefined, skinId: undefined, variant: undefined, components: [] };
        try { info.components = v.getComponents().map((c) => c.typeId); } catch { /* ignore */ }
        info.baby = info.components.includes("minecraft:is_baby");
        const val = (id) => { try { return v.getComponent(id)?.value; } catch { return undefined; } };
        info.markVariant = val("minecraft:mark_variant");
        info.skinId = val("minecraft:skin_id");
        info.variant = val("minecraft:variant");
        return info;
    }

    function isRecruitable(info) {
        if (info.baby) return false;
        return info.variant !== undefined && RECRUITABLE_VARIANTS.includes(info.variant);
    }

    // Particulas verdes "villager_happy" (as mesmas de quando um aldeao ganha profissao / negocia)
    function happyParticles(dimension, location) {
        for (let i = 0; i < 14; i++) {
            const pos = {
                x: location.x + (Math.random() - 0.5) * 1.2,
                y: location.y + 0.4 + Math.random() * 1.6,
                z: location.z + (Math.random() - 0.5) * 1.2,
            };
            try {
                dimension.spawnParticle("minecraft:villager_happy", pos);
            } catch {
                try { dimension.runCommand(`particle minecraft:villager_happy ${pos.x} ${pos.y} ${pos.z}`); } catch { /* ignore */ }
            }
        }
    }

    function convert(player, villager, guardType) {
        if (!villager.isValid) return;
        const { dimension, location, nameTag } = villager;
        // guardas contratados nascem pelo evento "mn:spawn_hired": equipamento padrao SEM chance de encantamento
        const guard = dimension.spawnEntity(guardType, location, { spawnEvent: "mn:spawn_hired" });
        if (nameTag) guard.nameTag = nameTag;
        villager.remove();

        // Gasta 1 item (exceto no criativo)
        try {
            if (player.getGameMode() !== "Creative") {
                const slot = player.getComponent("minecraft:inventory").container.getSlot(player.selectedSlotIndex);
                if (slot.amount > 1) slot.amount -= 1;
                else slot.setItem(undefined);
            }
        } catch (e) {
            console.warn(`[Villager_Guards] nao consegui consumir o item: ${e}`);
        }
        happyParticles(dimension, location);
        try { player.playSound("random.levelup"); } catch { /* som opcional */ }
    }

    world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
        const { player, target, itemStack } = ev;
        if (target.typeId !== "minecraft:villager_v2") return;

        const guardType = itemStack && RECRUIT_ITEMS[itemStack.typeId];
        if (!guardType) return;
        if (!isRecruitable(readVillager(target))) return;

        if (isEnchanted(itemStack)) {
            // aviso curto (traduzido pelos arquivos de idioma en_US / pt_BR); o aldeao nao e convertido
            system.run(() => {
                try {
                    player.onScreenDisplay.setActionBar({ rawtext: [{ translate: "mn.guard_villagers.enchanted_hire" }] });
                } catch { /* aviso opcional */ }
            });
            return;
        }

        ev.cancel = true;
        system.run(() => {
            try {
                convert(player, target, guardType);
            } catch (e) {
                console.warn(`[Villager_Guards] erro ao converter: ${e}`);
            }
        });
    });

    // ---- Guarda lanceiro montado --------------------------------------------------------------
    // Como o zumbi cavaleiro do jogo: nasce a MONTARIA com o evento "mn:spawn_with_rider", e o
    // proprio jogo cria o lanceiro e o coloca em cima (componente addrider). Toda a IA (lanca a pe /
    // montado) e feita por dados na entidade, sem script.
    const MOUNT_TYPE = "jagsby_frontier:guard_horse";
    const MOUNT_FAMILY = "frontier_guard_mount";           // familia da montaria
    const HORSE_COLOR_EVENT = "minecraft:make_white"; // a montaria do lanceiro tem uma unica cor: branca
    const FREE_HORSE_LIFETIME_TICKS = 9600;  // 8 min: o cavalo solto some se ninguem interagir
    const FREE_HORSE_TAG = "mn_free_horse";
    const RIDERLESS_DELAY_TICKS = 160;  // 8 s depois que o lanceiro some, a montaria vira cavalo comum (da tempo de outro lanceiro alcanca-la)
    const ENABLE_MOUNT = true;
    const MOUNT_CHANCE = 1;             // lanceiros de vila sempre nascem montados (a pe so se nao houver ponto aberto)

    // ---- Montaria sem cavaleiro vira um cavalo comum ------------------------------------------
    // A cada 0,25 s o script confere as montarias dos lanceiros. Se uma fica 8 s seguidos sem cavaleiro
    // (lanceiro morto / desmontado), ela e trocada por um cavalo vanilla branco, domado e selado (o
    // jogador pode montar, equipar armadura ou tirar/colocar a sela).
    const riderlessSince = new Map();   // id da montaria -> tick em que ficou sem cavaleiro

    function convertMountToHorse(entity) {
        const { dimension, location } = entity;
        const horse = dimension.spawnEntity("minecraft:horse", location, { spawnEvent: "minecraft:spawn_tame_adult" });
        try { horse.triggerEvent(HORSE_COLOR_EVENT); }
        catch (e) { console.warn(`[Villager_Guards] nao consegui definir a cor do cavalo: ${e}`); }
        // Sela: item no slot 0 do inventario + evento que liga o estado "selado"
        try { horse.getComponent("minecraft:inventory").container.setItem(0, new ItemStack("minecraft:saddle", 1)); }
        catch (e) { console.warn(`[Villager_Guards] nao consegui colocar a sela no inventario: ${e}`); }
        try { horse.triggerEvent("minecraft:horse_saddled"); } catch { /* ja selado */ }
        try { horse.setRotation(entity.getRotation()); } catch { /* opcional */ }
        if (entity.nameTag) horse.nameTag = entity.nameTag;
        // Cavalo "solto": some depois de 8 min se nenhum jogador interagir com ele
        try {
            horse.addTag(FREE_HORSE_TAG);
            horse.setDynamicProperty("mn:expires", world.getAbsoluteTime() + FREE_HORSE_LIFETIME_TICKS);
        } catch (e) {
            console.warn(`[Villager_Guards] nao consegui marcar o cavalo para sumir: ${e}`);
        }
        onReplacement(entity);
        entity.remove();
    }

    system.runInterval(() => {
        const now = system.currentTick;
        for (const name of DIMENSIONS) {
            let mounts = [];
            try {
                mounts = world.getDimension(name).getEntities({ families: [MOUNT_FAMILY] });
            } catch { continue; }
            for (const m of mounts) {
                try {
                    const riders = m.getComponent("minecraft:rideable")?.getRiders() ?? [];
                    if (riders.length > 0) { riderlessSince.delete(m.id); continue; }
                    const since = riderlessSince.get(m.id) ?? now;
                    riderlessSince.set(m.id, since);
                    if (now - since >= RIDERLESS_DELAY_TICKS) {
                        riderlessSince.delete(m.id);
                        convertMountToHorse(m);
                    }
                } catch (e) {
                    console.warn(`[Villager_Guards] nao consegui converter a montaria em cavalo: ${e}`);
                }
            }
        }
    }, 5);

    // ---- Cavalo solto some se ninguem interagir ------------------------------------------------
    // Qualquer interacao do jogador (montar, abrir o inventario, selar, equipar, dar nome) o torna um
    // cavalo comum para sempre: a marca e removida e ele nunca mais some sozinho.
    const keepHorse = (horse) => {
        try { horse.removeTag(FREE_HORSE_TAG); } catch { /* ignore */ }
        try { horse.setDynamicProperty("mn:expires", undefined); } catch { /* ignore */ }
    };

    world.afterEvents.playerInteractWithEntity.subscribe(({ target }) => {
        try {
            if (target.hasTag(FREE_HORSE_TAG)) keepHorse(target);
        } catch { /* entidade invalida */ }
    });

    system.runInterval(() => {
        const now = world.getAbsoluteTime();
        for (const name of DIMENSIONS) {
            let horses = [];
            try {
                horses = world.getDimension(name).getEntities({ tags: [FREE_HORSE_TAG] });
            } catch { continue; }
            for (const h of horses) {
                try {
                    const expires = h.getDynamicProperty("mn:expires");
                    if (typeof expires !== "number" || now < expires) continue;
                    const ridden = (h.getComponent("minecraft:rideable")?.getRiders().length ?? 0) > 0;
                    if (ridden) keepHorse(h); else h.remove();
                } catch (e) {
                    console.warn(`[Villager_Guards] erro ao remover cavalo solto: ${e}`);
                }
            }
        }
    }, 100);

    // ele foi derrubado): espera 1 s, procura outra montaria por 8 s (raio de 6 blocos) e, se nao achar, e trocado por um lanceiro comum, mantendo a vida atual.
    const SEEK_DELAY_TICKS = 10;                              // 0,5 s de espera depois de desmontar, antes de comecar a procurar montaria (nao conta no tempo de busca)
    const SEARCH_TICKS = 160;                                 // 8 s procurando uma montaria (find_mount, raio 6)
    const UNMOUNTED_TICKS = SEEK_DELAY_TICKS + SEARCH_TICKS;  // depois disso sem montar, vira lanceiro comum
    const seekingMount = new Set();                           // ids dos lanceiros que estao com a busca ligada
    const unmountedSince = new Map();   // id -> tick em que foi visto sem montaria

    system.runInterval(() => {
        const now = system.currentTick;
        const alive = new Set();
        for (const name of DIMENSIONS) {
            let list = [];
            try {
                list = MOUNTED_LANCERS.flatMap((type) => world.getDimension(name).getEntities({ type }));
            } catch { continue; }
            for (const l of list) {
                try {
                    alive.add(l.id);
                    if (l.getComponent("minecraft:riding")?.entityRidingOn) {
                        unmountedSince.delete(l.id);
                        if (seekingMount.delete(l.id)) { try { l.triggerEvent("mn:stop_seek_mount"); } catch { /* ignore */ } }
                        continue;
                    }
                    const since = unmountedSince.get(l.id) ?? now;
                    unmountedSince.set(l.id, since);
                    if (now - since >= SEEK_DELAY_TICKS && !seekingMount.has(l.id)) {
                        seekingMount.add(l.id);
                        try { l.triggerEvent("mn:seek_mount"); } catch (e) { console.warn(`[Villager_Guards] nao consegui ligar a busca de montaria: ${e}`); }
                    }
                    if (now - since < UNMOUNTED_TICKS) continue;
                    const hp = l.getComponent("minecraft:health")?.currentValue;
                    // "mn:spawn_hired": mesmo equipamento sem chance de encantamento do lanceiro montado
                    const type = l.typeId === TOWN_HORSE_LANCER ? TOWN_LANCER : LANCER_TYPE;
                    const plain = l.dimension.spawnEntity(type, l.location, { spawnEvent: "mn:spawn_hired" });
                    if (hp !== undefined) {
                        try { plain.getComponent("minecraft:health")?.setCurrentValue(Math.min(hp, plain.getComponent("minecraft:health").effectiveMax)); } catch { /* ignore */ }
                    }
                    if (l.nameTag) plain.nameTag = l.nameTag;
                    unmountedSince.delete(l.id);
                    seekingMount.delete(l.id);
                    try { onReplacement(l, plain); }
                    catch (error) { plain.remove(); throw error; }
                    l.remove();
                } catch (e) {
                    console.warn(`[Villager_Guards] erro ao trocar lanceiro montado: ${e}`);
                }
            }
        }
        for (const id of unmountedSince.keys()) if (!alive.has(id)) unmountedSince.delete(id);
        for (const id of seekingMount) if (!alive.has(id)) seekingMount.delete(id);
    }, 5);

    // ---- Raids: reforcos de guardas por onda ----------------------------------------------------
    // O jogo nao informa o numero da onda, entao ele e deduzido: todo raider criado para uma raid dispara
    // "minecraft:spawn_for_raid"; raiders que surgem juntos (ate RAID_WAVE_GAP_TICKS entre um e outro) e perto
    // de uma raid ja conhecida formam uma onda, e um grupo novo depois disso e a onda seguinte. A raid e dada
    // como vencida (o alerta dos guardas termina) quando a ultima onda e derrotada, e como encerrada quando nao resta nenhum
    // raider vivo por RAID_IDLE_END_TICKS. Os guardas gerados ficam como defesa permanente (nao somem no fim da
    // raid); o limite de guardas por vila nao vale para eles, so o teto RAID_MAX_GUARDS.
    const RAID_JOIN_RADIUS = 128;        // raiders ate esta distancia do ponto inicial pertencem a mesma raid
    const RAID_WAVE_GAP_TICKS = 100;     // 5 s sem novos raiders = a onda terminou de nascer
    const RAID_IDLE_END_TICKS = 1800;    // 90 s sem raiders vivos = raid encerrada
    const RAID_GUARD_DELAY_TICKS = 20;   // espera depois que a onda nasce
    const RAID_GUARD_STAGGER_TICKS = 6;  // intervalo entre um guarda e o proximo
    const RAID_VILLAGER_RADIUS = 160;    // busca do aldeao mais proximo dos raiders (ancora do reforco)
    const RAID_ALERT_RADIUS = 96;        // guardas ate esta distancia do inicio da onda vao ao encontro dos raiders
    const RAID_REGEN_TICKS = 160;        // 8 s de regeneracao para o guarda que derrota um raider
    const RAID_GROUP_MIN = 1, RAID_GROUP_MAX = 3.5;   // os reforcos de uma onda nascem em grupo: a 1-3,5 blocos do ponto central
    const RAID_MAX_GUARDS = 36;          // teto de guardas ao redor da vila: reforcos so completam ate aqui (evita acumular)

    // Composicao dos reforcos por dificuldade e por onda: [tipo, minimo, maximo]. Baseada nas tabelas de raiders do
    // jogo (facil 3 ondas / 13 raiders, normal 5 ondas / 26, dificil 7 ondas / 45). Em media os guardas somam ~75% dos
    // raiders (as ondas com devastador recebem reforco extra, inclusive 1 Baluarte na onda 3; a onda 4 traz 1-2
    // (p.ex. bonus de Bad Omen) repetem a ultima linha.
    const A = "jagsby_frontier:arbalist", S = "jagsby_frontier:swordsman", J = JUGGERNAUT_TYPE, L = "mounted_lancer";
    const RAID_TABLES = {
        Easy: [
            [[A, 2, 2]],                                        // onda 1: 4 saqueadores
            [[A, 1, 2], [S, 1, 1]],                             // onda 2: 3 saqueadores + 2 vingadores
            [[A, 2, 2], [S, 1, 2], [J, 1, 1]],                  // onda 3: 3 saqueadores + 1 devastador
        ],
        Normal: [
            [[A, 2, 2]],                                        // onda 1
            [[A, 1, 2], [S, 1, 1]],                             // onda 2: 2 vingadores
            [[A, 2, 2], [S, 1, 2], [J, 1, 1]],                  // onda 3: devastador
            [[A, 1, 2], [S, 1, 1], [J, 1, 1]],       // onda 4: 3 bruxas + 3 saqueadores
            [[A, 1, 2], [S, 2, 3], [J, 1, 2]],                  // onda 5: 4 vingadores, devastador, invocador
        ],
        Hard: [
            [[A, 2, 2]],                                        // onda 1
            [[A, 2, 2], [S, 1, 2]],                             // onda 2
            [[A, 2, 2], [S, 1, 2], [J, 1, 1]],                  // onda 3: devastador
            [[A, 1, 2], [S, 1, 1], [J, 1, 1]],       // onda 4: 3 bruxas
            [[A, 1, 2], [S, 2, 3], [J, 1, 2]],                  // onda 5: 4 vingadores, 2 devastadores
            [[A, 1, 2], [S, 1, 2], [J, 1, 2], [L, 1, 1]],       // onda 6: 5 saqueadores, 2 vingadores
            [[A, 2, 3], [S, 2, 3], [J, 2, 3], [L, 1, 2]],       // onda 7: 6 vingadores, 2 invocadores, 3 devastadores
        ],
    };
    const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

    function raidTable() {
        let diff = "Normal";
        try { diff = String(world.getDifficulty()); } catch { /* usa Normal */ }
        return RAID_TABLES[diff] ?? RAID_TABLES.Normal;
    }
    const raidRow = (wave) => { const t = raidTable(); return t[Math.min(wave, t.length) - 1]; };

    const raids = [];

    function signal(dimension, location, families, radius, event) {
        let list = [];
        try { list = dimension.getEntities({ families, location, maxDistance: radius }); } catch { return; }
        for (const g of list) { try { g.triggerEvent(event); } catch { /* sem o evento */ } }
    }
    const alertGuards = (raid, loc) => {   // guardas vao ao encontro dos raiders
        signal(raid.dimension, loc ?? raid, [GUARD_FAMILY], RAID_ALERT_RADIUS, "mn:raid_alert");
    };
    const endAlert = (raid) => {
        signal(raid.dimension, raid, [GUARD_FAMILY], RAID_ALERT_RADIUS + 64, "mn:raid_end");
    };

    // Ponto a ceu aberto perto do centro (nunca dentro ou em cima de uma casa)
    function findOutdoorPoint(dimension, center) {
        for (const [minR, maxR, below, above] of [[3, 20, 2, 3], [3, 32, 3, 4]]) {
            const spot = sampleOpenSpot(dimension, center, minR, maxR, below, above);
            if (spot.point) return spot.point;
        }
        return undefined;
    }

    // Ponto livre e a ceu aberto perto do centro do grupo, em um bloco que ainda nao foi usado
    function findGroupSpot(dimension, center, used) {
        for (let i = 0; i < 40; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = RAID_GROUP_MIN + Math.random() * (RAID_GROUP_MAX - RAID_GROUP_MIN);
            const x = Math.floor(center.x + Math.cos(ang) * r), z = Math.floor(center.z + Math.sin(ang) * r);
            const key = `${x},${z}`;
            if (used.has(key)) continue;
            try {
                let ground = dimension.getTopmostBlock({ x, z });
                if (!ground) continue;
                for (let k = 0; k < 2 && isPassable(ground) && !ground.isAir; k++) ground = ground.below();
                if (!isGoodGround(ground)) continue;
                const y = ground.location.y + 1;
                if (Math.abs(y - center.y) > 2) continue;
                if (!isPassable(dimension.getBlock({ x, y, z })) || !isPassable(dimension.getBlock({ x, y: y + 1, z }))) continue;
                used.add(key);
                return { x: x + 0.5, y, z: z + 0.5 };
            } catch { /* chunk nao carregado */ }
        }
        return undefined;
    }

    let raidSpawnWarnings = 0;
    // group = { center, used }: o ponto central do grupo (a ceu aberto, nunca dentro de uma casa) e os blocos ja ocupados
    function spawnRaidGuard(dimension, type, anchor, group) {
        try {
            if (type === "mounted_lancer") {
                // a montaria e grande: tenta perto do grupo (area 3x3 livre) e, sem lugar, perto de um sino
                let spot = group.center ? sampleOpenSpot(dimension, group.center, 2, 6, 2, 3) : {};
                if (!spot.point) spot = findMountSpawn(dimension, anchor.location);
                if (spot.point && !inCharter(dimension, spot.point)) {
                    ensureRider(dimension.spawnEntity(MOUNT_TYPE, spot.point, { spawnEvent: "mn:spawn_with_rider" }));
                    return;
                }
                type = LANCER_TYPE; // sem ponto aberto: lanceiro a pe
            }
            const point = (group.center && findGroupSpot(dimension, group.center, group.used)) ?? findOutdoorPoint(dimension, anchor.location);
            if (!point) {
                if (raidSpawnWarnings++ < 5) console.warn(`[Villager_Guards] sem ponto a ceu aberto para o reforco de raid (${type})`);
                return;
            }
            if (!inCharter(dimension, point)) dimension.spawnEntity(type, point);
        } catch (e) {
            console.warn(`[Villager_Guards] falha ao gerar reforco de raid (${type}): ${e}`);
        }
    }

    function spawnRaidGuards(raid, raiderLoc, wave) {
        const dimension = raid.dimension;
        const queue = [];
        for (const [type, min, max] of raidRow(wave)) for (let n = randInt(min, max); n > 0; n--) queue.push(type);
        for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }

        // Ancora: o aldeao mais proximo dos raiders (o lado da vila que a raid ataca)
        const villagers = dimension.getEntities({ type: "minecraft:villager_v2", location: raiderLoc, maxDistance: RAID_VILLAGER_RADIUS });
        if (villagers.length === 0) return;
        villagers.sort((a, b) => Math.hypot(a.location.x - raiderLoc.x, a.location.z - raiderLoc.z) - Math.hypot(b.location.x - raiderLoc.x, b.location.z - raiderLoc.z));
        const anchor = { location: { ...villagers[0].location } };

        let present = 0;
        try { present = dimension.getEntities({ families: [GUARD_FAMILY], location: anchor.location, maxDistance: VILLAGE_RADIUS }).length; } catch { /* ignore */ }
        queue.length = Math.max(0, Math.min(queue.length, RAID_MAX_GUARDS - present));

        if (inCharter(dimension, anchor.location)) return;
        const group = { center: findOutdoorPoint(dimension, anchor.location), used: new Set() };
        queue.forEach((type, i) => system.runTimeout(() => {
            try { spawnRaidGuard(dimension, type, anchor, group); } catch (e) { console.warn(`[Villager_Guards] erro no reforco de raid: ${e}`); }
        }, i * RAID_GUARD_STAGGER_TICKS));
        // depois que todos nasceram (e os cavaleiros montaram), os recem-chegados tambem vao ao encontro dos raiders
        system.runTimeout(() => alertGuards(raid, raiderLoc), queue.length * RAID_GUARD_STAGGER_TICKS + 60);
    }

    function onRaiderSpawned(raider) {
        const { dimension, location } = raider;
        const now = system.currentTick;
        let raid = raids.find((r) => r.dim === dimension.id && Math.hypot(r.x - location.x, r.z - location.z) <= RAID_JOIN_RADIUS);
        if (!raid) {
            raid = { dim: dimension.id, dimension, x: location.x, y: location.y, z: location.z, wave: 0, last: -Infinity, ids: new Set(), won: false };
            raids.push(raid);
        }
        if (now - raid.last > RAID_WAVE_GAP_TICKS) {
            raid.wave++;
            raid.won = false;
            const wave = raid.wave, loc = { ...location };
            system.runTimeout(() => {
                try {
                    alertGuards(raid, loc);   // os guardas da vila vao ao encontro dos raiders
                    spawnRaidGuards(raid, loc, wave);
                } catch (e) { console.warn(`[Villager_Guards] erro ao gerar reforcos da onda ${wave}: ${e}`); }
            }, RAID_GUARD_DELAY_TICKS);
        }
        raid.last = now;
        raid.ids.add(raider.id);
    }

    world.afterEvents.dataDrivenEntityTrigger.subscribe(
        ({ entity }) => {
            try { onRaiderSpawned(entity); } catch (e) { console.warn(`[Villager_Guards] erro ao registrar raider: ${e}`); }
        },
        { eventTypes: ["minecraft:spawn_for_raid"] }
    );

    // O guarda que derrota um raider ganha regeneracao por alguns segundos
    world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
        try {
            if (!raids.some((r) => r.ids.has(deadEntity.id))) return;
            const killer = damageSource?.damagingEntity;
            if (!killer?.isValid || !killer.getComponent("minecraft:type_family")?.hasTypeFamily(GUARD_FAMILY)) return;
            killer.addEffect("regeneration", RAID_REGEN_TICKS, { amplifier: 0, showParticles: true });
        } catch (e) { console.warn(`[Villager_Guards] erro na regeneracao de raid: ${e}`); }
    });

    // Acompanha as raids: vitoria (ultima onda derrotada) e encerramento
    system.runInterval(() => {
        const now = system.currentTick;
        const finalWave = raidTable().length;
        for (let i = raids.length - 1; i >= 0; i--) {
            const raid = raids[i];
            for (const id of raid.ids) {
                let alive = false;
                try { alive = !!world.getEntity(id)?.isValid; } catch { /* descarregado */ }
                if (!alive) raid.ids.delete(id);
            }
            if (raid.ids.size > 0 || now - raid.last <= RAID_WAVE_GAP_TICKS) continue;
            if (!raid.won && raid.wave >= finalWave) {
                raid.won = true;   // a raid foi vencida: os guardas deixam o modo de alerta
                endAlert(raid);
            }
            if (now - raid.last > RAID_IDLE_END_TICKS) {
                if (!raid.won) endAlert(raid);
                raids.splice(i, 1);
            }
        }
    }, 100);

    // ---- Baluarte: escudo frontal ---------------------------------------------------------------
    // Os estados do escudo (mn:shield_state) e seus tempos sao por dados em mn:juggernaut. Aqui fica o que os
    // dados nao fazem: bloquear so golpes vindos da frente (arco de 180 graus, como o escudo do jogador),
    // tocar os sons e quebrar o escudo com machado.
    const SHIELD_STATES = ["shielding", "lowering"];
    const SHIELD_CAUSES = ["entityAttack", "projectile"];

    function heldItemId(entity) {
        try {
            const item = entity.getComponent("minecraft:equippable")?.getEquipment("Mainhand");
            if (item) return item.typeId;
        } catch { /* tenta o inventario */ }
        try {
            const inv = entity.getComponent("minecraft:inventory")?.container;
            return inv?.getItem(entity.selectedSlotIndex)?.typeId;
        } catch { return undefined; }
    }
    // Qualquer atacante com machado na mao principal quebra o escudo. A leitura direta do item so e confiavel no
    // jogador, entao para os demais mobs o item e testado por comando (hasitem funciona em qualquer entidade);
    // vindicator e piglin brute sao o ultimo recurso, pois sempre empunham machado.
    const AXE_ITEMS = ["wooden", "stone", "copper", "golden", "iron", "diamond", "netherite"].map((m) => `minecraft:${m}_axe`);
    const AXE_MOBS = ["minecraft:vindicator", "minecraft:piglin_brute"];

    function holdsAxeByCommand(entity) {
        for (const item of AXE_ITEMS) {
            try {
                const r = entity.runCommand(`testfor @s[hasitem={item=${item},location=slot.weapon.mainhand}]`);
                if (r.successCount > 0) return true;
            } catch { /* sem o item (o comando falha) ou entidade invalida */ }
        }
        return false;
    }

    const wieldsAxe = (entity) =>
        !!heldItemId(entity)?.endsWith("_axe") || holdsAxeByCommand(entity) || AXE_MOBS.includes(entity.typeId);

    world.beforeEvents.entityHurt.subscribe((ev) => {
        const { hurtEntity, damageSource } = ev;
        if (!JUGGERNAUTS.includes(hurtEntity.typeId)) return;
        try {
            const state = hurtEntity.getProperty("mn:shield_state");
            if (!SHIELD_STATES.includes(state) || !SHIELD_CAUSES.includes(damageSource.cause)) return;
            const attacker = damageSource.damagingEntity;
            const from = (damageSource.damagingProjectile ?? attacker)?.location;
            if (!from) return;

            // So bloqueia se o golpe vem da frente (produto escalar horizontal entre o olhar e a direcao do agressor)
            const view = hurtEntity.getViewDirection();
            const dx = from.x - hurtEntity.location.x, dz = from.z - hurtEntity.location.z;
            const len = Math.hypot(dx, dz), vlen = Math.hypot(view.x, view.z);
            if (len > 0.001 && vlen > 0.001 && (view.x * dx + view.z * dz) / (len * vlen) <= 0) return; // veio por tras

            ev.cancel = true; // golpe frontal sempre bloqueado; machado alem disso quebra o escudo (como no vanilla)
            const isMelee = damageSource.cause === "entityAttack";
            system.run(() => {
                try {
                    if (!hurtEntity.isValid) return;
                    // a checagem do machado roda fora do evento "before" (acesso completo a componentes)
                    const axe = isMelee && attacker?.isValid && wieldsAxe(attacker);
                    if (axe) {
                        hurtEntity.triggerEvent("mn:shield_disabled");
                        hurtEntity.dimension.playSound("random.break", hurtEntity.location);
                    } else {
                        if (hurtEntity.getProperty("mn:shield_state") === "shielding") hurtEntity.triggerEvent("mn:shield_blocked"); // reinicia os 8 s
                        hurtEntity.dimension.playSound("item.shield.block", hurtEntity.location);
                    }
                    if (attacker?.isValid) markAggressor(attacker, hurtEntity);
                } catch (e) { console.warn(`[Villager_Guards] erro no escudo do Baluarte: ${e}`); }
            });
        } catch (e) {
            console.warn(`[Villager_Guards] erro ao checar o escudo do Baluarte: ${e}`);
        }
    });

    // ---- Baluarte: migracao do movimento ---------------------------------------------------------
    // A velocidade do Baluarte agora vem sempre de um grupo (mn:ready no estado normal). Baluartes salvos antes da v1.4.1
    // nao tem esse grupo; quando estao no estado "ready" (sem escudo), "mn:cooldown_end" o adiciona. Feito uma vez por entidade.
    system.runInterval(() => {
        for (const name of DIMENSIONS) {
            let list = [];
            try { list = JUGGERNAUTS.flatMap(type => world.getDimension(name).getEntities({ type })); } catch { continue; }
            for (const j of list) {
                try {
                    if (j.getDynamicProperty("mn:mv141") === 1) continue;
                    if (j.getProperty("mn:shield_state") !== "ready") continue;
                    j.triggerEvent("mn:cooldown_end");
                    j.setDynamicProperty("mn:mv141", 1);
                } catch { /* entidade descarregada */ }
            }
        }
    }, 100);

    // ---- Fim da raid: restaura alvo / perseguicao (v1.4.2) -----------------------------------------------
    // O grupo mn:raid_alert sobrescreve componentes do base; ao ser removido, o jogo apaga o componente (os guardas paravam de
    // atacar monstros depois de uma raid). Agora "mn:raid_end" recoloca esses componentes pelo grupo mn:raid_restore.
    // quando nao ha raid em andamento.
    system.runInterval(() => {
        if (raids.length > 0) return;
        for (const name of DIMENSIONS) {
            let list = [];
            try { list = world.getDimension(name).getEntities({ families: [GUARD_FAMILY] }); } catch { continue; }
            for (const g of list) {
                try {
                    if (g.getDynamicProperty("mn:rr142") === 1) continue;
                    g.triggerEvent("mn:raid_end");
                    g.setDynamicProperty("mn:rr142", 1);
                } catch { /* entidade descarregada */ }
            }
        }
    }, 100);

    // ---- Baluarte: baixa o escudo quando o alvo morre (v1.4.3) -------------------------------------------
    // Depois que o alvo morria, o Baluarte mantinha o escudo erguido ate o jogo soltar o alvo. Agora, se o alvo morreu
    // (ou foi o proprio Baluarte que abateu), o escudo baixa na hora e volta ao estado pronto, sem recarga ("mn:shield_reset").
    world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
        try {
            const deadId = deadEntity.id;
            const killerId = damageSource?.damagingEntity?.id;
            for (const name of DIMENSIONS) {
                let list = [];
                try { list = JUGGERNAUTS.flatMap(type => world.getDimension(name).getEntities({ type })); } catch { continue; }
                for (const j of list) {
                    try {
                        const state = j.getProperty("mn:shield_state");
                        if (!SHIELD_STATES.includes(state)) continue;
                        let targetId;
                        try { targetId = j.target?.id; } catch { /* sem leitura do alvo */ }
                        if (targetId !== deadId && killerId !== j.id) continue;
                        j.triggerEvent("mn:shield_reset"); // sem recarga: o escudo pode subir de novo logo
                    } catch { /* entidade invalida */ }
                }
            }
        } catch (e) { console.warn(`[Villager_Guards] erro ao baixar o escudo do Baluarte: ${e}`); }
    });
}
