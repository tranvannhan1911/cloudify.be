FROM alpine:latest as tf

RUN apk add --no-cache curl unzip
# install terraform
RUN curl https://releases.hashicorp.com/terraform/1.9.4/terraform_1.9.4_linux_amd64.zip -o terraform.zip
RUN unzip terraform.zip
RUN mv terraform /usr/local/bin

FROM oven/bun:1 as base

WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy the terraform binary into the final image
COPY --from=tf /usr/local/bin/terraform /usr/local/bin/terraform

FROM base AS prerelease
COPY --from=base /temp/dev/node_modules node_modules
COPY . .

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=base /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/index.js .
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]