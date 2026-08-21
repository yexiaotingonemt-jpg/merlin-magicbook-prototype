import { C, all, any, fixed, random, same } from "./core.js?v=17";
import { state } from "./store.js?v=17";

export const BASE_PAGE_IDS = Array.from({ length: 10 }, (_, index) => `BA-${String(index + 1).padStart(2, "0")}`);
export const BASE_PAGES = BASE_PAGE_IDS.map((id) => C(
  id,
  "基础咒术页",
  "arcane",
  any(1),
  "30%伤害，不消耗元素",
  "60%伤害",
  "基础咒术·保底输出",
  { pct: 60, echoPct: 30, kind: "foundation", basePage: true },
));

export const CARDS = [
  C("FI-01", "余烬召来", "fire", same("fire", 0), "无残响", "缺火时增加2火，否则增加1火并强化下一张火系攻击", "元素呼应·生成", { kind: "generator" }),
  C("FI-02", "火球术", "fire", same("fire", 1), "45%伤害", "70%伤害，施加2层灼烧", "灼烧·铺垫", { pct: 70, echoPct: 45, kind: "burn", burn: 2 }),
  C("FI-03", "炎爆术", "fire", same("fire", 2), "120%伤害", "210%伤害，消耗1–3层灼烧追加伤害", "灼烧·消耗", { pct: 210, echoPct: 120, kind: "burn-finisher" }),
  C("FI-04", "焚天陨星", "fire", same("fire", 3), "170%伤害", "300%伤害，清除灼烧并追加伤害；单目标半血以下时提高20%；多目标击杀时增加1火并控制下页", "灼烧终结·单体处决·击杀接续", { pct: 300, echoPct: 170, kind: "meteor", loneThreshold: .5, loneBonus: .2 }),
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
  C("WI-03", "千刃风暴", "wind", same("wind", 2), "3段35%伤害", "4–7段35%伤害；单目标每次命中使后续段伤害提高10%，击杀后改选目标", "风势·多段·单体递增", { pct: 35, echoPct: 35, hits: [4, 7], kind: "wind", loneRamp: .1 }),
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

const LARGE_GENERATORS = [
  C("FI-09", "熔炉喷发", "fire", same("fire", 0), "无残响", "增加3火；只参与正常随机翻页", "大型生成·随机时点", { kind: "generator-large", generatorAmount: 3 }),
  C("WA-09", "深潮涌泉", "water", same("water", 0), "无残响", "增加3水；只参与正常随机翻页", "大型生成·随机时点", { kind: "generator-large", generatorAmount: 3 }),
  C("WI-11", "飓风裂隙", "wind", same("wind", 0), "无残响", "增加3风；只参与正常随机翻页", "大型生成·随机时点", { kind: "generator-large", generatorAmount: 3 }),
  C("EA-09", "地脉隆起", "earth", same("earth", 0), "无残响", "增加3土；只参与正常随机翻页", "大型生成·随机时点", { kind: "generator-large", generatorAmount: 3 }),
  C("LI-09", "晨星降临", "light", same("light", 0), "无残响", "增加3光；只参与正常随机翻页", "大型生成·随机时点", { kind: "generator-large", generatorAmount: 3 }),
  C("DA-09", "暗潮裂口", "dark", same("dark", 0), "无残响", "增加3暗；只参与正常随机翻页", "大型生成·随机时点", { kind: "generator-large", generatorAmount: 3 }),
];
CARDS.push(...LARGE_GENERATORS);

const HYBRIDS = [
  ["HY-01", "蒸汽爆裂", { fire: 1, water: 1 }, 160, "灼烧＋固定回复"], ["HY-02", "冰风暴", { water: 1, wind: 1 }, 38, "3–5段攻击，每段回复", [3, 5]],
  ["HY-03", "雷暴术", { water: 1, wind: 2 }, 48, "5–8段攻击，每段回复", [5, 8]], ["HY-04", "熔岩护甲", { fire: 1, earth: 1 }, 0, "护盾、反射并施加灼烧"],
  ["HY-05", "圣焰术", { fire: 1, light: 1 }, 190, "高伤、灼烧与后续增幅"], ["HY-06", "暗影疾风", { wind: 1, dark: 1 }, 36, "4–6段攻击并叠加易伤", [4, 6]],
  ["HY-07", "光辉壁垒", { earth: 1, light: 1 }, 0, "护盾与辉光"], ["HY-08", "日蚀仪式", { light: 1, dark: 1 }, 0, "强化己方并削弱敌人"],
  ["HY-09", "珊瑚壁垒", { water: 1, earth: 1 }, 0, "护盾、次数治疗与过量转盾"], ["HY-10", "辉焰风暴", { fire: 1, wind: 1, light: 1 }, 45, "4–7段、灼烧与后续增幅", [4, 7]],
  ["HY-11", "翠潮天幕", { water: 1, wind: 1, earth: 1 }, 40, "4–6段，每段治疗并获得护盾", [4, 6]], ["HY-12", "元素湮灭", null, 0, "消耗全部元素，多系提高总伤害"]
];
HYBRIDS.forEach(([id, name, parts, pct, fullText, hits]) => CARDS.push(C(id, name, "hybrid", parts ? fixed(parts) : all(null, 3), "保底效果，不消耗元素", id === "HY-12" ? "消耗全部元素；单目标聚焦提高15%，多目标击杀转移溢出伤害" : fullText, "复合元素·特性融合", { pct, echoPct: pct ? Math.round(pct * .55) : 0, hits, kind: id === "HY-12" ? "total-all" : "hybrid", loneBonus: id === "HY-12" ? .15 : 0 })));

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
  C("CO-11", "魔力归源", "arcane", any(1), "强化下张主元素牌", "将主元素补充至初始配置数量，最多增加2个", "元素经济·条件补充", { kind: "refill" }),
  C("CO-12", "元素同调", "arcane", any(1), "改写下张未翻牌的固定元素", "本轮所有未翻牌的消耗与获取改写为主元素", "元素经济·同调", { kind: "attune" }),
  C("CO-14", "混沌冲击", "arcane", random(2), "140%伤害", "260%伤害，触发两个被消耗元素的余韵", "随机双耗·单段", { pct: 260, echoPct: 140, kind: "basic" }),
  C("CO-15", "双星魔弹", "arcane", random(2), "2段70%伤害", "2段130%伤害，分别继承两种元素", "随机双耗·双段", { pct: 130, echoPct: 70, hits: 2, kind: "basic" }),
  C("CO-16", "元素散射", "arcane", random(2), "4段35%伤害", "4段65%伤害；单目标每次命中使后续段伤害提高15%，击杀后重新选目标", "随机双耗·多段·单体递增", { pct: 65, echoPct: 35, hits: 4, kind: "basic", loneRamp: .15 }),
  C("CO-17", "延时坍缩", "arcane", random(2), "140%伤害", "200%即时＋60%延时；单目标延时部分提高至90%，目标死亡则转移", "随机双耗·延时·单体聚焦", { pct: 260, lonePct: 290, echoPct: 140, kind: "basic" }),
  C("CO-18", "魔法飞弹", "arcane", any(1), "60%伤害", "110%伤害，无法被闪避", "基础攻击·可靠命中", { pct: 110, echoPct: 60, kind: "basic", sureHit: true }),
  C("CO-19", "奥术冲击", "arcane", any(2), "140%伤害", "250%伤害，暴击率提高15个百分点", "基础攻击·爆发", { pct: 250, echoPct: 140, kind: "basic", crit: .15 }),
  C("CO-20", "星界陨落", "arcane", any(3), "240%伤害", "440%伤害；单目标半血以下时提高20%，多目标击杀时转移部分溢出伤害", "基础攻击·重击·单体处决", { pct: 440, echoPct: 240, kind: "basic", loneThreshold: .5, loneBonus: .2 }),
  C("CO-21", "裂变魔弹", "arcane", any(2), "2段70%伤害", "2段125%伤害；单目标首段命中后第二段提高20%，击杀后改选目标", "基础攻击·双段·单体递增", { pct: 125, echoPct: 70, hits: 2, kind: "basic", loneRamp: .2 }),
  C("CO-22", "穿透射线", "arcane", any(2), "125%伤害", "220%伤害，忽略目标25%法术防御", "基础攻击·穿透", { pct: 220, echoPct: 125, kind: "basic", pierce: .25 }),
  C("CO-23", "奥术齐射", "arcane", any(3), "4段60%伤害", "6段75%伤害；单目标每次命中使后续段伤害提高8%，击杀后重新选目标", "基础攻击·多段·单体递增", { pct: 75, echoPct: 60, hits: 6, echoHits: 4, kind: "basic", loneRamp: .08 })
];
CARDS.push(...COMMONS);
export const CARD_BY_ID = new Map([...CARDS, ...BASE_PAGES].map((card) => [card.id, card]));
export const PASSIVES = [
  { id: "PA-01", name: "奥术理解", copy: "本轮角色经验获取提高2%。", apply: () => { state.meta.expPct += 2; } },
  { id: "PA-02", name: "生命铭文", copy: "本轮最大生命提高1%。", apply: () => { state.meta.hpPct += 1; state.hp += Math.max(1, Math.round(state.hp * .01)); } },
  { id: "PA-03", name: "攻势铭文", copy: "本轮法术攻击提高1%。", apply: () => { state.meta.attackPct += 1; } },
  { id: "PA-04", name: "守御铭文", copy: "本轮法术防御提高1%。", apply: () => { state.meta.defensePct += 1; } },
  { id: "PA-05", name: "精准星图", copy: "本轮命中增加1点。", apply: () => { state.meta.hit += 1; } },
  { id: "PA-06", name: "幻影步法", copy: "本轮闪避增加1点。", apply: () => { state.meta.dodge += 1; } },
  { id: "PA-07", name: "灾星观测", copy: "本轮暴击增加1点。", apply: () => { state.meta.crit += 1; } },
  { id: "PA-08", name: "镇定心智", copy: "本轮抗暴增加1点。", apply: () => { state.meta.resist += 1; } }
];

export const STARTER_CARD_POOLS = {
  fire: ["FI-01", "FI-02", "FI-03"],
  water: ["WA-01", "WA-02", "WA-03"],
  wind: ["WI-01", "WI-02", "WI-03"],
};

function shuffledWith(items, randomValue) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomValue() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createStarterLoadout(randomValue = Math.random) {
  const [doubleSchool, singleSchool] = shuffledWith(Object.keys(STARTER_CARD_POOLS), randomValue).slice(0, 2);
  const starterPages = [
    ...shuffledWith(STARTER_CARD_POOLS[doubleSchool], randomValue).slice(0, 2),
    shuffledWith(STARTER_CARD_POOLS[singleSchool], randomValue)[0],
  ];
  const deck = [...BASE_PAGE_IDS];
  const replacementSlots = shuffledWith(deck.map((_, index) => index), randomValue).slice(0, starterPages.length);
  starterPages.forEach((id, index) => { deck[replacementSlots[index]] = id; });
  return {
    deck,
    starterPages,
    startElements: [doubleSchool, singleSchool],
  };
}
