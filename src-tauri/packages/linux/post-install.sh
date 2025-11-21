#!/bin/bash
# Only chmod service files if they exist (RV Verge may not include service binaries)
if [ -f /usr/bin/clash-verge-service-install ]; then
    chmod +x /usr/bin/clash-verge-service-install
fi
if [ -f /usr/bin/clash-verge-service-uninstall ]; then
    chmod +x /usr/bin/clash-verge-service-uninstall
fi
if [ -f /usr/bin/clash-verge-service ]; then
    chmod +x /usr/bin/clash-verge-service
fi
