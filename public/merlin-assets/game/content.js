export const EVENTS = {
  experience: { name: "魔法课堂", icon: "✥", copy: "获得角色经验，提升本次探索的基础属性。" },
  element: { name: "元素池", icon: "◈", copy: "增加或替换一个起始元素。" },
  library: { name: "残破书库", icon: "📖", copy: "从三张随机咒语中选择一张，再决定替换书页、升级现有咒语或收入仓库。" },
  monster: { name: "元素试炼", icon: "⚔", copy: "挑战塔中怪物，获得经验与积分。" },
  rest: { name: "休息室", icon: "☽", copy: "回复生命值；生命会在探索中继承。" },
  transmute: { name: "沸腾实验室", icon: "⚗", copy: "将选定的已学单系咒语，随机替换为当前起始元素中与目标不同系、同消耗的单系咒语，并保留等级和装订位置。" },
  upgrade: { name: "幽灵导师", icon: "♕", copy: "直接提升一张战斗书页的等级。" },
  organize: { name: "装订台", icon: "☷", copy: "获得一次安全拆页机会，保留咒语等级。" },
  player: { name: "镜像法师", icon: "⚜", copy: "与玩家快照进行异步战斗，双方满血且随机先手。" }
};

export const CHAPTER_RULES = {
  0: { fixedEvents: ["element", "library", "monster"] },
  1: { count: 15, weights: { monster: 262, experience: 175, element: 80, library: 197, rest: 88, transmute: 55, upgrade: 66, organize: 33, player: 44 } },
  2: { count: 20, weights: { monster: 318, experience: 127, element: 70, library: 169, rest: 95, transmute: 63, upgrade: 74, organize: 42, player: 42 } },
  3: { boss: "星辉魔像", final: false },
  4: { count: 30, weights: { monster: 377, experience: 83, element: 40, library: 136, rest: 104, transmute: 73, upgrade: 83, organize: 52, player: 52 } },
  5: { count: 10, weights: { monster: 450, experience: 0, element: 20, library: 0, rest: 200, transmute: 79, upgrade: 106, organize: 66, player: 79 } },
  6: { boss: "六相元素龙", final: true },
};

export const EVENT_COUNTDOWNS = {
  experience: null, element: 4, library: 2, monster: 2, rest: null,
  transmute: 3, upgrade: null, organize: 4, player: 2,
};

export function weightedEventType(weights, randomValue = Math.random) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomValue() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll < 0) return type;
  }
  return entries.at(-1)?.[0] || "monster";
}
