# Docker 环境说明

## 快速启动

在 docker 目录下执行：

```bash
docker-compose up -d
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| MongoDB | 27017 | 文档数据库 |
| Redis | 6379 | 缓存服务 |
| MinIO | 9000/9001 | 对象存储（9000: API, 9001: 控制台） |

## 默认账号

### Redis
- 密码：123456

### MinIO
- 用户名：minioadmin
- 密码：minioadmin

## 目录结构

```
docker/
├── docker-compose.yml
├── README.md
├── mongodb/
│   └── data/          # MongoDB 数据（自动生成）
├── redis/
│   └── data/          # Redis 数据（自动生成）
└── minio/
    ├── data/          # MinIO 数据（自动生成）
    └── config/        # MinIO 配置（自动生成）
```

## 注意事项

- 数据目录已添加到 .gitignore，不会提交到 Git
- 生产环境请修改默认密码
