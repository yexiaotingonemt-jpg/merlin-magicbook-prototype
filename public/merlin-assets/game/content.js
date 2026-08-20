export const EVENTS = {
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

export const CHAPTER_RULES = {
  1: { count: 15, weights: { monster: 240, experience: 160, element: 160, library: 180, rest: 80, transmute: 50, upgrade: 60, organize: 30, player: 40 } },
  2: { count: 20, weights: { monster: 300, experience: 120, element: 120, library: 160, rest: 90, transmute: 60, upgrade: 70, organize: 40, player: 40 } },
  3: { boss: "星辉魔像", final: false },
  4: { count: 30, weights: { monster: 360, experience: 80, element: 80, library: 130, rest: 100, transmute: 70, upgrade: 80, organize: 50, player: 50 } },
  5: { count: 10, weights: { monster: 450, experience: 0, element: 61, library: 0, rest: 184, transmute: 73, upgrade: 98, organize: 61, player: 73 } },
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
