#!/usr/bin/env bash

truffle compile && cp -f build/contracts/* client/src/contracts/ && cp -f build/contracts/* api/contracts