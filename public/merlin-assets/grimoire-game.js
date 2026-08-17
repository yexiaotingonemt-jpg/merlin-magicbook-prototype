(function () {
  "use strict";

  const VERSION = 4;
  const SAVE_KEY = "merlin-grimoire-v4";
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => {
    const result = [...a];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const ELEMENTS = {
    fire: { name: "火", icon: "🔥" }, water: { name: "水", icon: "💧" },
    wind: { name: "风", icon: "🌪" }, earth: { name: "土", icon: "◆" },
    light: { name: "光", icon: "☀" }, dark: { name: "暗", icon: "☾" }, arcane: { name: "奥术", icon: "✶" },
    hybrid: { name: "复合", icon: "✦" }
  };
  const SCHOOL_ORDER = ["fire", "water", "wind", "earth", "light", "dark", "hybrid", "arcane"];
  const cost = (type, amount, parts) => ({ type, amount, parts });
  const C = (id, name, school, payment, echo, full, tags, extra = {}) => ({ id, name, school, cost: payment, echo, full, tags, ...extra });
  const same = (element, amount) => cost("fixed", amount, { [element]: amount });
  const fixed = (parts) => cost("fixed", Object.values(parts).reduce((a, b) => a + b, 0), parts);
  const any = (amount) => cost("any", amount);
  const random = (amount) => cost("random", amount);
  const all = (parts, min) => cost("all", min, parts);

  const CARDS = [
    C("FI-01", "余烬召来", "fire", same("fire", 0), "无残响", "缺火时增加2火，否则增加1火并强化下一张火系攻击", "元素呼应·生成", { kind: "generator" }),
    C("FI-02", "火球术", "fire", same("fire", 1), "45%伤害", "70%伤害，施加2层灼烧", "灼烧·铺垫", { pct: 70, echoPct: 45, kind: "burn", burn: 2 }),
    C("FI-03", "炎爆术", "fire", same("fire", 2), "120%伤害", "210%伤害，消耗1–3层灼烧追加伤害", "灼烧·消耗", { pct: 210, echoPct: 120, kind: "burn-finisher" }),
    C("FI-04", "焚天陨星", "fire", same("fire", 3), "170%伤害", "300%伤害，清除灼烧并追加伤害；击杀时增加1火并控制下页", "灼烧终结·击杀接续", { pct: 300, echoPct: 170, kind: "meteor" }),
    C("FI-05", "焚界献祭", "fire", all({ fire: 1 }, 2), "140%伤害", "消耗全部火，按A(N)造成伤害并结算灼烧", "单系归流", { kind: "total", echoPct: 140 }),
    C("FI-06", "炽热火花", "fire", same("fire", 1), "45%伤害", "80%伤害并获得炽热", "熔核·建立", { pct: 80, echoPct: 45, kind: "heat", stacks: 1 }),
    C("FI-07", "熔核压缩", "fire", same("fire", 2), "110%伤害", "180%伤害并获得2层炽热", "熔核·积层", { pct: 180, echoPct: 110, kind: "heat", stacks: 2 }),
    C("FI-08", "超新星", "fire", same("fire", 3), "210%伤害", "260%伤害，消耗炽热，每层追加40%", "熔核·终结", { pct: 260, echoPct: 210, kind: "heat-finisher" }),

    C("WA-01", "潮汐召来", "water", same("water", 0), "无残响", "缺水时增加2水，否则增加1水并获得水疗盾", "元素呼应·生成", { kind: "generator" }),
    C("WA-02", "水刃术", "water", same("water", 1), "42%伤害，小量回复", "75%伤害，提高水疗盾阶级", "水疗盾·续航", { pct: 75, echoPct: 42, kind: "water", heal: 8 }),
    C("WA-03", "潮汐穿刺", "water", same("water", 2), "100%伤害", "160%伤害，追加1–3段潮汐攻击", "水疗盾·多段", { pct: 160, echoPct: 100, kind: "water", hits: [2, 4], heal: 4 }),
    C("WA-04", "深海回响", "water", same("water", 3), "2–3段攻击与回复", "3–5段，水疗盾每阶再增1段，随后移除水疗盾", "水疗盾·终结", { pct: 50, echoPct: 45, kind: "water-finisher", hits: [3, 5], heal: 6 }),
    C("WA-05", "海渊回潮", "water", all({ water: 1 }, 2), "2–3段攻击与回复", "消耗全部水，水量转化为攻击和治疗次数", "单系归流", { kind: "total-water", echoPct: 40 }),
    C("WA-06", "水脉刻印", "water", same("water", 1), "40%伤害与回复", "70%伤害，回复并获得潮印", "回潮·建立", { pct: 70, echoPct: 40, kind: "tide", heal: 12, stacks: 1 }),
    C("WA-07", "回流连潮", "water", same("water", 2), "3段攻击与回复", "3–5段，每段可获得潮印", "回潮·积层", { pct: 38, echoPct: 30, kind: "tide", hits: [3, 5], heal: 5 }),
    C("WA-08", "海啸复苏", "water", same("water", 3), "2段攻击与回复", "3段攻击，消耗潮印追加攻击与治疗", "回潮·终结", { pct: 65, echoPct: 60, kind: "tide-finisher", hits: 3, heal: 5 }),

    C("WI-01", "风息召来", "wind", same("wind", 0), "无残响", "缺风时增加2风，否则增加1风并使下张风系攻击增加1段", "元素呼应·生成", { kind: "generator" }),
    C("WI-02", "风刃连斩", "wind", same("wind", 1), "1–2段25%伤害", "2–4段30%伤害，暴击可获得风势", "风势·多段", { pct: 30, echoPct: 25, hits: [2, 4], kind: "wind" }),
    C("WI-03", "千刃风暴", "wind", same("wind", 2), "3段35%伤害", "4–7段35%伤害，击杀后改选目标", "风势·多段", { pct: 35, echoPct: 35, hits: [4, 7], kind: "wind" }),
    C("WI-04", "风暴连奏", "wind", same("wind", 3), "4段40%伤害", "6–10段42%伤害，消耗风势追加段数", "风势·终结", { pct: 42, echoPct: 40, hits: [6, 10], kind: "wind-finisher" }),
    C("WI-05", "乱流书签", "wind", same("wind", 0), "无残响", "未翻风系攻击权重提高至3倍，并增加1段", "控页·加权", { kind: "wind-index" }),
    C("WI-06", "雷鸣追页", "wind", same("wind", 1), "50%伤害", "80%伤害，暴击时随机追读可完整施法的风系牌", "暴击·追页", { pct: 80, echoPct: 50, kind: "chase" }),
    C("WI-07", "万风归流", "wind", all({ wind: 1 }, 2), "3段40%伤害", "消耗全部风，转化为2N+1段攻击", "单系归流", { kind: "total-wind", echoPct: 40 }),
    C("WI-08", "感电风针", "wind", same("wind", 1), "2段25%伤害", "3段30%伤害，概率施加雷印", "雷鸣·建立", { pct: 30, echoPct: 25, hits: 3, kind: "thunder" }),
    C("WI-09", "雷链共振", "wind", same("wind", 2), "3段35%伤害", "4–6段35%伤害，命中积累雷印", "雷鸣·积层", { pct: 35, echoPct: 35, hits: [4, 6], kind: "thunder" }),
    C("WI-10", "雷霆审判", "wind", same("wind", 3), "4段40%伤害", "5段45%伤害，消耗雷印追加雷击", "雷鸣·终结", { pct: 45, echoPct: 40, hits: 5, kind: "thunder-finisher" }),

    C("EA-01", "岩核召来", "earth", same("earth", 0), "无残响", "缺土时增加2土，否则增加1土并获得护盾", "元素呼应·生成", { kind: "generator" }),
    C("EA-02", "岩甲术", "earth", same("earth", 1), "50%法防护盾", "100%法防护盾，抵消下次暴击并积累岩层", "护盾·岩层", { shield: 100, echoShield: 50, kind: "earth" }),
    C("EA-03", "大地壁垒", "earth", same("earth", 2), "110%法防护盾", "180%法防护盾，消耗岩层追加护盾与反射", "护盾·防反", { shield: 180, echoShield: 110, kind: "earth" }),
    C("EA-04", "泰坦堡垒", "earth", same("earth", 3), "180%法防护盾", "300%法防护盾，岩层转化为反击", "护盾·终结", { shield: 300, echoShield: 180, kind: "earth-finisher" }),
    C("EA-05", "大地归藏", "earth", all({ earth: 1 }, 2), "130%法防护盾", "消耗全部土，按A(N)获得护盾", "单系归流", { kind: "total-earth", echoShield: 130 }),
    C("EA-06", "棘石皮肤", "earth", same("earth", 1), "45%法防护盾", "80%法防护盾并获得1层棘甲", "荆棘·建立", { shield: 80, echoShield: 45, kind: "thorn", stacks: 1 }),
    C("EA-07", "荆棘壁阵", "earth", same("earth", 2), "100%法防护盾", "160%法防护盾并获得2层棘甲", "荆棘·积层", { shield: 160, echoShield: 100, kind: "thorn", stacks: 2 }),
    C("EA-08", "万刺山岳", "earth", same("earth", 3), "170%法防护盾", "250%法防护盾，重铸棘甲为强化棘甲", "荆棘·终结", { shield: 250, echoShield: 170, kind: "thorn-finisher" }),

    C("LI-01", "微光召来", "light", same("light", 0), "无残响", "缺光时增加2光，否则增加1光并获得辉光", "元素呼应·生成", { kind: "generator" }),
    C("LI-02", "光辉增幅", "light", same("light", 1), "下张伤害提高10%", "获得2层辉光，提高伤害与命中", "辉光·建立", { kind: "light", stacks: 2 }),
    C("LI-03", "胜利圣印", "light", same("light", 2), "获得2层辉光", "获得3层高效辉光，消耗时可概率保留", "辉光·积层", { kind: "light", stacks: 3 }),
    C("LI-04", "天穹冠冕", "light", same("light", 3), "强化后续2张伤害牌", "消耗辉光，转化为最多6枚圣印", "辉光·终结", { kind: "light-finisher" }),
    C("LI-05", "永昼圣典", "light", all({ light: 1 }, 2), "强化后续2张伤害牌", "消耗全部光，转化为长链圣印", "单系归流", { kind: "total-light" }),
    C("LI-06", "星辉赐福", "light", same("light", 1), "下张伤害提高", "获得2层随机星佑", "星佑·建立", { kind: "star", stacks: 2 }),
    C("LI-07", "祈愿轮盘", "light", same("light", 2), "获得2层星佑", "获得4层星佑，可额外获得不同祝福", "星佑·积层", { kind: "star", stacks: 4 }),
    C("LI-08", "命运加冕", "light", same("light", 3), "强化后续3张伤害牌", "消耗星佑，转化为双重祝福", "星佑·终结", { kind: "star-finisher" }),

    C("DA-01", "暗影召来", "dark", same("dark", 0), "无残响", "缺暗时增加2暗，否则增加1暗并削弱敌人", "元素呼应·生成", { kind: "generator" }),
    C("DA-02", "虚弱诅咒", "dark", same("dark", 1), "降低敌人法攻法防", "降低敌人法攻法防并施加诅咒", "诅咒·建立", { kind: "dark", stacks: 1 }),
    C("DA-03", "毁灭烙印", "dark", same("dark", 2), "后续2次伤害提高", "后续4次伤害提高，结束时爆发", "诅咒·易伤", { kind: "dark-mark" }),
    C("DA-04", "深渊裁决", "dark", same("dark", 3), "大幅降低敌人属性", "120%伤害，消耗诅咒每层追加35%", "诅咒·终结", { pct: 120, echoPct: 0, kind: "dark-finisher" }),
    C("DA-05", "永夜契约", "dark", all({ dark: 1 }, 2), "易伤并削弱敌人", "消耗全部暗和诅咒，建立长易伤链", "单系归流", { kind: "total-dark" }),
    C("DA-06", "影蚀针", "dark", same("dark", 1), "45%伤害", "70%伤害并施加蚀痕", "影蚀·建立", { pct: 70, echoPct: 45, kind: "erosion", stacks: 1 }),
    C("DA-07", "属性掠夺", "dark", same("dark", 2), "降低敌人属性", "施加2层蚀痕，窃取法攻与法防", "影蚀·积层", { kind: "erosion", stacks: 2 }),
    C("DA-08", "深渊榨取", "dark", same("dark", 3), "150%伤害并降攻", "160%伤害，消耗蚀痕追加伤害并窃取属性", "影蚀·终结", { pct: 160, echoPct: 150, kind: "erosion-finisher" })
  ];

  const HYBRIDS = [
    ["HY-01", "蒸汽爆裂", { fire: 1, water: 1 }, 160, "灼烧＋固定回复"], ["HY-02", "冰风暴", { water: 1, wind: 1 }, 38, "3–5段攻击，每段回复", [3, 5]],
    ["HY-03", "雷暴术", { water: 1, wind: 2 }, 48, "5–8段攻击，每段回复", [5, 8]], ["HY-04", "熔岩护甲", { fire: 1, earth: 1 }, 0, "护盾、反射并施加灼烧"],
    ["HY-05", "圣焰术", { fire: 1, light: 1 }, 190, "高伤、灼烧与后续增幅"], ["HY-06", "暗影疾风", { wind: 1, dark: 1 }, 36, "4–6段攻击并叠加易伤", [4, 6]],
    ["HY-07", "光辉壁垒", { earth: 1, light: 1 }, 0, "护盾与辉光"], ["HY-08", "日蚀仪式", { light: 1, dark: 1 }, 0, "强化己方并削弱敌人"],
    ["HY-09", "珊瑚壁垒", { water: 1, earth: 1 }, 0, "护盾、次数治疗与过量转盾"], ["HY-10", "辉焰风暴", { fire: 1, wind: 1, light: 1 }, 45, "4–7段、灼烧与后续增幅", [4, 7]],
    ["HY-11", "翠潮天幕", { water: 1, wind: 1, earth: 1 }, 40, "4–6段，每段治疗并获得护盾", [4, 6]], ["HY-12", "元素湮灭", null, 0, "消耗全部元素，多系提高总伤害"]
  ];
  HYBRIDS.forEach(([id, name, parts, pct, fullText, hits]) => CARDS.push(C(id, name, "hybrid", parts ? fixed(parts) : all(null, 3), "保底效果，不消耗元素", fullText, "复合元素·特性融合", { pct, echoPct: pct ? Math.round(pct * .55) : 0, hits, kind: id === "HY-12" ? "total-all" : "hybrid" })));

  const TOTAL_HYBRIDS = [
    ["HY-13", "烬潮归炉", { fire: 1, water: 1 }, 3, "火伤害、灼烧与水治疗"], ["HY-14", "雷潮归环", { water: 1, wind: 1 }, 3, "风决定段数，水将每段转为治疗"],
    ["HY-15", "熔星城垒", { fire: 1, earth: 1 }, 3, "土护盾与火反击"], ["HY-16", "日蚀归零", { light: 1, dark: 1 }, 3, "光强化己方，暗削弱敌方"],
    ["HY-17", "苍穹圣焰", { fire: 1, wind: 1, light: 1 }, 4, "风多段、火灼烧与光强化"], ["HY-18", "沧岚磐潮", { water: 1, wind: 1, earth: 1 }, 4, "风多段、水次数治疗与土护盾"]
  ];
  TOTAL_HYBRIDS.forEach(([id, name, parts, min, fullText]) => CARDS.push(C(id, name, "hybrid", all(parts, min), "保底效果，不消耗元素", `消耗指定元素的全部剩余数量；${fullText}`, "复合归流·完全消耗", { kind: "total-hybrid", echoPct: 150 })));

  const COMMONS = [
    C("CO-02", "完整索引", "arcane", any(1), "下次翻页高耗可施法牌权重×3", "随机发动1张当前可完整施法的最高消耗牌", "控页·合法候选", { kind: "index" }),
    C("CO-03", "元素目录", "arcane", any(1), "主要元素消耗牌权重×3", "随机发动1张消耗当前数量最多元素的牌", "控页·资源导向", { kind: "index" }),
    C("CO-04", "高阶目录", "arcane", any(2), "最高消耗未翻牌权重×4", "从最高3张高消耗未翻牌中随机发动1张", "控页·高风险", { kind: "index" }),
    C("CO-08", "未竟书签", "arcane", any(0), "无残响", "获得护盾，记录首张残响牌并在元素足够时重试", "容错·残响重试", { kind: "bookmark" }),
    C("CO-09", "重演术", "arcane", any(2), "将近期完整施法牌排到下轮首页", "随机重读近期完整施法牌", "控页·重读", { kind: "replay" }),
    C("CO-11", "魔力归源", "arcane", any(1), "强化下张主元素牌", "将主元素补充至初始配置数量，最多增加3个", "元素经济·条件补充", { kind: "refill" }),
    C("CO-12", "元素同调", "arcane", any(1), "改写下张未翻牌的固定元素", "本轮所有未翻牌的消耗与获取改写为主元素", "元素经济·同调", { kind: "attune" }),
    C("CO-14", "混沌冲击", "arcane", random(2), "140%伤害", "260%伤害，触发两个被消耗元素的余韵", "随机双耗·单段", { pct: 260, echoPct: 140, kind: "basic" }),
    C("CO-15", "双星魔弹", "arcane", random(2), "2段70%伤害", "2段130%伤害，分别继承两种元素", "随机双耗·双段", { pct: 130, echoPct: 70, hits: 2, kind: "basic" }),
    C("CO-16", "元素散射", "arcane", random(2), "4段35%伤害", "4段65%伤害，击杀后重新选目标", "随机双耗·多段", { pct: 65, echoPct: 35, hits: 4, kind: "basic" }),
    C("CO-17", "延时坍缩", "arcane", random(2), "140%伤害", "200%即时＋60%延时伤害", "随机双耗·延时", { pct: 260, echoPct: 140, kind: "basic" }),
    C("CO-18", "魔法飞弹", "arcane", any(1), "60%伤害", "110%伤害，无法被闪避", "基础攻击·可靠命中", { pct: 110, echoPct: 60, kind: "basic", sureHit: true }),
    C("CO-19", "奥术冲击", "arcane", any(2), "140%伤害", "250%伤害，暴击率提高15个百分点", "基础攻击·爆发", { pct: 250, echoPct: 140, kind: "basic", crit: .15 }),
    C("CO-20", "星界陨落", "arcane", any(3), "240%伤害", "440%伤害，击杀时转移部分溢出伤害", "基础攻击·重击", { pct: 440, echoPct: 240, kind: "basic" }),
    C("CO-21", "裂变魔弹", "arcane", any(2), "2段70%伤害", "2段125%伤害，每段独立判定", "基础攻击·双段", { pct: 125, echoPct: 70, hits: 2, kind: "basic" }),
    C("CO-22", "穿透射线", "arcane", any(2), "125%伤害", "220%伤害，忽略目标25%法术防御", "基础攻击·穿透", { pct: 220, echoPct: 125, kind: "basic", pierce: .25 }),
    C("CO-23", "奥术齐射", "arcane", any(3), "4段60%伤害", "6段75%伤害，击杀后重新选目标", "基础攻击·多段", { pct: 75, echoPct: 60, hits: 6, echoHits: 4, kind: "basic" })
  ];
  CARDS.push(...COMMONS);
  const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));
  const PASSIVES = [
    { id: "P-ATK", name: "魔力增幅", copy: "永久提高2点法攻。", apply: () => { state.meta.attack += 2; } },
    { id: "P-HP", name: "生命铭文", copy: "永久提高10点最大生命。", apply: () => { state.meta.maxHp += 10; state.hp += 10; } },
    { id: "P-DEF", name: "奥术壁垒", copy: "永久提高2点法防。", apply: () => { state.meta.defense += 2; } },
    { id: "P-HIT", name: "鹰眼符印", copy: "永久提高1点法攻与1点法防。", apply: () => { state.meta.attack += 1; state.meta.defense += 1; } },
    { id: "P-DODGE", name: "幻影身法", copy: "永久提高7点生命与1点法防。", apply: () => { state.meta.maxHp += 7; state.meta.defense += 1; state.hp += 7; } },
    { id: "P-CRIT", name: "星爆核心", copy: "永久提高3点法攻。", apply: () => { state.meta.attack += 3; } },
    { id: "P-RESIST", name: "不屈意志", copy: "永久提高12点最大生命。", apply: () => { state.meta.maxHp += 12; state.hp += 12; } },
    { id: "P-POOL", name: "元素容器", copy: "永久提高1格战斗元素池上限。", apply: () => { state.meta.poolBonus = (state.meta.poolBonus || 0) + 1; } }
  ];
  const STARTER_DECK = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19"];

  const EVENTS = {
    experience: { name: "魔法课堂", icon: "✥", copy: "获得角色经验，提升本次探索的基础属性。" },
    element: { name: "元素池", icon: "◈", copy: "增加或替换一个起始元素。" },
    library: { name: "残破书库", icon: "📖", copy: "从三张随机咒语中选择一张，新书页直接装订。" },
    monster: { name: "元素试炼", icon: "⚔", copy: "挑战塔中怪物，获得经验与积分。" },
    rest: { name: "休息室", icon: "☽", copy: "回复生命值；生命会在探索中继承。" },
    transmute: { name: "沸腾实验室", icon: "⚗", copy: "将一张已学咒语转化为同消耗的其他系咒语。" },
    upgrade: { name: "幽灵导师", icon: "♕", copy: "直接提升一张战斗书页的等级。" },
    organize: { name: "装订台", icon: "☷", copy: "获得一次安全拆页机会，保留咒语等级。" },
    player: { name: "镜像法师", icon: "⚜", copy: "与玩家快照进行异步战斗，双方满血且随机先手。" }
  };

  let state;
  let currentView = "explore";
  let battleTimer = null;
  let battleSpeed = 1;
  let paused = false;
  let pendingElement = null;

  function freshState(legacy = {}) {
    const collection = Object.fromEntries([...STARTER_DECK, "WA-01", "WI-01", "EA-01", "LI-01", "DA-01"].map((id) => [id, 1]));
    const meta = legacy.meta || { attack: 0, defense: 0, maxHp: 0, startBonus: 0, passiveLevels: {} };
    return {
      gameVersion: VERSION, board: [], preview: [], chapter: 1, projection: 0,
      score: Number(legacy.score || 0), floor: 1, level: 1, exp: 0,
      hp: 280 + (meta.maxHp || 0), startElements: ["fire", "fire", "fire"],
      collection, deck: [...STARTER_DECK], organizeTokens: 0, fatigue: 100,
      meta, events: [], eventResult: null, battle: null
    };
  }

  function maxHp() { return 280 + (state.level - 1) * 18 + state.meta.maxHp; }
  function attack() { return 100 + (state.level - 1) * 7 + state.meta.attack; }
  function defense() { return 55 + (state.level - 1) * 4 + state.meta.defense; }
  function expNeed(level = state.level) { return 80 + (level - 1) * 40; }
  function slotCap() { return Math.min(8, 3 + (state.level >= 3) + (state.level >= 5) + (state.level >= 8) + (state.level >= 12) + (state.level >= 16) + (state.meta.startBonus || 0)); }
  function poolCap() { return Math.min(16, slotCap() + 3 + (state.meta.poolBonus || 0)); }
  function mainElement() {
    const counts = {};
    state.startElements.forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "fire";
  }
  function cardLevel(id) { return state.collection[id] || 0; }
  function levelScale(id) { return 1 + Math.max(0, cardLevel(id) - 1) * .1; }
  function costLabel(card) {
    const c = card.cost;
    if (c.type === "any") return `${c.amount} 任意`;
    if (c.type === "random") return `随机 ${c.amount}`;
    if (c.type === "all") return `完全消耗 ≥${c.amount}`;
    if (!c.amount) return "0";
    return Object.entries(c.parts).map(([e, n]) => `${n}${ELEMENTS[e].name}`).join("+");
  }
  function schoolLabel(school) { return `${ELEMENTS[school].icon} ${ELEMENTS[school].name}`; }
  function randomInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function variance() { return .4 + 2.6 * Math.pow(Math.random(), 10 / 3); }
  function esc(text) { return String(text).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

  function generateEvents() {
    const types = Object.keys(EVENTS);
    let chosen;
    if (state.floor % 10 === 0) chosen = ["monster", ...shuffle(types.filter((x) => !["monster", "rest"].includes(x))).slice(0, 2)];
    else chosen = shuffle(types).slice(0, 3);
    state.events = chosen.map((type, index) => ({ id: `${state.floor}-${index}-${type}`, type }));
    state.board = state.events.map((event) => ({ id: event.id, kindLabel: EVENTS[event.type].name, hp: 1, maxHp: 1, element: "light" }));
  }

  function serializeState() {
    return JSON.parse(JSON.stringify({ ...state, battle: state.battle && !state.battle.over ? state.battle : null }));
  }
  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); } catch { /* storage can be unavailable */ }
    if (window.parent !== window) window.parent.postMessage({ type: "merlin:state", state: serializeState() }, "*");
  }
  function hydrate(data) {
    if (!data || data.gameVersion !== VERSION || !Array.isArray(data.deck)) return false;
    state = { ...freshState(data), ...data, board: Array.isArray(data.board) ? data.board : [] };
    state.meta = { ...freshState().meta, ...(data.meta || {}) };
    if (!state.events?.length) generateEvents();
    state.hp = clamp(state.hp, 1, maxHp());
    return true;
  }
  function loadLocal() {
    try { return hydrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return false; }
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { $("toast").hidden = true; }, 2600);
  }
  function showModal(html, closable = true) {
    $("modalContent").innerHTML = html;
    $("modalClose").hidden = !closable;
    $("modal").hidden = false;
  }
  function closeModal() { $("modal").hidden = true; pendingElement = null; }
  function elementOrb(element, empty = false) {
    if (empty) return '<span class="element-orb empty">+</span>';
    const colors = { fire: "#e46f46", water: "#4aa8dc", wind: "#77cdbd", earth: "#b08b5d", light: "#f1d56f", dark: "#aa76c7" };
    return `<span class="element-orb" style="--c:${colors[element]}">${ELEMENTS[element].name}</span>`;
  }
  function levelPips(level) { return `<span class="level-pips">${Array.from({ length: 6 }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("")}</span>`; }
  function deckCounts() {
    const counts = {};
    state.deck.forEach((id) => { const s = CARD_BY_ID.get(id)?.school; if (s) counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }
  function showView(name) {
    if (name !== "battle" && state.battle && !state.battle.over) { toast("战斗进行中，请先完成或暂停战斗。"); return; }
    currentView = name;
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function renderRunStats() {
    $("runStats").innerHTML = `<div class="stat-chip"><span>层数</span><b>${state.floor}F</b></div><div class="stat-chip"><span>生命</span><b>${Math.ceil(state.hp)}/${maxHp()}</b></div><div class="stat-chip"><span>积分</span><b>${state.score}</b></div>`;
  }
  function renderExplore() {
    $("floorTitle").textContent = `第 ${state.floor} 层${state.floor % 10 === 0 ? " · 首领层" : ""}`;
    $("wizardLevel").textContent = `Lv.${state.level}`;
    $("vitalStats").innerHTML = [
      ["生命", `${Math.ceil(state.hp)} / ${maxHp()}`, state.hp / maxHp()], ["法攻", attack(), 1], ["法防", defense(), 1]
    ].map(([name, value, ratio]) => `<div class="stat-line"><span>${name}</span><div class="mini-bar"><i style="width:${Math.min(100, ratio * 100)}%"></i></div><strong>${value}</strong></div>`).join("");
    $("expBar").firstElementChild.style.width = `${state.exp / expNeed() * 100}%`;
    $("expText").textContent = `经验 ${state.exp} / ${expNeed()}；升级提升生命、法攻、法防及元素容量。`;
    $("elementSlotText").textContent = `${state.startElements.length} / ${slotCap()}`;
    $("startElements").innerHTML = [...state.startElements.map((e) => elementOrb(e)), ...Array.from({ length: Math.max(0, slotCap() - state.startElements.length) }, () => elementOrb(null, true))].join("");
    $("deckCount").textContent = `${state.deck.length} 页`;
    const counts = deckCounts();
    $("deckProfile").innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<span class="profile-chip ${s}">${schoolLabel(s)} ${n}</span>`).join("");
    $("eventChoices").hidden = Boolean(state.eventResult);
    $("eventResult").hidden = !state.eventResult;
    $("continueButton").hidden = !state.eventResult;
    if (state.eventResult) {
      $("eventResult").innerHTML = `<div style="font-size:38px">✦</div><h2>${esc(state.eventResult.title)}</h2><p>${esc(state.eventResult.copy)}</p>`;
    } else {
      $("eventChoices").innerHTML = state.events.map((event, index) => {
        const meta = EVENTS[event.type];
        const glow = ["#915c72", "#557f9d", "#74668f"][index];
        return `<button class="event-card" data-event="${event.type}" style="--event-glow:${glow}"><small>ROOM ${state.floor}-${index + 1}</small><span class="event-icon">${meta.icon}</span><h3>${meta.name}</h3><p>${meta.copy}</p><b>进入房间 →</b></button>`;
      }).join("");
    }
  }
  function cardMatches(card, search, school, costFilter) {
    const q = search.trim().toLowerCase();
    if (q && !`${card.id}${card.name}${card.tags}`.toLowerCase().includes(q)) return false;
    if (school !== "all" && card.school !== school) return false;
    if (costFilter && costFilter !== "all") {
      if (costFilter === "all-cost" && card.cost.type !== "all") return false;
      if (costFilter !== "all-cost" && card.cost.amount !== Number(costFilter)) return false;
    }
    return true;
  }
  function spellRow(card, location) {
    const lv = cardLevel(card.id);
    const canRemove = state.organizeTokens > 0;
    return `<article class="spell-row ${card.school}"><span class="spell-rune">${card.id}</span><div><h3>${card.name}</h3><small>${schoolLabel(card.school)} · 消耗 ${costLabel(card)}</small>${levelPips(lv)}</div><p><b>完整：</b>${card.full}<br><b>残响：</b>${card.echo}</p>${location === "deck" ? `<button data-unbind="${card.id}" ${canRemove ? "" : "disabled"}>移入仓库</button>` : `<button data-bind="${card.id}">装订</button>`}</article>`;
  }
  function renderGrimoire() {
    const search = $("cardSearch").value || "";
    const school = $("schoolFilter").value || "all";
    const costF = $("costFilter").value || "all";
    const deckCards = state.deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean).filter((c) => cardMatches(c, search, school, costF));
    const warehouseCards = Object.keys(state.collection).filter((id) => !state.deck.includes(id)).map((id) => CARD_BY_ID.get(id)).filter(Boolean).filter((c) => cardMatches(c, search, school, costF));
    $("organizeTokens").innerHTML = `安全整理 <b>${state.organizeTokens}</b> 次`;
    $("combatDeckCount").textContent = `${state.deck.length} 页（无上限）`;
    $("warehouseCount").textContent = `${Object.keys(state.collection).length - state.deck.length} 页`;
    $("combatDeckCards").innerHTML = deckCards.map((c) => spellRow(c, "deck")).join("") || '<p class="empty-copy">没有符合条件的战斗书页。</p>';
    $("warehouseCards").innerHTML = warehouseCards.map((c) => spellRow(c, "warehouse")).join("") || '<p class="empty-copy">仓库中没有符合条件的书页。</p>';
  }
  function renderArchive() {
    const search = $("archiveSearch").value || "";
    const school = $("archiveSchoolFilter").value || "all";
    const filtered = CARDS.filter((c) => cardMatches(c, search, school));
    $("catalogProgress").innerHTML = `已学 <b>${Object.keys(state.collection).length}</b> / ${CARDS.length}`;
    $("archiveGrid").innerHTML = filtered.map((card) => {
      const lv = cardLevel(card.id);
      return `<article class="archive-card ${card.school} ${lv ? "" : "locked"}"><span class="spell-rune">${card.id}</span><h3>${card.name}</h3><p><b>${costLabel(card)}</b> · ${card.tags}</p><p>${card.full}</p><footer><span>${schoolLabel(card.school)}</span><span>${lv ? `Lv.${lv}` : "未学习"}</span></footer></article>`;
    }).join("");
  }
  const SHOP = [
    { id: "attack", icon: "✦", name: "法攻手稿", copy: "永久提高5点基础法术攻击。", base: 90, apply: () => { state.meta.attack += 5; } },
    { id: "defense", icon: "◈", name: "护法铭文", copy: "永久提高4点基础法术防御。", base: 80, apply: () => { state.meta.defense += 4; } },
    { id: "maxHp", icon: "♥", name: "生命秘典", copy: "永久提高25点最大生命，并立即回复。", base: 100, apply: () => { state.meta.maxHp += 25; state.hp += 25; } },
    { id: "startBonus", icon: "✥", name: "元素扩容", copy: "永久增加1个起始元素槽上限，总上限仍为8。", base: 260, apply: () => { state.meta.startBonus = Math.min(2, (state.meta.startBonus || 0) + 1); } }
  ];
  function shopLevel(id) { return Number(state.meta.passiveLevels?.[id] || 0); }
  function shopCost(item) { return Math.round(item.base * (1 + shopLevel(item.id) * .55)); }
  function renderShop() {
    $("shopScore").textContent = state.score;
    $("shopGrid").innerHTML = SHOP.map((item) => {
      const level = shopLevel(item.id), price = shopCost(item), capped = item.id === "startBonus" && level >= 2;
      return `<article class="shop-item"><span class="shop-icon">${item.icon}</span><h2>${item.name}</h2><p>${item.copy}</p><p>Lv.${level} · 下次价格 ${price}</p><button data-buy="${item.id}" ${(state.score < price || capped) ? "disabled" : ""}>${capped ? "已达上限" : `兑换 · ${price} 积分`}</button></article>`;
    }).join("");
  }
  function render() {
    renderRunStats();
    if (currentView === "explore") renderExplore();
    if (currentView === "grimoire") renderGrimoire();
    if (currentView === "archive") renderArchive();
    if (currentView === "shop") renderShop();
    if (currentView === "battle") renderBattle();
  }

  function completeEvent(title, copy) {
    state.eventResult = { title, copy };
    state.battle = null;
    paused = false;
    clearTimeout(battleTimer);
    currentView = "explore";
    saveState();
    showView("explore");
  }
  function continueExplore() {
    state.floor += 1; state.chapter = state.floor; state.eventResult = null; generateEvents(); saveState(); render();
  }
  function gainExp(amount) {
    state.exp += amount;
    let gained = 0;
    while (state.exp >= expNeed()) {
      state.exp -= expNeed(); state.level += 1; gained += 1; state.hp = Math.min(maxHp(), state.hp + 38);
    }
    return gained;
  }
  function chooseCardModal(title, cards, action, copy = "选择一张书页。") {
    showModal(`<h2>${title}</h2><p>${copy}</p><div class="choice-grid">${cards.map((card) => `<button class="choice-button ${card.school}" data-modal-card="${card.id}"><h3>${card.name}</h3><small>${card.id} · ${costLabel(card)}</small><p>${card.full}</p></button>`).join("")}</div>`);
    $("modalContent").onclick = (event) => {
      const id = event.target.closest("[data-modal-card]")?.dataset.modalCard;
      if (!id) return; closeModal(); action(CARD_BY_ID.get(id));
    };
  }
  function choosePassiveModal() {
    const choices = shuffle(PASSIVES).slice(0, 3);
    showModal(`<h2>被动秘典 · 三选一</h2><p>被动卡不进入战斗魔法书，可无限升级；当所有战斗咒语满级后，成长牌库只会出现这些秘典。</p><div class="choice-grid">${choices.map((passive) => `<button class="choice-button arcane" data-passive="${passive.id}"><h3>${passive.name}</h3><small>${passive.id} · 当前 Lv.${Number(state.meta.passiveLevels?.[passive.id] || 0)}</small><p>${passive.copy}</p></button>`).join("")}</div>`);
    $("modalContent").onclick = (event) => {
      const id = event.target.closest("[data-passive]")?.dataset.passive; if (!id) return;
      const passive = PASSIVES.find((item) => item.id === id); passive.apply(); state.meta.passiveLevels[id] = Number(state.meta.passiveLevels[id] || 0) + 1;
      closeModal(); completeEvent("秘典成长", `${passive.name}提升至 Lv.${state.meta.passiveLevels[id]}：${passive.copy}`);
    };
  }
  function learnCard(card, forceDeck = true) {
    if (cardLevel(card.id)) {
      state.collection[card.id] = Math.min(6, cardLevel(card.id) + 1);
      return `${card.name}升至 Lv.${cardLevel(card.id)}`;
    }
    state.collection[card.id] = 1;
    if (forceDeck) state.deck.push(card.id);
    return `学会${card.name}，已装订到战斗魔法书`;
  }
  function resolveEvent(type) {
    if (type === "monster") { startBattle("pve"); return; }
    if (type === "player") { startBattle("pvp"); return; }
    if (type === "experience") {
      const amount = 42 + state.floor * 5, levels = gainExp(amount);
      completeEvent("课程完成", `获得 ${amount} 点经验${levels ? `，提升了 ${levels} 级` : ""}。`); return;
    }
    if (type === "rest") {
      const before = state.hp; state.hp = Math.min(maxHp(), state.hp + Math.ceil(maxHp() * .42));
      completeEvent("壁炉仍有余温", `回复 ${Math.ceil(state.hp - before)} 点生命。`); return;
    }
    if (type === "organize") { state.organizeTokens += 1; completeEvent("获得安全整理", "获得1次安全拆页机会。在魔法书中可将一张战斗书页移回仓库，并保留等级。"); return; }
    if (type === "library") {
      const pool = CARDS.filter((c) => cardLevel(c.id) < 6);
      if (!pool.length || Math.random() < .16) { choosePassiveModal(); return; }
      chooseCardModal("残破书库 · 三选一", shuffle(pool).slice(0, 3), (card) => completeEvent("书页归位", learnCard(card, true)), "学习新咒语时会直接装订；同名书页会升级，Lv.3与Lv.6发生质变。"); return;
    }
    if (type === "upgrade") {
      const cards = state.deck.map((id) => CARD_BY_ID.get(id)).filter((c) => cardLevel(c.id) < 6);
      if (!cards.length) { state.score += 60; completeEvent("幽灵导师", "战斗魔法书中所有咒语已满级，改为获得60积分。"); return; }
      chooseCardModal("幽灵导师", cards, (card) => { state.collection[card.id] += 1; completeEvent("指导完成", `${card.name}升至 Lv.${cardLevel(card.id)}。${[3, 6].includes(cardLevel(card.id)) ? "该咒语已发生机制质变。" : ""}`); }); return;
    }
    if (type === "element") { showElementEvent(); return; }
    if (type === "transmute") {
      const candidates = Object.keys(state.collection).map((id) => CARD_BY_ID.get(id)).filter((c) => c && ["fire", "water", "wind", "earth", "light", "dark"].includes(c.school));
      chooseCardModal("沸腾实验室", shuffle(candidates).slice(0, 9), (oldCard) => {
        const sameCost = CARDS.filter((c) => c.school !== oldCard.school && c.school !== "arcane" && c.cost.type === oldCard.cost.type && c.cost.amount === oldCard.cost.amount && !cardLevel(c.id));
        const replacement = pick(sameCost.length ? sameCost : CARDS.filter((c) => c.school !== oldCard.school && c.cost.amount === oldCard.cost.amount));
        const wasDeck = state.deck.includes(oldCard.id), lv = cardLevel(oldCard.id);
        delete state.collection[oldCard.id]; state.collection[replacement.id] = Math.max(lv, cardLevel(replacement.id));
        if (wasDeck) state.deck[state.deck.indexOf(oldCard.id)] = replacement.id;
        completeEvent("转化完成", `${oldCard.name}转化为${replacement.name}，保留 Lv.${lv}。`);
      }, "选择要转化的已学单系咒语；结果保留等级和装订位置。");
    }
  }
  function showElementEvent() {
    showModal(`<h2>元素池</h2><p>选择要增加的起始元素。${state.startElements.length >= slotCap() ? "当前已满，下一步需选择被替换的元素。" : ""}</p><div class="choice-grid">${SCHOOL_ORDER.slice(0, 6).map((e) => `<button class="choice-button ${e}" data-element="${e}"><h3>${ELEMENTS[e].icon} ${ELEMENTS[e].name}元素</h3><p>将${ELEMENTS[e].name}纳入起始编排。</p></button>`).join("")}</div>`);
    $("modalContent").onclick = (event) => {
      const element = event.target.closest("[data-element]")?.dataset.element;
      if (!element) return;
      if (state.startElements.length < slotCap()) { state.startElements.push(element); closeModal(); completeEvent("元素增加", `起始编排增加1个${ELEMENTS[element].name}元素。`); return; }
      pendingElement = element;
      showModal(`<h2>选择替换位置</h2><p>选择一个现有元素，将它替换为${ELEMENTS[element].name}。</p><div class="choice-grid">${state.startElements.map((e, i) => `<button class="choice-button ${e}" data-replace="${i}"><h3>位置 ${i + 1}</h3><p>${ELEMENTS[e].icon} ${ELEMENTS[e].name} → ${ELEMENTS[element].icon} ${ELEMENTS[element].name}</p></button>`).join("")}</div>`);
      $("modalContent").onclick = (replaceEvent) => {
        const index = replaceEvent.target.closest("[data-replace]")?.dataset.replace;
        if (index == null) return; const old = state.startElements[index]; state.startElements[index] = pendingElement; closeModal(); completeEvent("元素替换", `${ELEMENTS[old].name}元素已替换为${ELEMENTS[state.startElements[index]].name}元素。`);
      };
    };
  }
  function newTowerRun() {
    const keep = { score: state.score, meta: state.meta };
    const collection = state.collection, deck = state.deck, startElements = state.startElements;
    state = freshState(keep); state.collection = collection; state.deck = deck.length ? deck : [...STARTER_DECK]; state.startElements = startElements.slice(0, slotCap());
    generateEvents(); saveState(); closeModal(); showView("explore"); toast("已重新进入法师塔；塔内等级和生命已重置。");
  }

  function createEnemies(mode) {
    if (mode === "pvp") {
      const names = ["灰塔的艾莉亚", "翠风学徒罗伊", "暗月记录者", "赤焰魔导师"];
      const hp = Math.round(maxHp() * (1 + Math.min(.35, state.floor * .012)));
      return [{ id: "mirror", name: pick(names), hp, maxHp: hp, atk: attack() * .82, def: defense() * .92, burn: 0, curse: 0, thunder: 0, erosion: 0, vulnerable: 0, icon: "♙" }];
    }
    const boss = state.floor % 10 === 0;
    const count = boss ? 1 : state.floor >= 7 ? randomInt(2, 3) : state.floor >= 3 ? randomInt(1, 2) : 1;
    const names = boss ? ["星辉魔像", "深渊典藏官", "六相元素龙"] : ["灰烬小鬼", "结晶魔犬", "风之鸦", "苔石傀儡", "书页幽灵", "虚空信徒"];
    return Array.from({ length: count }, (_, i) => {
      const hp = Math.round((boss ? 440 : 125 + count * 16) * (1 + state.floor * .13));
      return { id: `enemy-${i}`, name: boss ? pick(names) : `${pick(names)}${count > 1 ? ` ${i + 1}` : ""}`, hp, maxHp: hp, atk: (boss ? 54 : 29) * (1 + state.floor * .075), def: 35 + state.floor * 5, burn: 0, curse: 0, thunder: 0, erosion: 0, vulnerable: 0, icon: boss ? "♛" : "♞" };
    });
  }
  function startBattle(mode, restartSpec = null) {
    if (!state.deck.length) { toast("战斗魔法书没有书页，无法开始战斗。"); showView("grimoire"); return; }
    clearTimeout(battleTimer);
    const spec = restartSpec || { mode, floor: state.floor, hp: mode === "pvp" ? maxHp() : state.hp };
    const enemies = createEnemies(mode);
    state.battle = {
      mode, spec, enemies, playerHp: spec.hp, playerMaxHp: maxHp(), shield: 0,
      elements: state.startElements.slice(0, poolCap()), poolCap: poolCap(),
      drawPile: shuffle(state.deck), discarded: [], cycle: 1, drawnInCycle: 0,
      turn: mode === "pve" ? "player" : (Math.random() < .5 ? "player" : "enemy"),
      enemyCursor: 0, action: 0, logs: [], over: false, won: false, currentCard: null, castType: null,
      player: { heat: 0, tide: 0, wind: 0, light: 0, star: 0, thorns: 0, rock: 0, waterShield: 0, nextWind: 0, damageBuff: 0, windWeight: 0, bookmark: null, attuned: null, recent: [] },
      enemyFatigue: mode === "pvp" ? 100 : null
    };
    paused = false; battleSpeed = 1; addLog(mode === "pve" ? "你抢占先手，魔法书开始随机翻页。" : `${state.battle.turn === "player" ? "你" : "镜像法师"}获得随机先手。`, "good");
    currentView = "battle"; showView("battle"); scheduleBattle(650);
  }
  function addLog(message, tone = "") {
    const b = state.battle; if (!b) return;
    b.logs.unshift({ n: b.action + 1, message, tone });
    b.logs = b.logs.slice(0, 80);
  }
  function countElements(elements = state.battle.elements) {
    return elements.reduce((map, e) => { map[e] = (map[e] || 0) + 1; return map; }, {});
  }
  function effectiveCost(card) {
    if (!state.battle.player.attuned || card.cost.type !== "fixed" || !card.cost.amount) return card.cost;
    return fixed({ [state.battle.player.attuned]: card.cost.amount });
  }
  function paymentFor(card) {
    const elements = state.battle.elements, c = effectiveCost(card);
    if (c.type === "any") return elements.length >= c.amount ? [...Array(c.amount).keys()] : null;
    if (c.type === "random") return elements.length >= c.amount ? shuffle([...elements.keys()]).slice(0, c.amount).sort((a, b) => a - b) : null;
    if (c.type === "fixed") {
      const indices = [], used = new Set();
      for (const [element, needed] of Object.entries(c.parts || {})) {
        const found = elements.map((e, i) => e === element && !used.has(i) ? i : -1).filter((i) => i >= 0).slice(0, needed);
        if (found.length < needed) return null; found.forEach((i) => { used.add(i); indices.push(i); });
      }
      return indices.sort((a, b) => a - b);
    }
    if (c.type === "all") {
      const allowed = c.parts ? Object.keys(c.parts) : null;
      const counts = countElements();
      if (c.parts && Object.keys(c.parts).some((e) => !counts[e])) return null;
      const indices = elements.map((e, i) => (!allowed || allowed.includes(e)) ? i : -1).filter((i) => i >= 0);
      return indices.length >= c.amount ? indices : null;
    }
    return null;
  }
  function spend(indices) {
    const paid = indices.map((i) => state.battle.elements[i]);
    [...indices].sort((a, b) => b - a).forEach((i) => state.battle.elements.splice(i, 1));
    return paid;
  }
  function addElement(element, amount = 1) {
    const b = state.battle; let added = 0;
    while (amount-- > 0 && b.elements.length < b.poolCap) { b.elements.push(element); added += 1; }
    return added;
  }
  function drawCard() {
    const b = state.battle;
    if (!b.drawPile.length) { b.drawPile = shuffle(state.deck); b.discarded = []; b.drawnInCycle = 0; b.cycle += 1; b.player.attuned = null; addLog(`所有书页翻完，重新洗回，进入第 ${b.cycle} 轮。`); }
    const counts = countElements();
    const missingGeneratorIndex = b.drawPile.findIndex((id) => {
      const card = CARD_BY_ID.get(id); return card?.kind === "generator" && !counts[card.school];
    });
    let index = missingGeneratorIndex >= 0 ? missingGeneratorIndex : Math.floor(Math.random() * b.drawPile.length);
    if (missingGeneratorIndex < 0 && b.player.windWeight > 0) {
      const windIndices = b.drawPile.map((id, i) => CARD_BY_ID.get(id)?.school === "wind" ? i : -1).filter((i) => i >= 0);
      if (windIndices.length && Math.random() < .72) index = pick(windIndices);
      b.player.windWeight = 0;
    }
    const [id] = b.drawPile.splice(index, 1); b.discarded.push(id); b.drawnInCycle += 1;
    return CARD_BY_ID.get(id);
  }
  function targetLowest() {
    const alive = state.battle.enemies.filter((e) => e.hp > 0); if (!alive.length) return null;
    const min = Math.min(...alive.map((e) => e.hp)); return pick(alive.filter((e) => e.hp === min));
  }
  function hitEnemy(basePct, school, options = {}) {
    const b = state.battle, target = targetLowest(); if (!target) return { damage: 0, crit: false, killed: false };
    const effectiveDef = target.def * (1 - (options.pierce || 0)) * (1 - Math.min(.45, target.erosion * .02));
    const hitChance = options.sureHit ? 1 : .9;
    if (Math.random() > hitChance) { addLog(`${target.name}闪过了这一击。`); return { damage: 0, crit: false, killed: false }; }
    const critChance = .1 + (options.crit || 0) + Math.min(.25, b.player.heat * .05);
    const crit = Math.random() < critChance;
    const roll = variance();
    let multiplier = 1;
    if (b.player.light > 0) { multiplier += .15; b.player.light -= 1; }
    if (b.player.star > 0) { multiplier += pick([.12, .18, .24]); b.player.star -= 1; }
    if (b.player.damageBuff > 0) { multiplier += b.player.damageBuff; b.player.damageBuff = 0; }
    if (target.vulnerable > 0) multiplier += .12;
    const damage = Math.max(1, Math.round(attack() * basePct / 100 * roll * (1000 / (1000 + effectiveDef)) * (crit ? 1.5 : 1) * multiplier));
    const before = target.hp; target.hp = Math.max(0, target.hp - damage);
    if (target.vulnerable > 0) target.vulnerable -= 1;
    if (b.mode === "pvp") {
      b.enemyFatigue = target.hp <= 0 ? 0 : Math.max(0, b.enemyFatigue - 20);
      if (b.enemyFatigue === 0 && target.hp > 0) {
        const own = b.elements.length ? Math.floor(Math.random() * b.elements.length) : -1;
        if (own >= 0) { const old = b.elements[own], next = pick(SCHOOL_ORDER.slice(0, 6)); b.elements[own] = next; addLog(`镜像疲劳归零，发起元素交易：你的${ELEMENTS[old].name}被换为${ELEMENTS[next].name}。`, "bad"); }
        b.enemyFatigue = 100;
      }
    }
    return { damage, crit, killed: before > 0 && target.hp <= 0, target, roll };
  }
  function doHits(card, full, hits, pct, options = {}) {
    let total = 0, kills = 0, crits = 0;
    for (let i = 0; i < hits && targetLowest(); i += 1) {
      const result = hitEnemy(pct * levelScale(card.id), card.school, options);
      total += result.damage; kills += result.killed ? 1 : 0; crits += result.crit ? 1 : 0;
      if (result.target && full) {
        if (["burn", "meteor"].includes(card.kind) && card.burn) result.target.burn += card.burn + (cardLevel(card.id) >= 3 ? 1 : 0);
        if (card.kind === "thunder" && Math.random() < .4) result.target.thunder += 1;
      }
    }
    return { total, kills, crits };
  }
  function healPlayer(amount) {
    const b = state.battle, before = b.playerHp; b.playerHp = Math.min(b.playerMaxHp, b.playerHp + Math.max(0, Math.round(amount))); return Math.round(b.playerHp - before);
  }
  function applyCard(card, full, paid) {
    const b = state.battle, p = b.player, lv = cardLevel(card.id);
    let text = "", hits = typeof card.hits === "number" ? card.hits : Array.isArray(card.hits) ? randomInt(card.hits[0], card.hits[1]) : 1;
    if (!full && card.echoHits) hits = card.echoHits;
    if (!full && Array.isArray(card.hits)) hits = Math.max(1, card.hits[0] - 1);
    if (full && lv >= 3 && hits > 1) hits += 1;
    if (full && p.nextWind && card.school === "wind" && card.pct) { hits += p.nextWind; p.nextWind = 0; }
    if (card.kind === "generator") {
      const before = countElements()[card.school] || 0, added = addElement(card.school, before ? 1 : 2);
      if (card.school === "fire") p.damageBuff += .15;
      if (card.school === "water") p.waterShield = Math.min(3, p.waterShield + 1);
      if (card.school === "wind") p.nextWind += 1;
      if (card.school === "earth") b.shield += Math.round(defense() * .3 * variance());
      if (card.school === "light") p.light += 1;
      if (card.school === "dark") targetLowest().curse += 1;
      text = `补充 ${added} ${ELEMENTS[card.school].name}`;
    } else if (card.kind === "wind-index") { p.windWeight = 3; p.nextWind += 1; text = "未翻风系书页的抽取权重提高";
    } else if (card.kind === "bookmark") { b.shield += Math.round(defense() * .3); p.bookmark = true; text = "获得护盾并记录下一张残响书页";
    } else if (card.kind === "attune") { p.attuned = mainElement(); text = `本轮未翻书页的固定消耗改写为${ELEMENTS[p.attuned].name}`;
    } else if (card.kind === "refill") {
      const main = mainElement(), target = state.startElements.filter((e) => e === main).length;
      const added = addElement(main, Math.min(3, Math.max(0, target - (countElements()[main] || 0)))); text = added ? `补充 ${added} ${ELEMENTS[main].name}` : `未补充元素，改为强化下张${ELEMENTS[main].name}系牌`;
      if (!added) p.damageBuff += .15;
    } else if (["index", "replay"].includes(card.kind)) {
      const legal = b.drawPile.map((id) => CARD_BY_ID.get(id)).filter((c) => c && paymentFor(c) && !["index", "replay"].includes(c.kind));
      if (legal.length) {
        const max = Math.max(...legal.map((c) => c.cost.amount)); const selected = pick(legal.filter((c) => c.cost.amount === max));
        b.drawPile.splice(b.drawPile.indexOf(selected.id), 1); b.drawPile.unshift(selected.id); text = `已将合法候选《${selected.name}》设为下一页`;
      } else { addElement(mainElement(), 1); text = "无合法候选，增加1主元素"; }
    } else if (card.kind.startsWith("total")) {
      const n = full ? paid.length : 0, A = n * 100 * (1 + n / 5);
      if (card.kind === "total-earth") { const shield = Math.round(defense() * (full ? A / 100 : 1.3) * variance()); b.shield += shield; text = `获得 ${shield} 护盾`; }
      else if (card.kind === "total-light") { p.light += full ? n + 1 : 2; text = `获得 ${full ? n + 1 : 2} 枚圣印`; }
      else if (card.kind === "total-dark") { const target = targetLowest(); target.vulnerable += full ? n + 1 : 2; target.curse = Math.max(target.curse, n); text = `建立 ${full ? n + 1 : 2} 次易伤`; }
      else {
        const pct = full ? Math.max(160, A * (card.school === "hybrid" ? 1.1 : 1)) : (card.echoPct || 150);
        const totalHits = card.kind.includes("wind") || card.id === "HY-14" || card.id === "HY-17" || card.id === "HY-18" ? Math.max(3, n * 2 + 1) : card.kind.includes("water") ? Math.max(2, n + 2) : 1;
        const result = doHits(card, full, totalHits, pct / totalHits);
        if (card.kind.includes("water") || ["HY-13", "HY-14", "HY-18"].includes(card.id)) healPlayer(attack() * .05 * totalHits * variance());
        if (["HY-15", "HY-18"].includes(card.id)) b.shield += Math.round(defense() * Math.max(1, n) * .55 * variance());
        text = `${totalHits}段共造成 ${result.total} 伤害`;
      }
    } else if (card.kind === "hybrid") {
      const result = card.pct ? doHits(card, full, Math.max(1, hits), full ? card.pct : card.echoPct || Math.max(35, card.pct * .55)) : { total: 0 };
      let healed = 0, shield = 0; const target = targetLowest();
      if (["HY-01", "HY-02", "HY-03", "HY-09", "HY-11"].includes(card.id)) healed = healPlayer(attack() * (full ? .06 : .03) * Math.max(1, hits) * variance());
      if (["HY-04", "HY-07", "HY-09", "HY-11"].includes(card.id)) { shield = Math.round(defense() * (full ? 1.7 : .9) * Math.max(1, card.id === "HY-11" ? hits * .2 : 1) * variance()); b.shield += shield; }
      if (full && ["HY-01", "HY-04", "HY-05", "HY-10"].includes(card.id) && target) target.burn += card.id === "HY-10" ? Math.min(3, Math.ceil(hits * .3)) : 2;
      if (full && ["HY-05", "HY-10"].includes(card.id)) p.damageBuff += .18;
      if (full && card.id === "HY-06" && target) target.vulnerable += Math.min(6, hits);
      if (full && card.id === "HY-07") p.light += 2;
      if (full && card.id === "HY-08" && target) { p.light += 3; target.curse += 2; target.vulnerable += 2; }
      text = [result.total ? `造成 ${result.total} 伤害` : "", healed ? `回复 ${healed} 生命` : "", shield ? `获得 ${shield} 护盾` : "", full ? "同时发动各元素的流派特性" : ""].filter(Boolean).join("，");
    } else if (card.shield || card.echoShield || ["earth", "earth-finisher", "thorn", "thorn-finisher"].includes(card.kind)) {
      let shieldPct = full ? card.shield : card.echoShield;
      if (card.kind === "earth-finisher") { shieldPct += p.rock * 45; p.rock = 0; }
      const shield = Math.round(defense() * shieldPct / 100 * variance() * levelScale(card.id)); b.shield += shield;
      if (full) { p.rock += 1; if (card.kind === "thorn") p.thorns += card.stacks || 1; if (card.kind === "thorn-finisher") p.thorns = Math.min(6, 3 + p.thorns); }
      text = `获得 ${shield} 护盾`;
    } else if (["light", "light-finisher", "star", "star-finisher"].includes(card.kind)) {
      if (card.kind.includes("star")) { const amount = full ? card.stacks || Math.min(6, 3 + p.star) : 1; p.star = card.kind === "star-finisher" ? amount : p.star + amount; text = `获得 ${amount} 层星佑`; }
      else { const amount = full ? card.stacks || Math.min(6, 3 + p.light) : 1; p.light = card.kind === "light-finisher" ? amount : p.light + amount; text = `获得 ${amount} 层辉光/圣印`; }
    } else if (["dark", "dark-mark"].includes(card.kind)) {
      const target = targetLowest(); target.curse += full ? card.stacks || 1 : 0; target.vulnerable += card.kind === "dark-mark" ? (full ? 4 : 2) : 1; text = `施加诅咒与易伤`;
    } else {
      if (card.kind === "water-finisher") hits += p.waterShield; if (card.kind === "tide-finisher") { hits += Math.min(6, p.tide); p.tide = 0; }
      if (card.kind === "wind-finisher") { hits += Math.min(3, Math.floor(p.wind / 2)); p.wind = 0; }
      if (card.kind === "thunder-finisher") { hits += Math.min(6, targetLowest()?.thunder || 0); if (targetLowest()) targetLowest().thunder = 0; }
      let pct = full ? card.pct : card.echoPct;
      if (card.kind === "burn-finisher" && full) { const target = targetLowest(), burn = Math.min(target?.burn || 0, randomInt(1, 3)); pct += burn * 30; if (target) target.burn -= burn; }
      if (card.kind === "meteor" && full) { const target = targetLowest(), burn = target?.burn || 0; pct += burn * 35; if (target) target.burn = 0; }
      if (card.kind === "heat-finisher" && full) { pct += Math.min(5, p.heat) * 40; p.heat = 0; }
      if (card.kind === "dark-finisher" && full) { const target = targetLowest(), curses = target?.curse || 0; pct += curses * 35; if (target) target.curse = 0; }
      if (card.kind === "erosion-finisher" && full) { const target = targetLowest(), erosion = target?.erosion || 0; pct += erosion * 40; if (target) target.erosion = 0; }
      const result = doHits(card, full, Math.max(1, hits), pct || (full ? 90 : 45), { sureHit: card.sureHit, crit: card.crit, pierce: card.pierce });
      if (full && card.kind === "heat") p.heat += card.stacks || 1;
      if (full && card.kind === "tide") p.tide += card.stacks || Math.min(2, Math.round(hits * .4));
      if (full && card.kind === "wind") p.wind += Math.min(3, result.crits);
      if (full && card.kind === "erosion") { const erosionTarget = targetLowest(); if (erosionTarget) erosionTarget.erosion += card.stacks || 1; }
      if (card.heal || ["water", "water-finisher", "tide", "tide-finisher"].includes(card.kind)) {
        const healed = healPlayer(attack() * (card.heal || 4) / 100 * Math.max(1, hits) * variance()); text = `${hits}段共造成 ${result.total} 伤害，回复 ${healed} 生命`;
      } else text = `${hits}段共造成 ${result.total} 伤害${result.crits ? `，${result.crits}段暴击` : ""}`;
      if (full && card.kind === "meteor" && result.kills) { addElement("fire", 1); const candidates = b.drawPile.filter((id) => { const c = CARD_BY_ID.get(id); return c?.school === "fire" && c.cost.amount >= 2 && c.pct; }); if (candidates.length) { const next = pick(candidates); b.drawPile.splice(b.drawPile.indexOf(next), 1); b.drawPile.unshift(next); text += `；击杀接续《${CARD_BY_ID.get(next).name}》`; } }
    }
    if (!full && p.bookmark && card.cost.amount > 0 && !["index", "bookmark"].includes(card.kind)) { p.bookmark = card.id; text += `；已被未竟书签记录`; }
    if (full && typeof p.bookmark === "string" && paymentFor(CARD_BY_ID.get(p.bookmark))) { const retry = CARD_BY_ID.get(p.bookmark); p.bookmark = null; b.drawPile.unshift(retry.id); text += `；书签将《${retry.name}》设为下一页`; }
    if (full && lv >= 6 && card.cost.amount && Math.random() < .2 && paid[0]) { addElement(paid[0], 1); text += `；Lv.6质变返还1${ELEMENTS[paid[0]].name}`; }
    return text;
  }
  function playerAction() {
    const b = state.battle, card = drawCard(); b.action += 1; b.currentCard = card;
    const payment = paymentFor(card), full = Boolean(payment); b.castType = full ? "full" : "echo";
    const paid = full ? spend(payment) : [];
    const resultText = applyCard(card, full, paid);
    if (full && card.kind !== "generator") b.player.recent.unshift(card.id); b.player.recent = b.player.recent.slice(0, 2);
    addLog(`翻到《${card.name}》，${full ? `消耗${paid.length ? paid.map((e) => ELEMENTS[e].name).join("·") : "0元素"}完整施法` : "元素不足发动残响，不消耗元素"}：${resultText}。`, full ? "good" : "");
    if (!targetLowest()) endBattle(true); else b.turn = "enemy";
  }
  function enemyAction() {
    const b = state.battle, alive = b.enemies.filter((e) => e.hp > 0); if (!alive.length) { endBattle(true); return; }
    const enemy = alive[b.enemyCursor % alive.length]; b.enemyCursor += 1; b.action += 1;
    if (enemy.burn > 0) { const burnDamage = Math.round(attack() * .12 * enemy.burn * variance()); enemy.hp = Math.max(0, enemy.hp - burnDamage); addLog(`${enemy.name}的 ${enemy.burn} 层灼烧造成 ${burnDamage} 伤害。`, "good"); if (enemy.hp <= 0) { if (!targetLowest()) endBattle(true); else b.turn = "player"; return; } }
    const weakened = 1 - Math.min(.35, enemy.curse * .05 + enemy.erosion * .02);
    const roll = .82 + Math.random() * .38;
    let damage = Math.max(1, Math.round(enemy.atk * roll * weakened * (1000 / (1000 + defense()))));
    const absorbed = Math.min(b.shield, damage); b.shield -= absorbed; damage -= absorbed; b.playerHp = Math.max(0, b.playerHp - damage);
    let counter = 0;
    if (b.player.thorns > 0) { counter = Math.round(defense() * .48 * variance()); enemy.hp = Math.max(0, enemy.hp - counter); b.player.thorns -= 1; }
    if (b.shield > 0) b.player.rock = Math.min(6, b.player.rock + 1);
    addLog(`${enemy.name}发动攻击，护盾吸收 ${Math.round(absorbed)}，造成 ${damage} 伤害${counter ? `；棘甲反击 ${counter}` : ""}。`, damage ? "bad" : "");
    if (b.playerHp <= 0) endBattle(false); else if (!targetLowest()) endBattle(true); else b.turn = "player";
  }
  function battleTick(manual = false) {
    const b = state.battle; if (!b || b.over || (paused && !manual)) return;
    if (b.turn === "player") playerAction(); else enemyAction();
    renderBattle(); if (!b.over && !paused) scheduleBattle();
  }
  function scheduleBattle(delay = 820 / battleSpeed) { clearTimeout(battleTimer); battleTimer = setTimeout(() => battleTick(), delay); }
  function endBattle(won) {
    const b = state.battle; b.over = true; b.won = won; clearTimeout(battleTimer);
    if (b.mode === "pve") state.hp = won ? Math.max(1, b.playerHp) : 1;
    if (won) {
      const exp = Math.round(36 + state.floor * 7 + (state.floor % 10 === 0 ? 80 : 0));
      const points = Math.round(24 + state.floor * 5 + (b.mode === "pvp" ? 55 : 0));
      const levels = gainExp(exp); state.score += points; b.reward = { exp, points, levels };
      addLog(`战斗胜利！获得 ${exp} 经验和 ${points} 积分。`, "good");
    } else addLog("你的生命归零，本次战斗失败。", "bad");
    saveState(); renderBattle();
  }
  function renderBattle() {
    const b = state.battle; if (!b) return;
    $("battleMode").textContent = b.mode === "pve" ? "PVE · 玩家先手 · 怪物不预告" : `PVP 镜像 · 随机先手 · 疲劳 ${b.enemyFatigue}`;
    $("battleTitle").textContent = b.mode === "pve" ? `${state.floor % 10 === 0 ? "首领" : "元素"}试炼` : "镜像法师对决";
    $("battleSpeed").textContent = `速度 ×${battleSpeed}`; $("battlePause").textContent = paused ? "继续" : "暂停"; $("battleStep").hidden = !paused;
    $("playerBattleStats").innerHTML = `<div class="battle-stat"><span>生命</span><div class="mini-bar"><i style="width:${b.playerHp / b.playerMaxHp * 100}%"></i></div><b>${Math.ceil(b.playerHp)}</b></div><div class="battle-stat"><span>护盾</span><div class="mini-bar"><i style="width:${Math.min(100, b.shield / b.playerMaxHp * 100)}%;background:#68a5cc"></i></div><b>${Math.round(b.shield)}</b></div><div class="battle-stat"><span>法攻</span><div></div><b>${attack()}</b></div>`;
    $("battleElements").innerHTML = [...b.elements.map((e) => elementOrb(e)), ...Array.from({ length: Math.max(0, b.poolCap - b.elements.length) }, () => elementOrb(null, true))].join("");
    const labels = { heat: "炽热", tide: "潮印", wind: "风势", light: "辉光", star: "星佑", thorns: "棘甲", rock: "岩层", waterShield: "水疗盾" };
    $("battleStatuses").innerHTML = Object.entries(labels).filter(([k]) => b.player[k] > 0).map(([k, name]) => `<span class="status-pill">${name} ${b.player[k]}</span>`).join("") || '<span class="status-pill">无状态</span>';
    $("turnRune").textContent = b.over ? "战斗结束" : b.turn === "player" ? "魔法书正在翻页" : "敌方行动";
    if (b.currentCard) {
      const card = b.currentCard; $("currentCard").className = `current-card ${card.school} ${b.over ? "" : "casting"}`;
      $("currentCard").innerHTML = `<span class="card-school">${card.id} · ${schoolLabel(card.school)} · 消耗 ${costLabel(card)}</span><h2>${card.name}</h2><p>${b.castType === "full" ? card.full : card.echo}</p><span class="cast-badge ${b.castType === "echo" ? "echo" : ""}">${b.castType === "full" ? "完整施法" : "残响保底"}</span>`;
    } else { $("currentCard").className = "current-card empty"; $("currentCard").innerHTML = '<span class="card-school">WAITING</span><h2>等待翻页</h2><p>每张书页在本轮只会出现一次。</p>'; }
    $("cycleText").textContent = `第 ${b.cycle} 轮 · ${b.drawnInCycle} / ${state.deck.length}`; $("cycleBar").style.width = `${b.drawnInCycle / Math.max(1, state.deck.length) * 100}%`;
    $("enemyGroupTitle").textContent = b.mode === "pve" ? `塔中敌人 · ${b.enemies.filter((e) => e.hp > 0).length}存活` : `镜像玩家 · 疲劳 ${b.enemyFatigue}`;
    const target = targetLowest();
    $("enemyList").innerHTML = b.enemies.map((e) => `<article class="enemy-card ${target?.id === e.id ? "target" : ""}"><header><b>${e.hp > 0 ? e.icon : "☠"} ${e.name}</b><small>${Math.ceil(e.hp)}/${e.maxHp}</small></header><div class="mini-bar"><i style="width:${e.hp / e.maxHp * 100}%"></i></div><p>${e.hp > 0 ? `法攻 ${Math.round(e.atk)} · 法防 ${Math.round(e.def)} · 灼烧 ${e.burn} · 诅咒 ${e.curse}` : "已击败"}</p></article>`).join("");
    $("battleLog").innerHTML = b.logs.map((log) => `<div class="log-entry ${log.tone}"><b>#${log.n}</b><span>${esc(log.message)}</span></div>`).join("");
    $("battleSummary").hidden = !b.over;
    if (b.over) $("battleSummary").innerHTML = b.won ? `<h2>战斗胜利</h2><p>获得 ${b.reward.exp} 经验与 ${b.reward.points} 积分${b.reward.levels ? `，角色提升 ${b.reward.levels} 级` : ""}。</p><button data-battle-finish="win">收取奖励并继续</button>` : `<h2>挑战失败</h2><p>可以立即重新开打，或保留本局外配置重新进入法师塔。</p><button data-battle-retry>重新开打</button><button data-battle-new-run>重开法师塔</button>`;
  }

  function populateFilters() {
    const options = ['<option value="all">全部流派</option>', ...SCHOOL_ORDER.map((s) => `<option value="${s}">${ELEMENTS[s].name}系</option>`)].join("");
    $("schoolFilter").innerHTML = options; $("archiveSchoolFilter").innerHTML = options;
  }
  function showHelp() {
    showModal(`<h2>玩法说明</h2><p>这是一个可完整游玩的系统原型，用于验证探索、元素经济、组卡与自动战斗的衔接。</p><div class="choice-grid"><article class="choice-button"><h3>1 · 探索</h3><p>每层三选一事件。生命值在同一轮法师塔内继承，休息室可回复。</p></article><article class="choice-button"><h3>2 · 组卡</h3><p>战斗魔法书没有页数上限。仓库可自由装订；移回仓库需要装订台事件提供的安全整理次数。</p></article><article class="choice-button"><h3>3 · 战斗</h3><p>书页不放回随机，全部翻完后洗回。元素足够时自动完整施法，否则发动残响且不消耗元素。</p></article></div><p><b>方差规则：</b>每段效果独立投掷 40%–300% 偏态方差；高值少见，但会真实改变战斗结果。</p><p><b>原型暂定：</b>重新进入法师塔时，角色等级、经验、当前生命与层数重置；已学咒语、咒语等级、魔法书编排、积分与商店属性永久保留。</p>`);
  }
  function bindEvents() {
    document.addEventListener("click", (event) => {
      const view = event.target.closest("[data-view]")?.dataset.view; if (view) { showView(view); return; }
      const eventType = event.target.closest("[data-event]")?.dataset.event; if (eventType) { resolveEvent(eventType); return; }
      const bind = event.target.closest("[data-bind]")?.dataset.bind;
      if (bind) { if (!state.deck.includes(bind)) state.deck.push(bind); saveState(); renderGrimoire(); toast(`已将《${CARD_BY_ID.get(bind).name}》装订到战斗魔法书。`); return; }
      const unbind = event.target.closest("[data-unbind]")?.dataset.unbind;
      if (unbind && state.organizeTokens > 0) {
        if (state.deck.length <= 1) { toast("至少需要保留1张战斗书页。"); return; }
        state.deck = state.deck.filter((id) => id !== unbind); state.organizeTokens -= 1; saveState(); renderGrimoire(); toast(`已安全将《${CARD_BY_ID.get(unbind).name}》移入仓库。`); return;
      }
      const buy = event.target.closest("[data-buy]")?.dataset.buy;
      if (buy) {
        const item = SHOP.find((x) => x.id === buy), price = shopCost(item); if (state.score < price) return;
        state.score -= price; item.apply(); state.meta.passiveLevels[buy] = shopLevel(buy) + 1; saveState(); render(); toast(`${item.name}提升至 Lv.${shopLevel(buy)}。`); return;
      }
      if (event.target.closest("[data-battle-finish]")) { const mode = state.battle.mode; completeEvent(mode === "pvp" ? "镜像对决胜利" : "元素试炼完成", mode === "pvp" ? "你击败了镜像玩家，已获得经验与积分。" : "塔中敌人已被清除，生命值将继承到下一层。"); return; }
      if (event.target.closest("[data-battle-retry]")) { const spec = { ...state.battle.spec }; startBattle(state.battle.mode, spec); return; }
      if (event.target.closest("[data-battle-new-run]")) { newTowerRun(); }
    });
    $("continueButton").addEventListener("click", continueExplore);
    $("newRunButton").addEventListener("click", () => showModal('<h2>重新进入法师塔？</h2><p>当前层数、塔内等级、经验和生命会重置；已学咒语、魔法书、积分与商店成长保留。</p><button class="primary" id="confirmNewRun">确认重开</button>'));
    $("modalContent").addEventListener("click", (event) => { if (event.target.id === "confirmNewRun") newTowerRun(); });
    $("modalClose").addEventListener("click", closeModal); $("modal").addEventListener("click", (event) => { if (event.target === $("modal")) closeModal(); });
    $("helpButton").addEventListener("click", showHelp);
    ["cardSearch", "schoolFilter", "costFilter"].forEach((id) => $(id).addEventListener(id === "cardSearch" ? "input" : "change", renderGrimoire));
    ["archiveSearch", "archiveSchoolFilter"].forEach((id) => $(id).addEventListener(id === "archiveSearch" ? "input" : "change", renderArchive));
    $("battleSpeed").addEventListener("click", () => { battleSpeed = battleSpeed === 1 ? 2 : battleSpeed === 2 ? 4 : 1; renderBattle(); if (!paused) scheduleBattle(100); });
    $("battlePause").addEventListener("click", () => { paused = !paused; clearTimeout(battleTimer); renderBattle(); if (!paused) scheduleBattle(200); });
    $("battleStep").addEventListener("click", () => battleTick(true));
    $("battleRestart").addEventListener("click", () => { if (!state.battle) return; const spec = { ...state.battle.spec }; startBattle(state.battle.mode, spec); });
    window.addEventListener("message", (event) => {
      const message = event.data; if (!message || typeof message !== "object") return;
      if (["merlin:load", "merlin:load-remote"].includes(message.type) && message.state) { if (!hydrate(message.state)) { state = freshState(message.state); generateEvents(); } currentView = state.battle && !state.battle.over ? "battle" : "explore"; render(); if (currentView === "battle") scheduleBattle(500); }
      if (message.type === "merlin:new") { state = freshState(); generateEvents(); currentView = "explore"; render(); saveState(); }
    });
  }
  function init() {
    populateFilters();
    if (!loadLocal()) { state = freshState(); generateEvents(); }
    if (state.battle && !state.battle.over) currentView = "battle";
    bindEvents(); showView(currentView); saveState();
    if (currentView === "battle") scheduleBattle(500);
    if (window.parent !== window) window.parent.postMessage({ type: "merlin:ready" }, "*");
  }
  init();
})();
