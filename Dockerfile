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

# 云平台会注入 PORT；本地不设就走 8080
ENTRYPOINT ["sh", "-c", "java -jar app.jar --server.port=${PORT:-8080}"]
