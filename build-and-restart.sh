#!/usr/bin/env bash

git pull && docker-compose build && docker-compose down && docker-compose up -d --force-recreate