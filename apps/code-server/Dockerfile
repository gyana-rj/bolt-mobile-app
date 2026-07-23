FROM codercom/code-server:4.96.4

USER root
RUN apt-get update \
    && apt-get install -y curl libglib2.0-0 libnspr4 libnss3 libdbus-1-3 libatk1.0-0 libx11-xcb1 libasound2  libgbm1 libgtk-3-0 \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# revert to the code-server default user
USER coder
# export code-server's default port
EXPOSE 8080

RUN mkdir -p /tmp/bolty-worker

# Start code-server on container launch
CMD ["code-server", "--auth", "none", "--bind-addr", "0.0.0.0:8080", "/tmp/bolty-worker"]

