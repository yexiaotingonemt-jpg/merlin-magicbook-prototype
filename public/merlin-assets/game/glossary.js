const TERMS = {
  "完整施法": { category: "施法规则", tone: "arcane", copy: "翻到书页时，若元素池满足该页条件，系统会自动支付元素并发动完整效果。" },
  "残响": { category: "施法规则", tone: "arcane", copy: "翻到书页但元素不足时发动的保底效果；通常不会消耗元素，收益低于完整施法。" },
  "任意富余元素": { category: "元素规则", tone: "arcane", copy: "支付后不会妨碍本轮尚未翻出元素书页固定需求的任意元素，基础咒术页只会使用这类元素。" },
  "完全消耗": { category: "元素规则", tone: "arcane", copy: "达到最低施法门槛后，继续消耗卡面允许范围内的全部剩余元素，并根据实际消耗量放大效果。" },
  "主元素": { category: "元素规则", tone: "arcane", copy: "起始元素配置中数量最多的元素；数量相同时由配置顺序决定。" },
  "控页": { category: "翻页规则", tone: "arcane", copy: "改变后续书页的抽取权重、顺序或指定结果，用来降低不放回随机翻页的不确定性。" },
  "检索": { category: "翻页规则", tone: "arcane", copy: "从符合条件的未翻书页中寻找目标，并按卡牌规则提高其出现率或直接发动。" },
  "追读": { category: "翻页规则", tone: "arcane", copy: "当前书页结算后，额外指定或随机发动另一张满足条件的书页。" },
  "重演": { category: "翻页规则", tone: "arcane", copy: "让已经发动过的书页再次进入指定的后续翻页位置或再次结算。" },
  "元素呼应": { category: "卡牌定位", tone: "arcane", copy: "当对应元素为空时优先翻出，并补充更多该元素；平时仍参与正常随机翻页。" },
  "单系归流": { category: "卡牌定位", tone: "arcane", copy: "围绕单一元素的完全消耗终结牌，将该系剩余元素集中转化为一次高效率效果。" },
  "多段": { category: "卡牌定位", tone: "combat", copy: "一次施法包含多个独立攻击段，每段分别结算命中、暴击与击杀后的目标更换。" },
  "单体递增": { category: "卡牌定位", tone: "combat", copy: "攻击同一个目标时，后续攻击段逐步提高伤害；目标被击杀并更换后重新累计。" },
  "单体处决": { category: "卡牌定位", tone: "combat", copy: "面对单个敌人或满足低生命条件时获得额外伤害，强调集中击杀。" },
  "击杀接续": { category: "卡牌定位", tone: "combat", copy: "击杀当前目标后继续选择新的存活目标，并触发卡牌注明的额外收益。" },
  "建立": { category: "流派阶段", tone: "arcane", copy: "用于启动流派循环，生成该流派后续书页需要的状态或资源。" },
  "积层": { category: "流派阶段", tone: "arcane", copy: "继续增加流派状态层数，为终结牌积累更高收益。" },
  "终结": { category: "流派阶段", tone: "arcane", copy: "消耗或转化已经积累的流派状态，形成一次阶段性高收益。" },
  "熔核": { category: "火系流派", tone: "fire", copy: "通过建立和积累炽热，提高暴击并为火系终结牌准备爆发。" },
  "回潮": { category: "水系流派", tone: "water", copy: "通过多次攻击与治疗积累潮印，再由终结牌追加攻击和治疗次数。" },
  "雷鸣": { category: "风系流派", tone: "wind", copy: "通过多段攻击积累雷印，再由终结牌消耗雷印追加雷击。" },
  "荆棘": { category: "土系流派", tone: "earth", copy: "通过护盾与棘甲承受攻击并反击，将防御转化为输出。" },
  "影蚀": { category: "暗系流派", tone: "dark", copy: "施加蚀痕降低敌方法术防御，并通过终结牌消耗蚀痕追加伤害或窃取属性。" },
  "直接伤害": { category: "战斗规则", tone: "combat", copy: "由攻击段立即造成的伤害；区别于灼烧、反击等延后或附加结算。" },
  "多段攻击": { category: "战斗规则", tone: "combat", copy: "一次施法产生多次独立攻击。每段分别检查命中、暴击和目标存活，击杀后可自动更换目标。" },
  "暴击率": { category: "战斗属性", tone: "combat", copy: "由攻击方暴击与防守方抗暴共同决定，最终暴击概率限制在0%至75%。" },
  "暴击": { category: "战斗属性", tone: "combat", copy: "攻击触发暴击时，默认造成200%的伤害；部分流派还会在暴击后获得额外状态。" },
  "命中": { category: "战斗属性", tone: "combat", copy: "用于抵消目标的闪避属性；命中越高，攻击被闪避的概率越低。" },
  "闪避": { category: "战斗属性", tone: "combat", copy: "闪避率由防守方闪避减去攻击方命中决定，最终限制在0%至80%。" },
  "水疗盾": { category: "水系机制", tone: "water", copy: "水系的续航层数。水系终结牌会依据层数追加攻击段数与按次数计算的治疗。" },
  "潮印": { category: "水系机制", tone: "water", copy: "回潮流派的积累状态；终结牌会消耗潮印，追加攻击与治疗次数。" },
  "灼烧": { category: "火系机制", tone: "fire", copy: "附着在敌人身上的持续伤害状态，在敌方行动前结算，也可被火系终结牌消耗以追加爆发。" },
  "炽热": { category: "火系机制", tone: "fire", copy: "熔核流派的积累状态。每层提高直接攻击的暴击率，终结牌会消耗它追加伤害。" },
  "风势": { category: "风系机制", tone: "wind", copy: "风系攻击暴击时积累；风势终结牌每消耗2层追加1段攻击，最多追加3段。" },
  "雷印": { category: "风系机制", tone: "wind", copy: "雷鸣流派施加在敌人身上的印记；终结牌会消耗雷印并追加雷击。" },
  "护盾": { category: "土系机制", tone: "earth", copy: "优先于生命承受伤害的临时耐久值；部分怪物和卡牌会针对护盾产生额外效果。" },
  "岩层": { category: "土系机制", tone: "earth", copy: "护盾承受攻击后积累；大地终结牌会消耗岩层，追加护盾或反击。" },
  "棘甲": { category: "土系机制", tone: "earth", copy: "受到敌方直接攻击后消耗1层，并按照自身法术防御造成反击伤害。" },
  "辉光": { category: "光系机制", tone: "light", copy: "下一次造成直接伤害时消耗层数，每层都会提高该次伤害。" },
  "圣印": { category: "光系机制", tone: "light", copy: "由光系终结牌转化而来的后续强化次数，用于延长光系增益链。" },
  "星佑": { category: "光系机制", tone: "light", copy: "下一次造成直接伤害时消耗1层，并随机提供一档伤害增幅。" },
  "诅咒": { category: "暗系机制", tone: "dark", copy: "降低敌人的攻击输出，并可被暗系终结牌消耗以追加效果。" },
  "易伤": { category: "暗系机制", tone: "dark", copy: "使目标后续受到的直接伤害提高；每次受到直接伤害后会减少层数。" },
  "蚀痕": { category: "暗系机制", tone: "dark", copy: "降低目标的有效法术防御，并可被影蚀终结牌消耗。" },
  "辉蚀": { category: "怪物机制", tone: "dark", copy: "逆辉镜面根据玩家获得的强化积累；每层都会降低该敌人受到的直接伤害。" },
};

export const SPELL_GLOSSARY = Object.freeze(TERMS);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TERM_MATCHER = new RegExp(`(${Object.keys(SPELL_GLOSSARY).sort((a, b) => b.length - a.length).map(escapePattern).join("|")})`, "g");

export function glossaryEntry(term) {
  return SPELL_GLOSSARY[term] || null;
}

export function glossaryTextHtml(text) {
  return String(text ?? "").split(TERM_MATCHER).map((part) => {
    const entry = glossaryEntry(part);
    if (!entry) return escapeHtml(part);
    return `<button type="button" class="spell-term ${entry.tone}" data-spell-term="${escapeHtml(part)}" title="点击查看「${escapeHtml(part)}」说明">${escapeHtml(part)}</button>`;
  }).join("");
}

export function glossaryDetailHtml(term) {
  const entry = glossaryEntry(term);
  if (!entry) return "";
  return `<section class="spell-term-detail ${entry.tone}"><header><small>MERLIN'S GLOSSARY · ${escapeHtml(entry.category)}</small><h2>${escapeHtml(term)}</h2></header><p>${escapeHtml(entry.copy)}</p><footer>该说明用于解释卡牌关键词，不会暂停或改变当前战斗结算。</footer></section>`;
}
