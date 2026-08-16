use std::collections::{HashMap, VecDeque};

use voxweb_protocol::netstate::{RigidBody, ServerPlayerDisplay};

const INTERPOLATION_DELAY_MS: u32 = 100;
const SNAPSHOT_LIMIT: usize = 16;
/// A remote track is pruned when its latest broadcast is older than this.
/// The authoritative net-state stops including disconnected players, so a
/// stale track is a ghost; 3s tolerates brief frame gaps without flicker.
const REMOTE_PLAYER_TTL_MS: u32 = 3000;

#[derive(Clone, Debug)]
struct TimedBody {
    received_ms: u32,
    body: RigidBody,
}

#[derive(Clone, Debug)]
struct RemoteTrack {
    name: String,
    scale: f32,
    snapshots: VecDeque<TimedBody>,
}

#[derive(Clone, Debug)]
pub struct RemotePlayerPose {
    pub id: u32,
    pub name: String,
    pub scale: f32,
    pub body: RigidBody,
}

#[derive(Default)]
pub struct RemotePlayers {
    tracks: HashMap<u32, RemoteTrack>,
}

impl RemotePlayers {
    pub fn update(
        &mut self,
        bodies: &[RigidBody],
        displays: &[ServerPlayerDisplay],
        local_id: u32,
        received_ms: u32,
    ) {
        for body in bodies.iter().filter(|body| body.id != local_id) {
            let display = displays
                .iter()
                .find(|display| display.id == u64::from(body.id));
            let track = self.tracks.entry(body.id).or_insert_with(|| RemoteTrack {
                name: display.map_or_else(|| "Player".to_owned(), |value| value.name.clone()),
                scale: display.map_or(1.0, |value| value.scale),
                snapshots: VecDeque::new(),
            });
            if let Some(display) = display {
                track.name.clone_from(&display.name);
                track.scale = display.scale;
            }
            if track
                .snapshots
                .back()
                .is_some_and(|snapshot| snapshot.received_ms == received_ms)
            {
                track.snapshots.pop_back();
            }
            track.snapshots.push_back(TimedBody {
                received_ms,
                body: body.clone(),
            });
            while track.snapshots.len() > SNAPSHOT_LIMIT {
                track.snapshots.pop_front();
            }
        }
        // Prune players that the authoritative net-state stopped broadcasting
        // (disconnect/leave). Without this the last pose stays on screen as a
        // frozen ghost forever.
        self.tracks.retain(|_, track| {
            track
                .snapshots
                .back()
                .is_some_and(|snapshot| received_ms.saturating_sub(snapshot.received_ms) < REMOTE_PLAYER_TTL_MS)
        });
    }

    pub fn sample(&mut self, now_ms: u32) -> Vec<RemotePlayerPose> {
        let target_ms = now_ms.saturating_sub(INTERPOLATION_DELAY_MS);
        self.tracks
            .iter_mut()
            .filter_map(|(&id, track)| {
                while track.snapshots.len() > 2 && track.snapshots[1].received_ms <= target_ms {
                    track.snapshots.pop_front();
                }
                let first = track.snapshots.front()?;
                let second = track.snapshots.get(1).unwrap_or(first);
                let span = second.received_ms.saturating_sub(first.received_ms);
                let amount = if span == 0 {
                    1.0
                } else {
                    target_ms.saturating_sub(first.received_ms) as f32 / span as f32
                }
                .clamp(0.0, 1.0);
                Some(RemotePlayerPose {
                    id,
                    name: track.name.clone(),
                    scale: track.scale,
                    body: interpolate_body(&first.body, &second.body, amount),
                })
            })
            .collect()
    }
}

fn interpolate_body(from: &RigidBody, to: &RigidBody, amount: f32) -> RigidBody {
    let mut body = to.clone();
    body.px = lerp(from.px, to.px, amount);
    body.py = lerp(from.py, to.py, amount);
    body.pz = lerp(from.pz, to.pz, amount);
    body.vx = lerp(from.vx, to.vx, amount);
    body.vy = lerp(from.vy, to.vy, amount);
    body.vz = lerp(from.vz, to.vz, amount);
    let from_rotation = glam::Quat::from_xyzw(from.qx, from.qy, from.qz, from.qw);
    let to_rotation = glam::Quat::from_xyzw(to.qx, to.qy, to.qz, to.qw);
    let rotation =
        normalized_rotation(from_rotation).slerp(normalized_rotation(to_rotation), amount);
    [body.qx, body.qy, body.qz, body.qw] = rotation.to_array();
    body
}

fn lerp(from: f32, to: f32, amount: f32) -> f32 {
    from + (to - from) * amount
}

fn normalized_rotation(rotation: glam::Quat) -> glam::Quat {
    if rotation.is_finite() && rotation.length_squared() > 1.0e-6 {
        rotation.normalize()
    } else {
        glam::Quat::IDENTITY
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(id: u32, x: f32) -> RigidBody {
        RigidBody {
            id,
            flags: 2,
            group: 0,
            mass: 1.0,
            friction: 0.0,
            restitution: 0.0,
            rx: 1.0,
            ry: 1.0,
            rz: 1.0,
            px: x,
            py: 2.0,
            pz: 3.0,
            vx: 1.0,
            vy: 0.0,
            vz: 0.0,
            qx: 0.0,
            qy: 0.0,
            qz: 0.0,
            qw: 1.0,
            hsx: 0.45,
            hsy: 1.1,
            hsz: 0.45,
            ax: 0.0,
            ay: 0.0,
            az: 0.0,
        }
    }

    #[test]
    fn samples_between_network_updates_instead_of_snapping() {
        let mut players = RemotePlayers::default();
        players.update(&[body(2, 0.0)], &[], 1, 100);
        players.update(&[body(2, 2.0)], &[], 1, 200);
        let sampled = players.sample(250);
        assert_eq!(sampled.len(), 1);
        assert!((sampled[0].body.px - 1.0).abs() < 1.0e-6);
    }

    #[test]
    fn excludes_local_player() {
        let mut players = RemotePlayers::default();
        players.update(&[body(1, 4.0)], &[], 1, 100);
        assert!(players.sample(200).is_empty());
    }
}
