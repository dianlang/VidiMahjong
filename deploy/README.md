# Ubuntu 部署模板

使用 Ubuntu 24.04 LTS x86_64、Node.js 24 LTS、Nginx 和 systemd。代码／素材目录为 `/opt/queye/releases/<版本>`，`/opt/queye/current` 指向当前版本，Node 官方发行版在 `/opt/queye/node`。

在部署版本的 `traditional.html` 的 `</head>` 前插入 `<meta name="queye-server-path" content="/ws">`，让现有 friend-entry 自动选择同源 WS／WSS；不写死服务器 IP。部署前验证本机发布包散列，上传后再次核对。服务器依赖使用 `server/package-lock.json` 执行 `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`，不更新版本。

`queye.service` 用独立用户运行房间服务，只监听 127.0.0.1:8080。`nginx-queye.conf` 提供静态游戏和 /ws；只允许游戏资源路径，不开放服务器源码、Git、patch、工具或素材管理接口。原默认站点先备份后再停用。

安装后执行 `nginx -t`、`systemd-analyze verify /etc/systemd/system/queye.service`，检查服务开机启用；从外部验证网页、WS 双客户端建房／入房、出牌同步、结算确认、点数总和及暗牌过滤。音频须返回正确 MIME 并支持 Range。

HTTP/IP 入口用于部署连通测试；大陆节点对外提供网站服务仍须满足备案要求，IP 不是免备案方案。有可用域名后再配置域名、HTTPS 和 WSS。每次重启房间服务会清空内存房间；更新前应确认当前房间可以结束，保留旧 release 以便回滚。
