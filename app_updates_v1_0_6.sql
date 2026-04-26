-- Version v1.0.6 Update Log
INSERT INTO app_updates (version, title, content) 
VALUES ('v1.0.6', '运营日志 UI 重构与同步增强', '1. 确认并优化了数据清洗逻辑，支持同一天数据多次上传自动更新。
2. 彻底重构了“运营操作日志”页面，采用全新的 V2 玻璃拟态设计风格。
3. 实现了数据闭环：在“运营操作日志”中记录的动作，现在会自动同步到“SKU 管理”对应 SKU 的下拉详情中，方便回溯运营效果。
4. 修复了部分组件的 TypeScript 类型定义错误。');
