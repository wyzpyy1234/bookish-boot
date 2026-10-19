# ==========================================================
# Bookish Boot —— 通用 Docker 部署文件（Railway / SnapDeploy / Render 通用）
# 位置：仓库根目录（与 pom.xml 同级）
#
# 两阶段构建：云端没有 target/ 里的 jar，必须自己打包
# ==========================================================

# ---------- 第一阶段：构建 ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# 先只拷 pom 拉依赖，利用 Docker 层缓存（pom 没改就不会重新下载）
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true

# 再拷源码打包
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- 第二阶段：运行 ----------
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /build/target/*.jar app.jar

# 免费实例常见规格只有 512MB：堆 + 元空间 + 代码缓存必须限死，
# 否则 JVM 总占用超过容器上限，进程会被 OOM Kill（日志里看不到任何业务报错，只有 exit 137）
#
# 预算：堆 192 + 元空间 96 + 代码缓存 32 = 320MB，加 JVM 自身约 60MB，
#       再留 100MB 给线程栈 / 直接内存 / glibc malloc，落在 512MB 以内。
# 小堆用 SerialGC 比 G1 少约 20~30MB 的结构开销，启动也更快。
ENV JAVA_TOOL_OPTIONS="-Xmx192m -Xss512k -XX:MaxMetaspaceSize=96m -XX:ReservedCodeCacheSize=32m -XX:+UseSerialGC -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai"
ENV TZ=Asia/Shanghai

EXPOSE 8080

# 启动前先自检环境变量：变量有没有注入、URL 到底指向哪，一眼可见
# 密码只打长度不打明文，长度 0 就说明这条没填
# exec 让 java 成为 PID 1，停止服务时能收到 SIGTERM 优雅退出
ENTRYPOINT ["sh", "-c", "echo '--- runtime env check ---'; echo \"PORT=$PORT\"; echo \"DB_URL=$SPRING_DATASOURCE_URL\"; echo \"DB_USER=$SPRING_DATASOURCE_USERNAME\"; echo \"SPRING_PWD_LEN=${#SPRING_DATASOURCE_PASSWORD}\"; echo \"DB_PWD_LEN=${#DB_PASSWORD}\"; echo '--- starting ---'; exec java -jar app.jar --server.port=${PORT:-8080}"]
