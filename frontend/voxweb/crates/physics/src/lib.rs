//! `voxweb-physics`: recovered DAO3 player physics.
//!
//! Decoupled from rendering (no wgpu/egui/render) and from the browser/network
//! session code. The solver family lives here:
//! - `player_physics`: `NeaPlayerPhysics` — local prediction, authoritative
//!   contacts, flight/swim/double-jump, recovered movement modes.
//! - `contact_solver` / `obb_contact` / `voxel_contacts`: swept AABB contact
//!   resolution against voxel terrain and dynamic bodies.
//!
//! The only external types come from `voxweb-protocol` (net-state RigidBody /
//! RuntimePlayerState) so the same solver can serve client prediction and a
//! future server-authoritative runtime.

mod contact_solver;
mod obb_contact;
mod player_physics;
mod voxel_contacts;

pub use player_physics::NeaPlayerPhysics;
pub use voxweb_protocol::player::MoveMode;
