# 梅林的魔法书 · 法师塔

根据当前策划文档实现的可玩系统原型，包含：

- 六章法师塔、有限事件池、三展示位、倒计时与 9 类事件
- 起始元素编排、元素容量与角色等级成长
- 战斗魔法书、仓库、安全拆页、91 张战斗咒语与 8 张被动卡
- 不放回随机翻页、完整施法/残响、40%–300% 偏态方差和流派 Combo
- 新攻防/闪避/暴击公式、PVE 自动战斗、异步镜像 PVP、战斗重开与场外积分商店
- 账号续玩、云端存档与排行榜

在线试玩：<https://yexiaotingonemt-jpg.github.io/merlin-magicbook-prototype/>

`main` 分支更新后，GitHub Pages 会自动发布可独立游玩的版本。Cloudflare Pages 版本额外提供账号云存档与 D1 排行榜。

工程模块划分、依赖方向和常见迭代入口见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

当前唯一实施口径、文档优先级与已知未决项见 [docs/DESIGN_BASELINE.md](./docs/DESIGN_BASELINE.md)。
