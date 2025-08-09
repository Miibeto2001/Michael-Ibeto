# Asic/Fpga Design

Implemented backcheck damping logic and activation handling for Norton 6300 operator.

## Highlights
- Regenerative damping when PWM below threshold
- Clean handoff from manual push to motor drive
- Tuned setpoint lag for smooth engagement

## Tech
C, STM32, fixed-point control