# 监控与告警

本文档提供 XT-Music 项目的监控与告警配置方案。

## 健康检查

### 后端健康检查

后端提供健康检查接口：

```http
GET /api/health
```

响应：
```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

### 使用 curl 测试

```bash
# 本地测试
curl -s http://localhost:3000/api/health | jq

# 远程测试
curl -s https://api.your-domain.com/api/health | jq
```

### Docker 健康检查

已在 Docker Compose 中配置：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

查看健康状态：

```bash
docker-compose ps
```

## 系统监控

### 基础监控工具

```bash
# CPU 使用率
top
htop

# 内存使用
free -h

# 磁盘使用
df -h
du -sh music-server/data/ music-server/uploads/

# 网络连接
netstat -tlnp
ss -tlnp

# 进程状态
ps aux | grep node
```

### 使用 Prometheus + Grafana（推荐）

#### 1. 安装 Node Exporter

```bash
# 下载 Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-*.tar.gz
cd node_exporter-*
./node_exporter &
```

#### 2. 配置 Prometheus

`prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'xingtone-api'
    metrics_path: '/api/health'
    static_configs:
      - targets: ['localhost:3000']
```

#### 3. 启动 Prometheus + Grafana

使用 Docker Compose：

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your_password
```

#### 4. 导入仪表盘

Grafana 推荐导入的 Dashboard ID：
- **Node Exporter Full**: 1860
- **Prometheus 2.0 Stats**: 3662

### 使用宝塔面板监控

宝塔面板自带监控功能：

1. 面板设置 → 监控 → 开启系统监控
2. 设置保留天数（建议 30 天）
3. 监控项：
   - CPU 使用率
   - 内存使用率
   - 磁盘使用率
   - 网络流量
   - 负载均衡

## 日志管理

### 后端日志

后端使用 NestJS Logger 输出日志：

```bash
# 查看 PM2 日志
pm2 logs xingtone-server
pm2 logs xingtone-server --lines 100
pm2 logs xingtone-server --err

# 查看 systemd 日志
journalctl -u xingtone-server -f
journalctl -u xingtone-server --since "2024-01-01" --until "2024-01-02"
```

### Nginx 日志

```bash
# 访问日志
tail -f /var/log/nginx/xingtone-access.log

# 错误日志
tail -f /var/log/nginx/xingtone-error.log

# 统计 TOP 访问 IP
awk '{print $1}' /var/log/nginx/xingtone-access.log | sort | uniq -c | sort -rn | head -10

# 统计 404 页面
grep " 404 " /var/log/nginx/xingtone-access.log | tail -20
```

### 日志轮转

使用 logrotate 防止日志文件过大：

创建 `/etc/logrotate.d/xingtone`：

```
/var/log/nginx/xingtone-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}

/home/deploy/.pm2/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
}
```

### 使用 ELK Stack（进阶）

对于大规模部署，建议使用 ELK：

1. **Elasticsearch** — 日志存储与搜索
2. **Logstash** — 日志收集与处理
3. **Kibana** — 日志可视化

或使用更轻量的：
- **Loki** + **Grafana**
- **Graylog**

## 告警配置

### 健康检查告警

#### 使用宝塔面板站点监控

1. 宝塔面板 → 监控 → 添加监控
2. 监控类型：URL 监控
3. 监控地址：`https://api.your-domain.com/api/health`
4. 监控频率：1 分钟
5. 告警方式：
   - 邮箱告警
   - 微信告警（需配置微信公众号）
   - 钉钉告警（需配置机器人 Webhook）
   - 短信告警（需配置短信服务）

#### 使用 UptimeRobot（免费）

1. 注册 [UptimeRobot](https://uptimerobot.com/)
2. 添加 Monitor：
   - Monitor Type: HTTP(s)
   - URL: `https://api.your-domain.com/api/health`
   - Monitoring Interval: 5 分钟
3. 配置告警联系人：
   - 邮箱
   - 短信
   - Slack / Discord / Telegram

### 磁盘空间告警

创建脚本 `/opt/scripts/disk-alert.sh`：

```bash
#!/bin/bash
THRESHOLD=80
USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//g')
HOSTNAME=$(hostname)

if [ $USAGE -gt $THRESHOLD ]; then
    MESSAGE="磁盘空间告警：${HOSTNAME} 根分区已使用 ${USAGE}%，超过阈值 ${THRESHOLD}%"
    echo $MESSAGE
    
    # 发送邮件告警（需配置 mail 或 sendmail）
    # echo "$MESSAGE" | mail -s "磁盘告警" admin@example.com
    
    # 发送钉钉告警
    # DINGTALK_WEBHOOK="https://oapi.dingtalk.com/robot/send?access_token=xxx"
    # curl -s "$DINGTALK_WEBHOOK" \
    #   -H 'Content-Type: application/json' \
    #   -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$MESSAGE\"}}"
fi
```

添加定时任务：
```
0 * * * * /opt/scripts/disk-alert.sh
```

### 服务宕机告警

创建脚本 `/opt/scripts/service-alert.sh`：

```bash
#!/bin/bash
SERVICES=("xingtone-server" "nginx")
HOSTNAME=$(hostname)

for SERVICE in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet $SERVICE; then
        MESSAGE="服务告警：${HOSTNAME} 的 ${SERVICE} 服务未运行！"
        echo $MESSAGE
        # 发送告警...
        
        # 尝试重启
        systemctl restart $SERVICE
        sleep 5
        if systemctl is-active --quiet $SERVICE; then
            echo "${SERVICE} 已自动重启成功"
        else
            echo "${SERVICE} 重启失败，需要人工介入！"
        fi
    fi
done
```

添加定时任务：
```
*/5 * * * * /opt/scripts/service-alert.sh
```

### 错误率告警

通过分析 Nginx 日志检测高错误率：

```bash
#!/bin/bash
LOG_FILE="/var/log/nginx/xingtone-access.log"
ERROR_COUNT=$(tail -1000 $LOG_FILE | grep -E " (4|5)[0-9]{2} " | wc -l)
TOTAL_COUNT=$(tail -1000 $LOG_FILE | wc -l)

if [ $TOTAL_COUNT -gt 100 ]; then
    ERROR_RATE=$((ERROR_COUNT * 100 / TOTAL_COUNT))
    if [ $ERROR_RATE -gt 10 ]; then
        echo "错误率告警：最近 1000 条请求错误率为 ${ERROR_RATE}%"
        # 发送告警...
    fi
fi
```

## 性能监控

### 响应时间监控

```bash
# 使用 curl 测试响应时间
curl -w "
DNS 解析: %{time_namelookup}s
TCP 连接: %{time_connect}s
TLS 握手: %{time_appconnect}s
首字节:   %{time_starttransfer}s
总耗时:   %{time_total}s
HTTP 状态: %{http_code}
" -o /dev/null -s https://api.your-domain.com/api/health
```

### 数据库性能

```sql
-- 查看数据库大小
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();

-- 查看慢查询（SQLite 没有内置慢查询日志，建议应用层记录）
```

### 应用性能监控（APM）

对于生产环境，建议集成 APM 工具：

- **Sentry** — 错误追踪与性能监控
- **New Relic** — 全栈可观测性
- **Datadog** — 云监控平台

以 Sentry 为例：
```bash
cd music-server
npm install @sentry/node @sentry/tracing
```

## 告警渠道汇总

| 渠道 | 配置难度 | 费用 | 到达率 |
|------|---------|------|--------|
| 邮件 | 低 | 免费 | 中 |
| 短信 | 中 | 收费 | 高 |
| 钉钉机器人 | 低 | 免费 | 高 |
| 企业微信机器人 | 低 | 免费 | 高 |
| Slack | 低 | 免费/收费 | 高 |
| 电话 | 高 | 收费 | 最高 |

## 每日运维检查清单

- [ ] 服务健康状态：`/api/health` 返回正常
- [ ] 磁盘空间：使用率 < 80%
- [ ] 内存：剩余 > 20%
- [ ] CPU：负载 < 70%
- [ ] Nginx 错误日志：无异常
- [ ] 后端错误日志：无异常
- [ ] 备份：昨日备份成功
- [ ] 证书：SSL 证书有效期 > 30 天

## 常见问题

### 告警太多怎么办？

- 设置合理的阈值，避免过度告警
- 配置告警抑制（相同告警 5 分钟内只发一次）
- 区分告警级别（P0 紧急、P1 重要、P2 一般、P3 提示）

### 如何避免告警风暴？

- 配置告警聚合
- 设置告警延迟（连续失败 3 次再告警）
- 配置维护窗口（计划内维护暂停告警）
