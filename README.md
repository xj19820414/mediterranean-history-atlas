# 地中海国家演变 · Mediterranean Atlas

一个可离线打开的历史时间轴网页原型，用于整理公元前 1000 年至公元 1453 年间地中海周边地区的国家、王朝、君主、代表人物与关键事件。

## 当前功能

- 横向可滚动年代轴与年份滑杆：公元前 1000 年至公元 1453 年
- 公元前 / 公元跳转输入，自动跳过历史上的“公元 0 年”
- 播放 / 暂停历史推进
- 以 50 年为步长前后跳转
- 随年份切换阶段注记、活跃势力数量与事件卡片
- Natural Earth 离线海岸线底图与可点击地区定位
- 当前地区的王朝、阶段范围、已录入统治者 / 执政者、同时代代表人物与参考条目
- 响应式布局，可在手机宽度下使用

## 本地运行

直接双击 `index.html` 即可打开。项目不依赖构建工具，后续可以逐步替换为更完整的史料数据、真实边界 GeoJSON 或地图组件。

## 数据说明

当前 `history.js` 内是用于验证交互的初始样例数据；`land.js` 是由 Natural Earth 海岸线 GeoJSON 转换出的离线底图。历史研究版建议后续增加：

1. 国家 / 王朝的起止时间与别名
2. 君主任期与继承关系
3. 事件的史料来源、地理坐标和不确定性标注
4. 真实地图边界与多语种检索

## 研究参考

实现结构参考过：

- [NUKnightLab/TimelineJS3](https://github.com/NUKnightLab/TimelineJS3)：叙事式时间轴交互
- [visjs/vis-timeline](https://github.com/visjs/vis-timeline)：可缩放、可滚动时间轴
- [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)：历史地图数据组织方式

本项目没有复制这些项目的代码；当前实现保持原生 HTML / CSS / JavaScript，便于本地离线维护。Natural Earth 底图数据仅作为现代地理海岸线示意，不代表历史疆界。
