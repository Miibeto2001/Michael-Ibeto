# CNN Convolution Pipeline (1024×1024, 4×4 Kernel)

Convolution is a key computational stage in modern image-processing and neural-network accelerators. This project implements a hardware 4×4 convolution engine that operates directly on a 1024×1024 image stored in external DRAM. Kernel weights and input tiles are fetched through burst-based DRAM reads, where addresses are issued once per burst and held across multiple cycles to hide memory latency and maintain sustained throughput. All convolution operations are performed using a serialized signed multiply-accumulate data path, allowing sixteen kernel products to be computed over multiple cycles using a single arithmetic unit. Final results are saturated to 8-bit precision before being written back to DRAM using burst write commands.

## Highlights
- Burst-based DRAM read/write interface to hide memory latency and sustain throughput
- Single serialized signed MAC datapath computing all 16 kernel products per window
- Local register buffering of kernel weights and sliding 4×4 input window to minimize DRAM traffic
- Multi-phase FSM sequencing kernel load, input buffering, MAC computation, and output writeback
- 8-bit saturation logic on the output path
- Timing-closed synthesis at a 6ns clock period

## Tech
SystemVerilog · ModelSim · Synopsys Design Compiler (synthesis) · CMake build flow

## Design Description

### Datapath
The datapath stores the entire 4×4 kernel and a 4×4 input window in locally buffered registers to avoid repeated DRAM accesses, enabling fast sliding-window computation. A single signed MAC unit iterates through the kernel and input window elements sequentially, accumulating partial sums over multiple cycles to produce one output pixel per window position. Intermediate sums are stored in dedicated registers so that multiple column positions can be computed in flight as the window shifts horizontally across the image. Once accumulation is complete, results are saturated to 8-bit signed range and written back to DRAM in burst format to maintain memory bandwidth efficiency. This architecture significantly reduces area and simplifies routing at the cost of requiring more cycles.

### Finite State Machine
The controller is a multi-phase FSM that sequences DRAM transactions, data buffering, MAC operations, and output writeback. After a start signal, the FSM first loads the 4×4 kernel using two burst reads into on-chip registers, then iteratively loads input tiles from DRAM, buffering two rows at a time to form the sliding 4×4 convolution window. During computation states, the FSM feeds kernel and input values into the single MAC datapath, storing intermediate partial sums across multiple columns. Once all kernel rows are processed, the FSM finalizes results with saturation logic and issues a burst write back to DRAM. Row and column counters drive progression across the full 1024×1024 image, reusing the same control flow for every window.

### Datapath & FSM Diagrams
<img src="assets/img/cnn-pipeline/datapath-fsm-diagram.png" alt="Hand-drawn datapath block diagram, FSM state diagram, and DRAM addressing notes for the convolution engine" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />

Full datapath block diagram (DRAM-to-DUT handshake, kernel/input buffering, MAC tree, output writeback), the FSM state diagram, and the DRAM burst-addressing notes used to derive the design. [Download full-resolution diagram (PDF)](assets/reports/CNN-Pipeline-Datapath-FSM.pdf)

## Results
The engine performs convolution across the full 1024×1024 input image using streamed DRAM access and a single-cycle sequential MAC datapath, matching the provided test vectors for kernel-based convolution. Burst-based DRAM transactions kept memory overhead low while final saturated 8-bit results were written back in aligned bursts.

**Design Achievements**
- Clock period achieved: 6 ns
- Simulation total cycles (per test): 78,937,758
- Total cell count: 4,019 cells
- Total cell area: 6,659.044 µm²
- Setup slack: 0.0009
- Hold slack: 0.0309

## Sample Test Inputs
<img src="assets/img/cnn-pipeline/input0.jpg" alt="Lenna test image used as a 1024x1024 convolution input" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />

Standard 1024×1024 test image used to validate the convolution pipeline.

<img src="assets/img/cnn-pipeline/test_32x32_grad8.png" alt="32x32 debug noise/dither test pattern" style="max-width:220px;border-radius:8px;margin:0.5rem 0.5rem 0.5rem 0;" />
<img src="assets/img/cnn-pipeline/debug_32x32.png" alt="32x32 debug gradient test pattern" style="max-width:220px;border-radius:8px;margin:0.5rem 0;" />

Smaller 32×32 debug patterns used during development to speed up iteration before running the full 1024×1024 input.

## Conclusion
With additional refinement, performance could be improved by further pipelining the MAC accumulation path or reducing memory stalls during input window loading. A natural extension would be parallelizing multiple MAC units to compute more output pixels per cycle, trading area for throughput. Integrating activation and pooling stages would allow the module to function as a complete CNN layer rather than a standalone convolution unit. Additional optimizations such as wider DRAM burst widths or input buffering via on-chip SRAM could further reduce latency and external memory dependence. The current implementation provides a functional, timing-closed hardware foundation suitable for scaling into a larger accelerator architecture.

[Download full project report (PDF)](assets/reports/CNN-Pipeline-Report.pdf)

[View the source code on GitHub](https://github.com/Miibeto2001/CNN-Convolution-Pipeline)

*Michael Ibeto — ECE Department, NCSU — ECE564, Fall 2025*
