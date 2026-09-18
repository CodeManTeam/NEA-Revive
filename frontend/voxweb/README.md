# VoxWeb

VoxWeb 是 NEA-Revive 的 Rust workspace。它编译为 WASM/WebGPU 浏览器 player，负责协议
消费、地形/实体/avatar 渲染、输入、预测和 NEA smoke 会话。

## 要求

- Rust toolchain（项目使用 edition 2024）；
- wasm32-unknown-unknown target；
- Trunk；
- 支持 WebGPU 的桌面浏览器。

~~~powershell
rustup target add wasm32-unknown-unknown
cargo install trunk --locked
~~~

## 构建和运行

~~~powershell
cd frontend\voxweb
cargo test --workspace
cargo check --workspace --target wasm32-unknown-unknown
trunk build --release
~~~

trunk build --release 产出 dist/。在完整 NEA 栈中，根目录静态服务器通过 18082 提供它；
只使用 Trunk 开发服务器时，默认端口见 trunk.toml，不要与后端端口混用。

~~~powershell
# 完整地图运行（推荐）
cd ..\..
node scripts\serve.mjs --map there-is-backroom

# 入口
# http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession
~~~

?nea= 是 NEA 专用激活路径。未提供该参数时，页面仍可用于普通 VoxWeb 本地开发，但不会
启动地图会话。

## 验证重点

~~~powershell
cd frontend\voxweb
cargo fmt --all -- --check
cargo test -p voxweb-protocol
cargo test -p voxweb-client
cargo test -p voxweb-render
cargo check --workspace --target wasm32-unknown-unknown
trunk build --release
~~~

协议消费和后端 wire 的对应测试在 backend/box-go/src/；前端 NEA 握手入口在
crates/client/src/nea_smoke.rs，加载状态在 nea_loading.rs，协议表在 crates/protocol/。

浏览器 smoke 至少检查 loading 状态、console/pageerror、canvas 非空、spawn、实体、avatar、
输入和实际加载的 dist/。WASM 构建成功不等于浏览器已加载新产物，改动后必要时硬刷新。

## crate 责任

| Crate | 责任 |
| --- | --- |
| crates/client | 浏览器会话、NEA smoke、输入和客户端整合 |
| crates/render | WebGPU 地形、透明材质、avatar、阴影和天空 |
| crates/protocol | wire schema、编码/解码和中立协议目录 |
| crates/server | 本地权威体素运行时 |
| crates/net | 网络传输 |
| crates/physics | 碰撞和运动 |
| crates/core | 共用世界和模拟类型 |

历史素材不作为 VoxWeb 的默认依赖。需要使用已授权的本地覆盖时，参见
asset-overrides/README.md；未配置覆盖时使用本地默认资源。
