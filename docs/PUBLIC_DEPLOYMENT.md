# 公网体验版与操作演示

2026-10-03，veFaaS Application `manxu-workbench-public`，应用 ID `0a2e8bd3ffb2`。发布状态 `deploy_success`，首页及 `/tour.html` 匿名 HTTPS 请求返回 200。

[工作台](https://s6fc4hec1r2qhhkrj949b.apigateway-cn-beijing.volceapi.com/) · [操作演示](https://s6fc4hec1r2qhhkrj949b.apigateway-cn-beijing.volceapi.com/tour.html)

## 两种运行方式

| 能力 | 公网体验版 | 完整本机版 |
|---|---|---|
| 研究、评测、问题、人工复测记录 | 当前浏览器保存 | SQLite 保存 |
| 分镜与连续性编辑、关联内容变化提醒 | 支持 | 支持 |
| 版本、Markdown、JSON 导出 | 浏览器生成附件 | HTTP 附件 |
| 模型调用、图片上传、配音与合成 | 不开放，明确提示 | 配置服务后使用；联调边界见验证记录 |
| 示例视频 | 预制本机真实合成影片 | 可生成新成片 |
| 多用户云同步、登录权限 | 未实现 | 未实现 |

每位访问者在自己的浏览器拥有独立档案。清除浏览器数据会丢失，请导出备份；导出不意味着已有重新导入功能。教学示例不参与真实业务指标与成本计算。积分、Tokens 与现金费用分别记录，没有账单不填现金金额。

## 可复现构建与更新

```sh
npm ci
npm run build:public
cd .public-build/out
vefaas inspect
vefaas deploy --appId 0a2e8bd3ffb2 --yes
vefaas domains
```

需要部署账号授权。构建脚本仅复制源码与公开素材，去掉服务器 API 与动态项目路由；不复制 `.env.local`、SQLite 或 `data/`。浏览器请求适配到 localStorage，支持记录版本冲突、原始历史和来源保留。静态输出由 Caddy 服务。

资源配置为 0.5 vCPU / 1 GiB，最小实例 0、最大实例 1；首次发布后再设置实例限制，平台不支持在未部署函数上修改限制。这控制资源规模，不代表免费或已核验账单；实际费用以云平台账单为准。后续构建会重新生成输出，使用明确应用 ID 更新同一应用。

## 操作演示

`public/tour.html` 使用六张实际体验页面截图，每步自动播放停留 6 秒，支持暂停、前后切换、步骤点选和左右方向键，提供回到相应工作区的链接。没有模拟自动 Agent 执行。截图展示教学记录、未知评测值和未检查的人审项。

浏览器本机预览已核验导航、记录保存后刷新恢复、定位 5.67 秒到第 2 镜、动画前后切换与自动播放。公网发布与匿名 HTTP 访问核验通过；本轮内置浏览器打开该云域名两次超时，不能据此宣称公网浏览器端完整验收。39 项核心测试、lint、完整本机构建及公网静态构建通过。
