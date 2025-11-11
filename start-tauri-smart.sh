#!/bin/bash
# Tauri App Smart Launch Script
# Auto-detect hardware acceleration, use hardware if available, otherwise use software rendering

check_hw_accel() {
    # Check DRM device
    if [ ! -e /dev/dri/card0 ]; then
        echo 'WARNING: No DRM device found, using software rendering'
        return 1
    fi
    
    # On RISC-V architecture, check for real hardware GPU drivers
    # Known software rendering drivers
    local sw_drivers='swrast_dri llvmpipe zink_dri libdril_dri'
    
    # Known hardware GPU drivers (usually not available on RISC-V)
    local hw_drivers='panfrost_dri lima_dri etnaviv_dri vc4_dri freedreno_dri radeonsi_dri i915_dri i965_dri nouveau_dri amdgpu_dri'
    
    if [ -d /usr/lib/riscv64-linux-gnu/dri ]; then
        # Check all driver files
        local found_hw_driver=false
        for driver in /usr/lib/riscv64-linux-gnu/dri/*_dri.so; do
            if [ ! -f "$driver" ]; then
                continue
            fi
            
            local basename_driver=$(basename "$driver" _dri.so)
            local real_driver=$(readlink -f "$driver" 2>/dev/null)
            
            # Check if it's a symlink to software driver
            if [ -n "$real_driver" ] && echo "$real_driver" | grep -q 'libdril_dri.so'; then
                continue
            fi
            
            # Check if it's a hardware driver
            for hw_drv in $hw_drivers; do
                if echo "$basename_driver" | grep -q "$hw_drv"; then
                    # Verify driver file exists and is not a symlink to software driver
                    if [ -f "$driver" ] && [ -n "$real_driver" ] && [ -f "$real_driver" ]; then
                        if ! echo "$real_driver" | grep -q 'libdril_dri.so'; then
                            echo "OK: Hardware acceleration driver found: $basename_driver"
                            found_hw_driver=true
                            break
                        fi
                    fi
                fi
            done
            
            if [ "$found_hw_driver" = true ]; then
                break
            fi
        done
        
        if [ "$found_hw_driver" = true ]; then
            return 0
        fi
    fi
    
    # Check GPU device nodes
    if ls /dev/mali* /dev/gpu* /dev/kgsl* 2>/dev/null | grep -q .; then
        echo 'OK: GPU device node found'
        return 0
    fi
    
    # RISC-V architecture usually has no hardware GPU, use software rendering
    echo 'INFO: RISC-V architecture - no hardware GPU detected, using optimized software rendering'
    return 1
}

# Main logic
echo 'Checking hardware acceleration...'
if check_hw_accel; then
    echo 'Using hardware acceleration mode (will fallback to software if failed)'
    # Hardware acceleration mode: don't force software rendering, let Mesa choose best driver
    export MESA_GL_VERSION_OVERRIDE=3.3
    export MESA_GLSL_VERSION_OVERRIDE=330
    # Don't set LIBGL_ALWAYS_SOFTWARE, allow system to try hardware acceleration
    # If hardware acceleration fails, Mesa will automatically fallback to software rendering
else
    echo 'Using optimized software rendering mode (no warnings, better performance)'
    # Software rendering mode: force software rendering, eliminate warnings, optimize performance
    export LIBGL_ALWAYS_SOFTWARE=1
    export MESA_GL_VERSION_OVERRIDE=3.3
    export GALLIUM_DRIVER=llvmpipe
    export MESA_GLSL_VERSION_OVERRIDE=330
    export MESA_LOADER_DRIVER_OVERRIDE=llvmpipe
fi

# Run application
echo 'Starting Tauri application...'
tauri-riscv64-test "$@"

