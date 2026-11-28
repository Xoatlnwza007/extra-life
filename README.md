# ชีวิตตัวประกอบ

ต้นฉบับ เกมจำลองชีวิตตัวประกอบในโลกอนิเมะ เล่นได้ที่ https://theningkungtv-lang.github.io/extra-life/
ผมforkเพื่อที่จะทำเล่นคนเดียวครับ โดยจะvibe code เพิ่มและแก้บางอย่าง


## Development handoff

The current engineering plan, verified repository state, open risks, and next tasks are maintained in [PROJECT_STATE.md](PROJECT_STATE.md). Any AI continuing development must read that file first and update its session handoff log after meaningful work.

Development is authorized directly on `main` by the repository owner. Prior feature branches and pull requests are historical inputs; inspect and selectively integrate their work rather than assuming it is already present on `main`.


## Single-file runtime

The playable browser runtime is embedded in `index.html`; it does not load external JavaScript files. The `ai/*.js` modules are retained as development and automated-test mirrors, not runtime dependencies. The active game setup exposes One Piece only. Current implementation status, constraints, and next tasks are tracked in [PROJECT_STATE.md](PROJECT_STATE.md).
