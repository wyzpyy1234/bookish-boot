# ==========================================================
# Bookish Boot —— Render / 任意 Docker 平台部署文件
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

# 免费实例只有 512MB：堆 + 元空间必须限死，否则容器会被 OOM Kill
ENV JAVA_TOOL_OPTIONS="-Xmx256m -Xss512k -XX:MaxMetaspaceSize=128m -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai"
ENV TZ=Asia/Shanghai

EXPOSE 8080

# 云平台会注入 PORT；本地不设就走 8080
ENTRYPOINT ["sh", "-c", "java -jar app.jar --server.port=${PORT:-8080}"]
