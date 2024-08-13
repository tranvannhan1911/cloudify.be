#!/bin/sh
git -C /usr/src/app/cloudify-terraform/ config --global user.email "tranvannhan1911@gmail.com"
git -C /usr/src/app/cloudify-terraform/ config --global user.username "tranvannhan1911"
bun run index.js