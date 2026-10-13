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

At each window position, the engine computes:

```
Y(i,j) = Σ(m=0..3) Σ(n=0..3) X(i+m, j+n) · K(m,n)
```

using the fixed 4×4 kernel:

```
K = | 1  0  -1  0 |
    | 1  0  -1  0 |
    | 1  0  -1  0 |
    | 1  0  -1  0 |
```

The convolution output is accumulated at 20-bit precision to absorb overflow, then truncated (clamped) to a signed 8-bit value before being written back to DRAM.

### Finite State Machine
The controller is a multi-phase FSM that sequences DRAM transactions, data buffering, MAC operations, and output writeback. After a start signal, the FSM first loads the 4×4 kernel using two burst reads into on-chip registers, then iteratively loads input tiles from DRAM, buffering two rows at a time to form the sliding 4×4 convolution window. During computation states, the FSM feeds kernel and input values into the single MAC datapath, storing intermediate partial sums across multiple columns. Once all kernel rows are processed, the FSM finalizes results with saturation logic and issues a burst write back to DRAM. Row and column counters drive progression across the full 1024×1024 image, reusing the same control flow for every window.

### Interface
The DUT talks to a DRAM-backed test fixture over a simple start/ready handshake plus a burst-oriented SDR memory bus (`CMD`, `Address`, tri-stated `DQ`):

<img src="assets/img/cnn-pipeline/figure2-test-fixture.png" alt="Test fixture block diagram showing DRAM, tri-state drivers, DUT, testbench driver, and SRAM connections" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />

The test fixture treats the synchronous rising edge of `ready` as the end-of-test indication:

<img src="assets/img/cnn-pipeline/figure3-handshake-timing.png" alt="DUT to testbench handshake timing diagram showing clk, reset_n, ready, start, dut state, and test fixture signals" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />

### Memory Layout & Zero Padding
DRAM is laid out as 64-bit little-endian words: the first 16 entries hold the 4×4 kernel weights, followed by the input matrix in row-major order. Since the 1021×1021 convolution output isn't a multiple of 8, each output row is zero-padded to the next multiple of 8 bytes so every row starts at a modulo-8 address. For a 32×32 example input:

<img src="assets/img/cnn-pipeline/figure5-padding-464.png" alt="Example matrix sizes and zero padding for the convolution-only output, 32x32 example input padded from 29 to 32" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />

The same scheme scales to the full-size matrices used here: 1021 output rows/columns pad out to 1024.

### Sliding-Window Addressing Algorithm
Every output pixel comes from sliding the 4×4 kernel one position at a time across the 1024×1024 input, left to right within a row and then down to the next row, producing a 1021×1021 grid of valid window positions. At each position, the hardware doesn't fetch the whole 4×4 window at once — it steps through the 16 operands one at a time for the single serialized MAC unit, so the DRAM address has to be recomputed every cycle from two nested counters: an outer counter marking the window's current top-left corner, and an inner counter marking which of the 4 rows/columns *within* that window is being read right now.

That's exactly what this part of the DUT does:

```systemverilog
// Declare internal address
assign kernel_Address_0 = 32'h0000_0000;
assign kernel_Address_1 = 32'h0000_0008;
assign dram_addr_input  = 32'h0000_0010 + (row * 1024) + col*8;
assign dram_addr_output = 32'h0000_0000 + col_out*8;
assign row = row_next + row_index;
assign col = col_next + col_window;
// in_addr_sel determines which address gets sent to DRAM
// 00 -> kernel address 0
// 01 -> kernel address 1
// 10 -> input address
// 11 -> feedback
always_comb begin
    case (in_addr_sel)
    2'b00:   in_addr_d = kernel_Address_0;
    2'b01:   in_addr_d = kernel_Address_1;
    2'b10:   in_addr_d = dram_addr_input;
    2'b11:   in_addr_d = in_addr_q;
    default: in_addr_d = '0;
    endcase
end
```

`row_next`/`col_next` are the sliding window's current position in the image (they advance as the window moves across and down), while `row_index`/`col_window` are the 0–3 offsets that step through the window's 4 rows and columns internally while that position is being accumulated. Adding them together (`row = row_next + row_index`, `col = col_next + col_window`) gives the true pixel coordinate to fetch next. `dram_addr_input` turns that into a byte address: `0x10` is the base address where the input matrix starts (right after the 16 bytes of kernel data), `row*1024` skips to the correct row (each row is 1024 bytes), and `col*8` lands on the correct burst-aligned group of 8 pixels, matching the 64-bit burst layout described above. The `in_addr_sel` mux then picks what actually goes out on the address bus each cycle — one of the two fixed kernel addresses during kernel load, the computed sliding address during normal operation, or a held/feedback value while the FSM is waiting mid-burst.

<div class="conv-animation" id="convAnim">Loading interactive demo&hellip;</div>

The demo above raster-scans a 4×4 window across a stylized 1024×1024 grid the same way `row_next`/`col_next` do in hardware, with a live readout of the resulting `dram_addr_input` computed from the formula above. Positions are sampled across the full sweep for visualization — the real datapath steps through all 1,021×1,021 window positions, one MAC operand at a time.

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
